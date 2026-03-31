import { useEffect, useState, useRef } from "react";
import { getCourses } from "../../courses/courseAPI";
import CreateCourse from "../../courses/pages/CreateCourse";
import socket from "../../../services/socket";
import api from "../../../services/api";
import SessionModal from "../../lectures/pages/SessionModal";
import { startRecording, stopRecording } from "../../lectures/recordingService";
import "./ProfessorDashboard.css";

const ProfessorDashboard = () => {

  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  const [activeSession, setActiveSession] = useState(null);
  const [sessionStatus, setSessionStatus] = useState(null);
  const [currentPartition, setCurrentPartition] = useState(null);

  const [timeLeft, setTimeLeft] = useState(null);
  const [partitionEndTime, setPartitionEndTime] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);

  // ✅ QUIZ STATE
  const [showQuizPrompt, setShowQuizPrompt] = useState(false);
  const [lastPartitionId, setLastPartitionId] = useState(null);

  // 🔥 NEW STATES
  const [quizGenerated, setQuizGenerated] = useState(false);
  const [loadingQuiz, setLoadingQuiz] = useState(false);

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
  // SOCKET LISTENERS
  // =========================
  useEffect(() => {

    socket.on("partition_started", (data) => {
      setCurrentPartition(data.partition_index);
      setSessionStatus("active");
      setPartitionEndTime(data.end_time);

      setTimeout(() => {
        startRecording(data.session_id);
      }, 500);
    });

    socket.on("partition_finished", (data) => {
      stopRecording();

      setLastPartitionId(data.partition_id);
      setShowQuizPrompt(true);

      // 🔥 reset quiz state for new partition
      setQuizGenerated(false);
      setLoadingQuiz(false);
    });

    socket.on("session_completed", () => {
      stopRecording();

      setSessionStatus("completed");
      setCurrentPartition(null);
      setPartitionEndTime(null);
      setTimeLeft(null);
      setActiveSession(null);

      fetchCourses();
    });

    return () => {
      socket.off("partition_started");
      socket.off("partition_finished");
      socket.off("session_completed");
    };

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
  // CREATE + START
  // =========================
  const handleCreateAndStart = async (sessionData) => {

    try {
      const res = await api.post("/sessions", sessionData);
      const sessionId = res.data.session.id;

      setActiveSession(sessionId);
      socket.emit("join_session", sessionId);

      await api.post(`/sessions/${sessionId}/start`);
      setSessionStatus("active");
      setShowModal(false);

    } catch (err) {
      console.error("Failed to start session", err);
    }
  };

  // =========================
  // QUIZ ACTIONS
  // =========================
  const handleGenerateQuiz = async () => {

    if (!activeSession || !lastPartitionId) return;

    try {
      setLoadingQuiz(true);

      await api.post(`/sessions/${activeSession}/generate-quiz`, {
        partition_id: lastPartitionId
      });

      setLoadingQuiz(false);
      setQuizGenerated(true);

    } catch (err) {
      setLoadingQuiz(false);
      console.error("Quiz generation failed", err);
    }
  };

  const handleSkipQuiz = async () => {
    if (!activeSession) return;

    try {
      await api.post(`/sessions/${activeSession}/resume`);
      setShowQuizPrompt(false);
    } catch (err) {
      console.error("Skip failed", err);
    }
  };

  const handleResume = async () => {
    if (!activeSession) return;

    try {
      await api.post(`/sessions/${activeSession}/resume`);
      setShowQuizPrompt(false);
    } catch (err) {
      console.error("Resume failed", err);
    }
  };

  // =========================
  // CONTROLS
  // =========================
  const handlePause = async () => {
    if (!activeSession) return;
    await api.post(`/sessions/${activeSession}/pause`);
  };

  const handleStop = async () => {

    if (!activeSession) return;

    await api.post(`/sessions/${activeSession}/stop`);

    stopRecording();

    setSessionStatus("stopped");
    setCurrentPartition(null);
    setPartitionEndTime(null);
    setTimeLeft(null);
    setActiveSession(null);
  };

  return (
    <div className="dashboard-container">

      <h1>Professor Dashboard</h1>

      <CreateCourse onCourseCreated={fetchCourses} />

      {courses.map(course => (
        <div key={course.id}>

          <h3>{course.course_name}</h3>
          <p>{course.semester} {course.year}</p>
          <p>Class Code: {course.class_code}</p>

          {activeSession && sessionStatus !== "completed" ? (
            <>
              <p>Status: {sessionStatus}</p>
              <p>Partition: {currentPartition}</p>
              <p>Time Left: {timeLeft}s</p>

              {sessionStatus === "active" && (
                <button onClick={handlePause}>Pause</button>
              )}

              <button onClick={handleStop}>Stop</button>
            </>
          ) : (
            <button onClick={() => {
              setSelectedCourse(course.id);
              setShowModal(true);
            }}>
              Start Session
            </button>
          )}

        </div>
      ))}

      {/* QUIZ PROMPT */}
      {showQuizPrompt && (
        <div className="quiz-popup">

          <p>Partition complete. What next?</p>

          {/* 🔥 UPDATED UI */}
          {loadingQuiz && <p>Generating quiz...</p>}

          {!quizGenerated && !loadingQuiz && (
            <button onClick={handleGenerateQuiz}>
              Generate AI Quiz
            </button>
          )}

          {quizGenerated && (
            <p>✅ Quiz Generated</p>
          )}

          <button onClick={handleSkipQuiz}>
            Skip & Resume
          </button>

          <button onClick={handleResume}>
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