// frontend/src/features/dashboard/pages/StudentDashboard.jsx

import { useEffect, useState, useRef } from "react";
import { getCourses, joinCourse } from "../../courses/courseAPI";
import socket from "../../../services/socket";
import api from "../../../services/api";
import QuizModal from "../../../features/quiz/QuizModal";
import "./StudentDashboard.css";

const StudentDashboard = () => {
  const [courses, setCourses] = useState([]);
  const [classCode, setClassCode] = useState("");
  const [rollNo, setRollNo] = useState("");
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  const [activeSession, setActiveSession] = useState(null);
  const [sessionStatus, setSessionStatus] = useState(null);
  const [currentPartition, setCurrentPartition] = useState(null);

  const [timeLeft, setTimeLeft] = useState(null);
  const [partitionEndTime, setPartitionEndTime] = useState(null);

  const [showQuiz, setShowQuiz] = useState(false);
  const [quizPartitionId, setQuizPartitionId] = useState(null);

  const intervalRef = useRef(null);

  // =========================
  // FETCH COURSES
  // =========================
  const fetchCourses = async () => {
    setLoading(true);
    try {
      const res = await getCourses();
      setCourses(res.data);
    } catch (err) {
      console.error("Failed to fetch courses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  // =========================
  // SYNC FUNCTION
  // =========================
  const syncSessionState = async (sessionId) => {
    try {
      const res = await api.get(`/sessions/${sessionId}`);
      const data = res.data;

      setSessionStatus(data.status);
      setCurrentPartition(data.current_partition_index);
      setPartitionEndTime(data.end_time);

    } catch (err) {
      console.error("Sync failed", err);
    }
  };

  // =========================
  // CHECK ACTIVE SESSION
  // =========================
  const checkActiveSession = async (courseId) => {
    try {
      const res = await api.get(`/sessions/course/${courseId}/active`);

      if (res.data.exists) {
        setSessionStatus(res.data.status);
        return res.data.session_id;
      }

      return null;
    } catch {
      return null;
    }
  };

  // =========================
  // JOIN SESSION
  // =========================
  const joinSession = async (sessionId) => {
    socket.emit("join_session", { session_id: sessionId });
    setActiveSession(sessionId);

    await syncSessionState(sessionId);

    // 🔥 CRITICAL: fallback sync (prevents missed events)
    setTimeout(() => {
      syncSessionState(sessionId);
    }, 300);
  };

  // =========================
  // SOCKET LISTENERS (FIXED)
  // =========================
  useEffect(() => {

    const handleSessionState = (data) => {
      console.log("[SESSION STATE RECEIVED]", data);

      setSessionStatus(data.status);
      setCurrentPartition(data.current_partition_index);

      const now = Math.floor(Date.now() / 1000);
      const drift = now - data.server_time;

      const correctedEnd = data.end_time
        ? data.end_time + drift
        : null;

      setPartitionEndTime(correctedEnd);
    };

    const handleCompleted = () => {
      setSessionStatus("completed");
      setCurrentPartition(null);
      setTimeLeft(null);
      setPartitionEndTime(null);
      setActiveSession(null);
      setShowQuiz(false);
    };

    const handleStopped = () => {
      setSessionStatus("stopped");
      setCurrentPartition(null);
      setTimeLeft(null);
      setPartitionEndTime(null);
      setActiveSession(null);
      setShowQuiz(false);
    };

    const handleQuiz = (data) => {
      setQuizPartitionId(data.partition_id);
      setShowQuiz(true);
    };

    socket.on("session_state", handleSessionState);
    socket.on("session_completed", handleCompleted);
    socket.on("session_stopped", handleStopped);
    socket.on("quiz_ready", handleQuiz);

    return () => {
      socket.off("session_state", handleSessionState);
      socket.off("session_completed", handleCompleted);
      socket.off("session_stopped", handleStopped);
      socket.off("quiz_ready", handleQuiz);
    };

  }, []);

  // =========================
  // RECONNECT HANDLER
  // =========================
  useEffect(() => {
    const handleReconnect = () => {
      if (activeSession) {
        socket.emit("join_session", { session_id: activeSession });
        syncSessionState(activeSession);
      }
    };

    socket.on("connect", handleReconnect);

    return () => socket.off("connect", handleReconnect);

  }, [activeSession]);

  // =========================
  // HEARTBEAT SYNC
  // =========================
  useEffect(() => {
    if (!activeSession) return;

    const interval = setInterval(() => {
      syncSessionState(activeSession);
    }, 5000);

    return () => clearInterval(interval);
  }, [activeSession]);

  // =========================
  // TIMER
  // =========================
  useEffect(() => {
    if (!partitionEndTime || sessionStatus !== "active") return;

    const updateTimer = () => {
      const now = Math.floor(Date.now() / 1000);
      const remaining = partitionEndTime - now;
      setTimeLeft(Math.max(remaining, 0));
    };

    updateTimer();

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(updateTimer, 500);

    return () => clearInterval(intervalRef.current);

  }, [partitionEndTime, sessionStatus]);

  // =========================
  // JOIN COURSE
  // =========================
  const handleJoinCourse = async (e) => {
    e.preventDefault();
    if (!classCode.trim() || !rollNo.trim()) return;

    setJoining(true);
    try {
      await joinCourse({
        class_code: classCode,
        roll_no: rollNo,
      });
      setClassCode("");
      setRollNo("");
      fetchCourses();
    } catch {
      alert("Failed to join course.");
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="dashboard">
      <h1>Student Dashboard</h1>

      <form onSubmit={handleJoinCourse}>
        <input
          value={classCode}
          onChange={(e) => setClassCode(e.target.value)}
          placeholder="Class Code"
        />
        <input
          value={rollNo}
          onChange={(e) => setRollNo(e.target.value)}
          placeholder="Roll No"
        />
        <button type="submit">
          {joining ? "Joining..." : "Join"}
        </button>
      </form>

      <div className="courses-grid">
        {courses.map((course) => (
          <div key={course.id} className="course-card">
            <h3>{course.course_name}</h3>
            <p>{course.semester} {course.year}</p>

            {activeSession ? (
              <div className="live-session">
                <p>Status: {sessionStatus}</p>

                {currentPartition && (
                  <p>Partition: {currentPartition}</p>
                )}

                {timeLeft !== null && sessionStatus === "active" && (
                  <p>Time Left: {timeLeft}s</p>
                )}
              </div>
            ) : (
              <button
                onClick={async () => {
                  const sessionId = await checkActiveSession(course.id);

                  if (!sessionId) {
                    alert("No live session right now");
                    return;
                  }

                  joinSession(sessionId);
                }}
              >
                Join Live Session
              </button>
            )}
          </div>
        ))}
      </div>

      {showQuiz && (
        <QuizModal
          partitionId={quizPartitionId}
          onClose={() => setShowQuiz(false)}
        />
      )}
    </div>
  );
};

export default StudentDashboard;