// frontend/src/features/dashboard/pages/ProfessorDashboard.jsx

import { useEffect, useState, useRef } from "react";
import { getCourses } from "../../courses/courseAPI";
import socket from "../../../services/socket";
import api from "../../../services/api";
import { endSegment } from "../../lectures/sessionApi";
import {
  startRecording,
  stopRecording,
} from "../../lectures/recordingService";
import ProfessorDashboardUI from "./ProfessorDashboardUI";

const ProfessorDashboard = () => {
  const [courses, setCourses]         = useState([]);
  const [loading, setLoading]         = useState(true);

  const [activeCourse, setActiveCourse]           = useState(null);
  const [activeSessionId, setActiveSessionId]     = useState(null);
  const [activeSessionName, setActiveSessionName] = useState(null);

  const [sessionStatus, setSessionStatus]     = useState(null);
  const [sessionMode, setSessionMode] = useState(null);
const [elapsedTime, setElapsedTime] = useState(null);
const [sessionStartTime, setSessionStartTime] = useState(null);
  const [currentPartition, setCurrentPartition] = useState(null);

  const [timeLeft, setTimeLeft]               = useState(null);
  const [partitionEndTime, setPartitionEndTime] = useState(null);

  // Scheduled sessions (flat list, each item has course_name attached)
  const [scheduledSessions, setScheduledSessions] = useState([]);

  // Modals
  const [showModal, setShowModal]           = useState(false);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);

  // Quiz flow
  const [showQuizPrompt, setShowQuizPrompt] = useState(false);
  const [lastPartitionId, setLastPartitionId] = useState(null);
  const [quizGenerated, setQuizGenerated]   = useState(false);
  const [loadingQuiz, setLoadingQuiz]       = useState(false);

  const intervalRef = useRef(null);

  // ─────────────────────────────────────────
  // Fetch scheduled sessions for all courses
  // ─────────────────────────────────────────
  const fetchScheduledSessions = async (coursesData) => {
    try {
      const results = await Promise.all(
        coursesData.map((course) =>
          api
            .get(`/sessions/course/${course.id}/scheduled`)
            .then((res) =>
              res.data.sessions.map((s) => ({
                ...s,
                course_name: course.course_name,
                course_id:   course.id,
              }))
            )
            .catch(() => [])
        )
      );
      setScheduledSessions(results.flat());
    } catch (err) {
      console.error("Failed to fetch scheduled sessions", err);
    }
  };

  // ─────────────────────────────────────────
  // Fetch courses (and refresh scheduled sessions)
  // ─────────────────────────────────────────
  const fetchCourses = async () => {
    setLoading(true);
    try {
      const res = await getCourses();
      setCourses(res.data);
      await fetchScheduledSessions(res.data);
    } catch (err) {
      console.error("Failed to fetch courses", err);
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────
  // Restore active session on page load
  // ─────────────────────────────────────────
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
            setSessionMode(sessionData.data.mode || "partitioned");
setSessionStartTime(sessionData.data.start_time || null);
            setCurrentPartition(sessionData.data.current_partition_index);
            setPartitionEndTime(sessionData.data.end_time);
            setActiveSessionName(sessionData.data.name || null);

            return;
          }
        } catch {
          // ignore per-course failures
        }
      }
    } catch (err) {
      console.error("Restore failed", err);
    }
  };

  useEffect(() => {
    fetchCourses();
    restoreSession();
  }, []);

  // ─────────────────────────────────────────
  // Socket event handlers
  // ─────────────────────────────────────────
  useEffect(() => {
    const handleSessionState = (data) => {
      if (data.session_id !== activeSessionId) return;

      setSessionStatus(data.status);
      setCurrentPartition(data.current_partition_index);

      setSessionMode(data.mode || "partitioned");

const now = Math.floor(Date.now() / 1000);
const drift = now - data.server_time;

if (data.mode === "partitioned") {

  const correctedEnd =
    data.end_time
      ? data.end_time + drift
      : null;

  setPartitionEndTime(correctedEnd);

} else {

  setSessionStartTime(
    data.start_time || null
  );

  setPartitionEndTime(null);
}

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
      setSessionMode(null);
setElapsedTime(null);
setSessionStartTime(null);
      setCurrentPartition(null);
      setPartitionEndTime(null);
      setTimeLeft(null);
      setActiveSessionId(null);
      setActiveCourse(null);
      setActiveSessionName(null);
      setShowQuizPrompt(false);

      fetchCourses();
    };

    const handleStopped = (data) => {
      if (data.session_id !== activeSessionId) return;

      stopRecording(true);

      setSessionStatus("stopped");
      setSessionMode(null);
setElapsedTime(null);
setSessionStartTime(null);
      setCurrentPartition(null);
      setPartitionEndTime(null);
      setTimeLeft(null);
      setActiveSessionId(null);
      setActiveCourse(null);
      setActiveSessionName(null);
      setShowQuizPrompt(false);
    };

    const handleQuizReady = (data) => {
      if (data.session_id !== activeSessionId) return;

      setLoadingQuiz(false);
      setQuizGenerated(true);
      setLastPartitionId(data.partition_id);
      setShowQuizPrompt(true);
    };

    socket.on("session_state",       handleSessionState);
    socket.on("partition_finished",  handlePartitionFinished);
    socket.on("session_completed",   handleCompleted);
    socket.on("session_stopped",     handleStopped);
    socket.on("quiz_ready",          handleQuizReady);

    return () => {
      socket.off("session_state",       handleSessionState);
      socket.off("partition_finished",  handlePartitionFinished);
      socket.off("session_completed",   handleCompleted);
      socket.off("session_stopped",     handleStopped);
      socket.off("quiz_ready",          handleQuizReady);
    };
  }, [activeSessionId]);

  // ─────────────────────────────────────────
  // Countdown timer
  // ─────────────────────────────────────────
  useEffect(() => {

  if (sessionStatus !== "active") {
    return;
  }

  const updateTimer = () => {

    const now = Math.floor(Date.now() / 1000);

    // =====================================
    // PARTITIONED MODE
    // =====================================

    if (
      sessionMode === "partitioned" &&
      partitionEndTime
    ) {

      setTimeLeft(
        Math.max(partitionEndTime - now, 0)
      );

      return;
    }

    // =====================================
    // FLUID MODE
    // =====================================

    if (
      sessionMode === "fluid" &&
      sessionStartTime
    ) {

      setElapsedTime(
        Math.max(now - sessionStartTime, 0)
      );
    }
  };

  updateTimer();

  if (intervalRef.current) {
    clearInterval(intervalRef.current);
  }

  intervalRef.current = setInterval(
    updateTimer,
    500
  );

  return () => clearInterval(intervalRef.current);

}, [
  partitionEndTime,
  sessionStartTime,
  sessionStatus,
  sessionMode
]);

  // ─────────────────────────────────────────
  // Create + start immediately (from modal)
  // ─────────────────────────────────────────
  const handleStartNow = async (sessionData) => {
    try {
      const res = await api.post("/sessions", sessionData);

      const sessionId   = res.data.session.id;
      const sessionName = res.data.session.name;

      setActiveSessionId(sessionId);
      setActiveCourse(sessionData.course_id);
      setActiveSessionName(sessionName || null);

      socket.emit("join_session", { session_id: sessionId });

      await api.post(`/sessions/${sessionId}/start`);

      setShowModal(false);
    } catch (err) {
      alert("Failed to start session");
    }
  };

  // ─────────────────────────────────────────
  // Create only (schedule for later)
  // ─────────────────────────────────────────
  const handleScheduleSession = async (sessionData) => {
    try {
      await api.post("/sessions", sessionData);
      setShowModal(false);
      fetchCourses(); // refreshes courses + scheduled sessions
    } catch (err) {
      alert("Failed to schedule session");
    }
  };

  // ─────────────────────────────────────────
  // Start a pre-scheduled session
  // ─────────────────────────────────────────
  const handleStartScheduled = async (sessionId, courseId, sessionName) => {
    if (activeSessionId) {
      alert("Stop the current session before starting another.");
      return;
    }

    try {
      setActiveSessionId(sessionId);
      setActiveCourse(courseId);
      setActiveSessionName(sessionName || null);

      socket.emit("join_session", { session_id: sessionId });

      await api.post(`/sessions/${sessionId}/start`);

      // Remove from scheduled list immediately (backend status changes to active)
      setScheduledSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch (err) {
      // Rollback optimistic state on failure
      setActiveSessionId(null);
      setActiveCourse(null);
      setActiveSessionName(null);
      alert("Failed to start session");
    }
  };

  // ─────────────────────────────────────────
  // Pause / Resume / Stop
  // ─────────────────────────────────────────
  const handlePause = async () => {
    if (!activeSessionId) return;
    setSessionStatus("paused");
    clearInterval(intervalRef.current);
    await api.post(`/sessions/${activeSessionId}/pause`);
  };

  const handleResume = async () => {

  if (!activeSessionId) {
    return;
  }

  try {

    stopRecording(true);

    await api.post(
      `/sessions/${activeSessionId}/resume`
    );

    setShowQuizPrompt(false);

    // socket session_state event
    // will restart recording

  } catch (err) {

    console.error(
      "Resume failed",
      err
    );
  }
};

  const handleEndSegment = async () => {

  if (!activeSessionId) {
    return;
  }

  try {

    stopRecording(true);

    await endSegment(activeSessionId);

    // IMPORTANT:
    // DO NOT manually restart recording here.
    // Socket session_state events already
    // restart recording automatically.

  } catch (err) {

    console.error(
      "Failed to end segment",
      err
    );

    alert("Failed to end segment");
  }
};

  const handleStop = async () => {
    if (!activeSessionId) return;

    await api.post(`/sessions/${activeSessionId}/stop`);

    stopRecording(true);

    setSessionStatus("stopped");
    setSessionMode(null);
setElapsedTime(null);
setSessionStartTime(null);
    setCurrentPartition(null);
    setPartitionEndTime(null);
    setTimeLeft(null);
    setActiveSessionId(null);
    setActiveCourse(null);
    setActiveSessionName(null);
    setShowQuizPrompt(false);
  };

  const handleGenerateQuiz = async () => {
    if (!activeSessionId || !lastPartitionId) return;

    try {
      setLoadingQuiz(true);
      await api.post(`/sessions/${activeSessionId}/generate-quiz`, {
        partition_id: lastPartitionId,
      });
    } catch (err) {
      console.error("Failed to generate quiz", err);
      setLoadingQuiz(false);
    }
  };

  return (
    <ProfessorDashboardUI
      courses={courses}
      loading={loading}
      activeCourse={activeCourse}
      activeSessionId={activeSessionId}
      activeSessionName={activeSessionName}
      sessionStatus={sessionStatus}
      currentPartition={currentPartition}
      sessionMode={sessionMode}
elapsedTime={elapsedTime}
onEndSegment={handleEndSegment}
      timeLeft={timeLeft}
      scheduledSessions={scheduledSessions}
      showModal={showModal}
      showCourseModal={showCourseModal}
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
      onStartNow={handleStartNow}
      onScheduleSession={handleScheduleSession}
      onStartScheduled={handleStartScheduled}
      onCloseModal={() => setShowModal(false)}
      onOpenCourseModal={() => setShowCourseModal(true)}
      onCloseCourseModal={() => setShowCourseModal(false)}
      onFetchCourses={fetchCourses}
      onCloseQuiz={() => setShowQuizPrompt(false)}
    />
  );
};

export default ProfessorDashboard;
