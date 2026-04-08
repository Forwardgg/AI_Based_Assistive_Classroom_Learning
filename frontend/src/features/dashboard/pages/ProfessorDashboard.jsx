import { useEffect, useState, useRef } from "react";
import { getCourses } from "../../courses/courseAPI";
import socket from "../../../services/socket";
import api from "../../../services/api";
import { startRecording, stopRecording } from "../../lectures/recordingService";
import ProfessorDashboardUI from "./ProfessorDashboardUI"; // ✅ NEW

const ProfessorDashboard = () => {

  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  const [activeCourse, setActiveCourse] = useState(null);
  const [activeSessionId, setActiveSessionId] = useState(null);

  const [sessionStatus, setSessionStatus] = useState(null);
  const [currentPartition, setCurrentPartition] = useState(null);

  const [timeLeft, setTimeLeft] = useState(null);
  const [partitionEndTime, setPartitionEndTime] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);

  const [showQuizPrompt, setShowQuizPrompt] = useState(false);
  const [lastPartitionId, setLastPartitionId] = useState(null);

  const [quizGenerated, setQuizGenerated] = useState(false);
  const [loadingQuiz, setLoadingQuiz] = useState(false);

  const intervalRef = useRef(null);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const res = await getCourses();
      setCourses(res.data);
    } catch {
      console.error("Failed to fetch courses");
    } finally {
      setLoading(false);
    }
  };

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

            socket.emit("join_session", { session_id: sessionId });

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

  useEffect(() => {
    fetchCourses();
    restoreSession();
  }, []);

  useEffect(() => {

    const handleSessionState = (data) => {
      if (data.session_id !== activeSessionId) return;

      setSessionStatus(data.status);
      setCurrentPartition(data.current_partition_index);

      const now = Math.floor(Date.now() / 1000);
      const drift = now - data.server_time;

      const correctedEnd = data.end_time
        ? data.end_time + drift
        : null;

      setPartitionEndTime(correctedEnd);

      if (
        data.status === "active" &&
        data.current_partition_index &&
        data.session_id === activeSessionId
      ) {
        startRecording(data.session_id);
      }

      if (!data.current_partition_index) {
        stopRecording(true);
      }
    };

    const handlePartitionFinished = (data) => {
      if (data.session_id !== activeSessionId) return;

      stopRecording(true);

      setLastPartitionId(data.partition_id);
      setShowQuizPrompt(true);

      setQuizGenerated(false);
      setLoadingQuiz(false);
    };

    const handleCompleted = (data) => {
      if (data.session_id !== activeSessionId) return;

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

      setLoadingQuiz(false);
      setQuizGenerated(true);
      setLastPartitionId(data.partition_id);
    };

    socket.on("session_state", handleSessionState);
    socket.on("partition_finished", handlePartitionFinished);
    socket.on("session_completed", handleCompleted);
    socket.on("session_stopped", handleStopped);
    socket.on("quiz_ready", handleQuizReady);

    return () => {
      socket.off("session_state", handleSessionState);
      socket.off("partition_finished", handlePartitionFinished);
      socket.off("session_completed", handleCompleted);
      socket.off("session_stopped", handleStopped);
      socket.off("quiz_ready", handleQuizReady);
    };

  }, [activeSessionId]);

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

  const handleCreateAndStart = async (sessionData) => {
    try {
      const res = await api.post("/sessions", sessionData);
      const sessionId = res.data.session.id;

      setActiveSessionId(sessionId);
      setActiveCourse(sessionData.course_id);

      socket.emit("join_session", { session_id: sessionId });

      await api.post(`/sessions/${sessionId}/start`);

      setShowModal(false);

    } catch (err) {
      alert("Failed to start session");
    }
  };

  const handleGenerateQuiz = async () => {
    if (!activeSessionId || !lastPartitionId) return;

    try {
      setLoadingQuiz(true);

      await api.post(`/sessions/${activeSessionId}/generate-quiz`, {
        partition_id: lastPartitionId
      });

    } catch {
      setLoadingQuiz(false);
    }
  };

  const handleResume = async () => {
    if (!activeSessionId) return;
    await api.post(`/sessions/${activeSessionId}/resume`);
    setShowQuizPrompt(false);
  };

  const handlePause = async () => {
    if (!activeSessionId) return;
    await api.post(`/sessions/${activeSessionId}/pause`);
  };

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
    <ProfessorDashboardUI
      courses={courses}
      loading={loading}

      activeCourse={activeCourse}
      activeSessionId={activeSessionId}
      sessionStatus={sessionStatus}
      currentPartition={currentPartition}
      timeLeft={timeLeft}

      showModal={showModal}
      selectedCourse={selectedCourse}

      showQuizPrompt={showQuizPrompt}
      lastPartitionId={lastPartitionId}
      quizGenerated={quizGenerated}
      loadingQuiz={loadingQuiz}

      onStartSession={(courseId) => {
        setSelectedCourse(courseId);
        setShowModal(true);
      }}

      onPause={handlePause}
      onResume={handleResume}
      onStop={handleStop}

      onGenerateQuiz={handleGenerateQuiz}

      onCreateSession={handleCreateAndStart}
      onCloseModal={() => setShowModal(false)}

      onFetchCourses={fetchCourses}
    />
  );
};

export default ProfessorDashboard;