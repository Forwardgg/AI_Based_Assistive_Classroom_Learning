import { useEffect, useState, useRef } from "react";
import { getCourses } from "../../courses/courseAPI";
import CreateCourse from "../../courses/pages/CreateCourse";
import socket from "../../../services/socket";
import api from "../../../services/api";
import SessionModal from "../../lectures/pages/SessionModal";
import { startRecording, stopRecording } from "../../lectures/recordingService";
import ProfessorQuizView from "../../quiz/ProfessorQuizView";
import "./ProfessorDashboard.css";

const ProfessorDashboard = () => {

  // State for courses and loading
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Active session and course tracking
  const [activeCourse, setActiveCourse] = useState(null);
  const [activeSessionId, setActiveSessionId] = useState(null);

  // Session state details
  const [sessionStatus, setSessionStatus] = useState(null);
  const [currentPartition, setCurrentPartition] = useState(null);

  // Timer-related state
  const [timeLeft, setTimeLeft] = useState(null);
  const [partitionEndTime, setPartitionEndTime] = useState(null);

  // Modal and UI controls
  const [showModal, setShowModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);

  // Quiz prompt state
  const [showQuizPrompt, setShowQuizPrompt] = useState(false);
  const [lastPartitionId, setLastPartitionId] = useState(null);

  // Quiz generation state
  const [quizGenerated, setQuizGenerated] = useState(false);
  const [loadingQuiz, setLoadingQuiz] = useState(false);

  // Reference for interval timer
  const intervalRef = useRef(null);

  // Fetch all courses for the logged-in professor
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

  // Restore active session after page reload
  const restoreSession = async () => {
    try {
      const res = await getCourses();

      for (const course of res.data) {
        try {
          const active = await api.get(`/sessions/course/${course.id}/active`);

          if (active.data.exists) {
            const sessionId = active.data.session_id;

            setActiveSessionId(sessionId);
            setActiveCourse(course.id);

            // Join socket room for session updates
            socket.emit("join_session", { session_id: sessionId });

            // Fetch session details
            const sessionData = await api.get(`/sessions/${sessionId}`);

            setSessionStatus(sessionData.data.status);
            setCurrentPartition(sessionData.data.current_partition_index);
            setPartitionEndTime(sessionData.data.end_time);

            return;
          }
        } catch {}
      }
    } catch (err) {
      console.error("Restore failed", err);
    }
  };

  // Initial load: fetch courses and restore session
  useEffect(() => {
    fetchCourses();
    restoreSession();
  }, []);

  // Socket event listeners
  useEffect(() => {

    const handleSessionState = (data) => {
      if (data.session_id !== activeSessionId) return;

      // Update session state
      setSessionStatus(data.status);
      setCurrentPartition(data.current_partition_index);

      // Adjust timer using server time to avoid drift
      const now = Math.floor(Date.now() / 1000);
      const drift = now - data.server_time;

      const correctedEnd = data.end_time
        ? data.end_time + drift
        : null;

      setPartitionEndTime(correctedEnd);

      // Start recording when session is active and partition exists
      if (
        data.status === "active" &&
        data.current_partition_index &&
        data.session_id === activeSessionId
      ) {
        startRecording(data.session_id);
      }

      // Stop recording if no active partition
      if (!data.current_partition_index) {
        stopRecording(true);
      }
    };

    const handlePartitionFinished = (data) => {
      if (data.session_id !== activeSessionId) return;

      // Stop recording when partition ends
      stopRecording(true);

      // Show quiz prompt
      setLastPartitionId(data.partition_id);
      setShowQuizPrompt(true);

      setQuizGenerated(false);
      setLoadingQuiz(false);
    };

    const handleCompleted = (data) => {
      if (data.session_id !== activeSessionId) return;

      // Stop recording and reset state when session completes
      stopRecording(true);

      setSessionStatus("completed");
      setCurrentPartition(null);
      setPartitionEndTime(null);
      setTimeLeft(null);
      setActiveSessionId(null);
      setActiveCourse(null);

      fetchCourses();
    };

    const handleStopped = (data) => {
      if (data.session_id !== activeSessionId) return;

      // Stop recording and reset state when session is stopped
      stopRecording(true);

      setSessionStatus("stopped");
      setCurrentPartition(null);
      setPartitionEndTime(null);
      setTimeLeft(null);
      setActiveSessionId(null);
      setActiveCourse(null);
    };

    const handleQuizReady = (data) => {
      if (data.session_id !== activeSessionId) return;

      // Update quiz state when ready
      setLoadingQuiz(false);
      setQuizGenerated(true);
      setLastPartitionId(data.partition_id);
    };

    // Register socket listeners
    socket.on("session_state", handleSessionState);
    socket.on("partition_finished", handlePartitionFinished);
    socket.on("session_completed", handleCompleted);
    socket.on("session_stopped", handleStopped);
    socket.on("quiz_ready", handleQuizReady);

    // Cleanup listeners on unmount
    return () => {
      socket.off("session_state", handleSessionState);
      socket.off("partition_finished", handlePartitionFinished);
      socket.off("session_completed", handleCompleted);
      socket.off("session_stopped", handleStopped);
      socket.off("quiz_ready", handleQuizReady);
    };

  }, [activeSessionId, lastPartitionId]);

  // Timer logic for countdown
  useEffect(() => {

    if (!partitionEndTime || sessionStatus !== "active") return;

    const updateTimer = () => {
      const now = Math.floor(Date.now() / 1000);
      const remaining = partitionEndTime - now;
      setTimeLeft(Math.max(remaining, 0));
    };

    updateTimer();

    // Clear previous interval if exists
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Update timer every 500ms
    intervalRef.current = setInterval(updateTimer, 500);

    return () => clearInterval(intervalRef.current);

  }, [partitionEndTime, sessionStatus]);

  // Create and start a session
  const handleCreateAndStart = async (sessionData) => {
    try {
      const res = await api.post("/sessions", sessionData);
      const sessionId = res.data.session.id;

      setActiveSessionId(sessionId);
      setActiveCourse(sessionData.course_id);

      // Join session room
      socket.emit("join_session", { session_id: sessionId });

      // Start session
      await api.post(`/sessions/${sessionId}/start`);

      setShowModal(false);

    } catch (err) {
      if (err.response?.data?.message) {
        alert(err.response.data.message);
      } else {
        alert("Failed to start session");
      }

      console.error("Failed to start session", err);
    }
  };

  // Trigger quiz generation
  const handleGenerateQuiz = async () => {
    if (!activeSessionId || !lastPartitionId) return;

    try {
      setLoadingQuiz(true);

      await api.post(`/sessions/${activeSessionId}/generate-quiz`, {
        partition_id: lastPartitionId
      });

    } catch (err) {
      setLoadingQuiz(false);
      console.error("Quiz generation failed", err);
    }
  };

  // Resume session
  const handleResume = async () => {
    if (!activeSessionId) return;
    await api.post(`/sessions/${activeSessionId}/resume`);
    setShowQuizPrompt(false);
  };

  // Pause session
  const handlePause = async () => {
    if (!activeSessionId) return;
    await api.post(`/sessions/${activeSessionId}/pause`);
  };

  // Stop session
  const handleStop = async () => {
    if (!activeSessionId) return;

    await api.post(`/sessions/${activeSessionId}/stop`);
    stopRecording(true);

    setSessionStatus("stopped");
    setCurrentPartition(null);
    setPartitionEndTime(null);
    setTimeLeft(null);
    setActiveSessionId(null);
    setActiveCourse(null);
  };

  return (
    <div className="dashboard-container">

      <h1>Professor Dashboard</h1>

      <CreateCourse onCourseCreated={fetchCourses} />

      {courses.map(course => (
        <div key={course.id} className="course-card">

          <h3 className="course-title">{course.course_name}</h3>
          <p className="course-meta">{course.semester} {course.year}</p>
          <p className="course-meta">Code: {course.class_code}</p>

          {activeCourse === course.id && sessionStatus !== "completed" ? (
            <>
              <div className="session-info">
                <p>Status: {sessionStatus}</p>
                <p>Partition: {currentPartition}</p>
                <p>Time Left: {timeLeft}s</p>
              </div>

              {sessionStatus === "active" && (
                <button className="btn btn-pause" onClick={handlePause}>
                  Pause
                </button>
              )}

              {sessionStatus === "paused" && (
                <button className="btn btn-resume" onClick={handleResume}>
                  Resume
                </button>
              )}

              {(sessionStatus === "active" || sessionStatus === "paused") && (
                <button className="btn btn-stop" onClick={handleStop}>
                  Stop
                </button>
              )}
            </>
          ) : (
            <button
              className="btn btn-start"
              onClick={() => {
                setSelectedCourse(course.id);
                setShowModal(true);
              }}
            >
              Start Session
            </button>
          )}

        </div>
      ))}

      {showQuizPrompt && (
        <div className="quiz-popup">

          <p>Partition complete. What next?</p>

          {loadingQuiz && <p className="loading-text">Generating quiz...</p>}

          {!quizGenerated && !loadingQuiz && (
            <button className="btn btn-quiz" onClick={handleGenerateQuiz}>
              Generate AI Quiz
            </button>
          )}

          {quizGenerated && (
            <>
              <p>Quiz Generated</p>

              <button
                className="btn btn-quiz"
                onClick={() => setShowQuizPrompt(false)}
              >
                View Quiz
              </button>

              <ProfessorQuizView
                partitionId={lastPartitionId}
                onClose={() => setQuizGenerated(false)}
              />
            </>
          )}

          <button className="btn btn-resume" onClick={handleResume}>
            Resume Lecture
          </button>

        </div>
      )}

      {showModal && (
        <SessionModal
          courseId={selectedCourse}
          onClose={() => setShowModal(false)}
          onCreate={handleCreateAndStart}
        />
      )}

    </div>
  );
};

export default ProfessorDashboard;