// frontend/src/features/dashboard/pages/ProfessorDashboard.jsx

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
  // SYNC SESSION
  // =========================
  const syncSession = async () => {

    if (!activeSession) return;

    console.log("[SYNC START]", activeSession);

    try {
      const res = await api.get(`/sessions/${activeSession}`);
      const session = res.data;

      console.log("[SYNC DATA]", session);

      socket.emit("join_session", session.id);

      if (session.status === "completed") {

        console.log("[SYNC] Session already completed");

        stopRecording();

        setSessionStatus("completed");
        setCurrentPartition(null);
        setPartitionEndTime(null);
        setTimeLeft(null);
        setActiveSession(null);

        fetchCourses();
        return;
      }

      if (session.status === "active") {

        setSessionStatus("active");
        setCurrentPartition(session.current_partition_index);

        if (session.end_time) {
          setPartitionEndTime(session.end_time);
        }

        // 🔥 delay restart to avoid recorder crash
        setTimeout(() => {
          console.log("[SYNC → REC START]");
          startRecording(session.id);
        }, 500);
      }

    } catch (err) {
      console.error("Sync failed", err);
    }
  };

  // =========================
  // SOCKET LISTENERS
  // =========================
  useEffect(() => {

    socket.on("connect", () => {
      console.log("[SOCKET CONNECTED → SYNC]");
      syncSession();
    });

    socket.on("partition_started", (data) => {

      console.log("[PARTITION START]", {
        partition: data.partition_index,
        time: Date.now()
      });

      setCurrentPartition(data.partition_index);
      setSessionStatus("active");
      setPartitionEndTime(data.end_time);

      // 🔥 CRITICAL FIX: delayed restart
      setTimeout(() => {
        console.log("[REC START AFTER DELAY]");
        startRecording(data.session_id);
      }, 500);
    });

    socket.on("partition_finished", () => {
      console.log("[PARTITION FINISHED → STOP REC]", Date.now());
      stopRecording();
    });

    socket.on("session_completed", () => {

      console.log("[SESSION COMPLETED]", Date.now());

      stopRecording();

      setSessionStatus("completed");
      setCurrentPartition(null);
      setPartitionEndTime(null);
      setTimeLeft(null);
      setActiveSession(null);

      fetchCourses();
    });

    return () => {
      socket.off("connect");
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
      const safeTime = Math.max(remaining, 0);

      console.log("[TIMER]", {
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
  // CREATE + START
  // =========================
  const handleCreateAndStart = async (sessionData) => {

    try {

      const createRes = await api.post("/sessions", sessionData);
      const sessionId = createRes.data.session.id;

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
  // CONTROLS
  // =========================
  const handlePause = async () => {
    if (!activeSession) return;
    await api.post(`/sessions/${activeSession}/pause`);
  };

  const handleResume = async () => {
    if (!activeSession) return;
    await api.post(`/sessions/${activeSession}/resume`);
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

              {sessionStatus === "paused" && (
                <button onClick={handleResume}>Resume</button>
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