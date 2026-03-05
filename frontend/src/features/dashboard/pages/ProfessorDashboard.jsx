import { useEffect, useState } from "react";
import { getCourses } from "../../courses/courseAPI";
import CreateCourse from "../../courses/pages/CreateCourse";
import socket from "../../../services/socket";
import api from "../../../services/api";
import SessionModal from "../../lectures/pages/SessionModal";
import "./ProfessorDashboard.css";

const ProfessorDashboard = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  const [activeSession, setActiveSession] = useState(null);
  const [sessionStatus, setSessionStatus] = useState(null);
  const [currentPartition, setCurrentPartition] = useState(null);

  const [timeLeft, setTimeLeft] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);

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

      // Start local countdown (for demo 1 min = 60 sec)
      const seconds =
        (data.end_minute - data.start_minute) * 60;
      setTimeLeft(seconds);
    });

    socket.on("session_completed", () => {
      setSessionStatus("completed");
      setCurrentPartition(null);
      setTimeLeft(null);
      setActiveSession(null);
    });

    socket.on("session_stopped", () => {
      setSessionStatus("stopped");
      setCurrentPartition(null);
      setTimeLeft(null);
      setActiveSession(null);
    });

    return () => {
      socket.off("partition_started");
      socket.off("session_completed");
      socket.off("session_stopped");
    };
  }, []);

  // =========================
  // LOCAL COUNTDOWN TIMER
  // =========================
  useEffect(() => {
    if (!timeLeft || sessionStatus !== "active") return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timeLeft, sessionStatus]);

  // =========================
  // START SESSION (via Modal)
  // =========================
  const handleCreateAndStart = async (sessionData) => {
    try {
      const createRes = await api.post("/sessions", sessionData);
      const sessionId = createRes.data.session.id;

      await api.post(`/sessions/${sessionId}/start`);

      socket.emit("join_session", { session_id: sessionId });

      setActiveSession(sessionId);
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
    await api.post(`/sessions/${activeSession}/pause`);
    setSessionStatus("paused");
  };

  const handleResume = async () => {
    await api.post(`/sessions/${activeSession}/resume`);
    setSessionStatus("active");
  };

  const handleStop = async () => {
    await api.post(`/sessions/${activeSession}/stop`);
    setSessionStatus("stopped");
    setCurrentPartition(null);
    setTimeLeft(null);
    setActiveSession(null);
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Professor Dashboard</h1>
      </div>

      <div className="create-course-wrapper">
        <CreateCourse onCourseCreated={fetchCourses} />
      </div>

      <div className="courses-section">
        {loading ? (
          <p>Loading...</p>
        ) : (
          <div className="courses-grid">
            {courses.map((course) => (
              <div key={course.id} className="course-card">
                <h3>{course.course_name}</h3>
                <p>
                  {course.semester} {course.year}
                </p>
                <p>Class Code: {course.class_code}</p>

                {/* SESSION CONTROLS */}
                {activeSession ? (
                  <div className="session-controls">
                    <p>Status: {sessionStatus}</p>

                    {currentPartition && (
                      <p>Partition: {currentPartition}</p>
                    )}

                    {timeLeft !== null && (
                      <p>Time Left: {timeLeft}s</p>
                    )}

                    {sessionStatus === "active" && (
                      <button onClick={handlePause}>
                        Pause
                      </button>
                    )}

                    {sessionStatus === "paused" && (
                      <button onClick={handleResume}>
                        Resume
                      </button>
                    )}

                    <button onClick={handleStop}>
                      Stop
                    </button>
                  </div>
                ) : (
                  <button
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
          </div>
        )}
      </div>

      {/* SESSION MODAL */}
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