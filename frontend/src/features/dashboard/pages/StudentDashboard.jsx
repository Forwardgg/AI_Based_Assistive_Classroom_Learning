// frontend/src/features/dashboard/pages/StudentDashboard.jsx

import { useEffect, useState, useRef } from "react";
import { getCourses, joinCourse } from "../../courses/courseAPI";
import socket from "../../../services/socket";
import api from "../../../services/api";
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
  // CHECK ACTIVE SESSION
  // =========================
  const checkActiveSession = async (courseId) => {
    try {
      const res = await api.get(
        `/sessions/course/${courseId}/active`
      );

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
  const joinSession = (sessionId) => {
    socket.emit("join_session", { session_id: sessionId });
    setActiveSession(sessionId);
  };

  // =========================
  // SOCKET LISTENERS
  // =========================
  useEffect(() => {

    socket.on("partition_started", (data) => {

      console.log("[STUDENT PARTITION START]", data);

      setCurrentPartition(data.partition_index);
      setSessionStatus("active");

      // 🔥 FIX: use backend time
      setPartitionEndTime(data.end_time);
    });

    socket.on("session_paused", () => {
      setSessionStatus("paused");
    });

    socket.on("session_resumed", () => {
      setSessionStatus("active");
    });

    socket.on("session_completed", () => {

      console.log("[SESSION COMPLETED]");

      setSessionStatus("completed");
      setCurrentPartition(null);
      setTimeLeft(null);
      setPartitionEndTime(null);
      setActiveSession(null);
    });

    socket.on("session_stopped", () => {

      console.log("[SESSION STOPPED]");

      setSessionStatus("stopped");
      setCurrentPartition(null);
      setTimeLeft(null);
      setPartitionEndTime(null);
      setActiveSession(null);
    });

    return () => {
      socket.off("partition_started");
      socket.off("session_paused");
      socket.off("session_resumed");
      socket.off("session_completed");
      socket.off("session_stopped");
    };

  }, []);

  // =========================
  // 🔥 STABLE TIMER (same as professor)
  // =========================
  useEffect(() => {

    if (!partitionEndTime || sessionStatus !== "active") return;

    const updateTimer = () => {

      const now = Math.floor(Date.now() / 1000);
      const remaining = partitionEndTime - now;
      const safeTime = Math.max(remaining, 0);

      console.log("[STUDENT TIMER]", {
        now,
        end: partitionEndTime,
        safeTime,
        partition: currentPartition
      });

      setTimeLeft(safeTime);
    };

    updateTimer();

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(updateTimer, 500);

    return () => {
      clearInterval(intervalRef.current);
    };

  }, [partitionEndTime, sessionStatus, currentPartition]);

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

      {/* JOIN COURSE FORM */}
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

      {/* COURSE LIST */}
      <div className="courses-grid">
        {courses.map((course) => (
          <div key={course.id} className="course-card">
            <h3>{course.course_name}</h3>
            <p>{course.semester} {course.year}</p>

            {activeSession ? (
              <div className="live-session">
                <p>Status: {sessionStatus}</p>

                {sessionStatus === "paused" && (
                  <p>⏸ Session Paused</p>
                )}

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
                  const sessionId =
                    await checkActiveSession(course.id);

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
    </div>
  );
};

export default StudentDashboard;