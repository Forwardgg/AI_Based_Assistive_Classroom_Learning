import { useEffect, useState, useRef } from "react";
import { getCourses, joinCourse } from "../../courses/courseAPI";
import socket from "../../../services/socket";
import api from "../../../services/api";
import QuizModal from "../../../features/quiz/QuizModal";
import { Clock, BookOpen, BarChart2, Target, FileText } from "lucide-react";
import "./StudentDashboard.css";

const StudentDashboard = () => {
  const [courses, setCourses] = useState([]);
  const [classCode, setClassCode] = useState("");
  const [rollNo, setRollNo] = useState("");
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  const [activeCourse, setActiveCourse] = useState(null);
  const [activeSessionId, setActiveSessionId] = useState(null);

  const [sessionStatus, setSessionStatus] = useState(null);
  const [currentPartition, setCurrentPartition] = useState(null);

  const [timeLeft, setTimeLeft] = useState(null);
  const [partitionEndTime, setPartitionEndTime] = useState(null);

  const [showQuiz, setShowQuiz] = useState(false);
  const [quizPartitionId, setQuizPartitionId] = useState(null);

  const [analytics, setAnalytics] = useState(null);

  const intervalRef = useRef(null);

  // =========================
  // FORMAT TIMER
  // =========================
  const formatTime = (t) => {
    if (t === null) return "--:--";
    const m = Math.floor(t / 60);
    const s = t % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // =========================
  // FETCH COURSES
  // =========================
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

  // =========================
  // FETCH ANALYTICS
  // =========================
  const fetchAnalytics = async () => {
    try {
      const res = await api.get("/analytics/student/me");
      setAnalytics(res.data);
    } catch (err) {
      console.error("Analytics fetch failed", err);
    }
  };

  // =========================
  // SYNC SESSION
  // =========================
  const syncSessionState = async (sessionId) => {
    try {
      const res = await api.get(`/sessions/${sessionId}`);
      const data = res.data;

      setSessionStatus(data.status);
      setCurrentPartition(data.current_partition_index);
      setPartitionEndTime(data.end_time);
    } catch {
      console.error("Sync failed");
    }
  };

  // =========================
  // RESTORE SESSION
  // =========================
  const restoreSession = async () => {
    try {
      const sessionId = localStorage.getItem("activeSessionId");
      const courseId = localStorage.getItem("activeCourseId");

      if (!sessionId || !courseId) return;

      const res = await api.get(`/sessions/${sessionId}`);

      if (!res.data || ["completed", "stopped"].includes(res.data.status)) {
        localStorage.removeItem("activeSessionId");
        localStorage.removeItem("activeCourseId");
        return;
      }

      setActiveSessionId(parseInt(sessionId));
      setActiveCourse(parseInt(courseId));

      socket.emit("join_session", { session_id: parseInt(sessionId) });

      await syncSessionState(sessionId);
    } catch (err) {
      console.error("Restore failed", err);
    }
  };

  // =========================
  // INIT
  // =========================
  useEffect(() => {
    fetchCourses();
    fetchAnalytics();
    restoreSession();
  }, []);

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
  const joinSession = async (sessionId, courseId) => {
    socket.emit("join_session", { session_id: sessionId });

    setActiveSessionId(sessionId);
    setActiveCourse(courseId);

    localStorage.setItem("activeSessionId", sessionId);
    localStorage.setItem("activeCourseId", courseId);

    await syncSessionState(sessionId);

    setTimeout(() => {
      syncSessionState(sessionId);
    }, 300);
  };

  // =========================
  // SOCKET LISTENERS
  // =========================
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
    };

    const handleCompleted = (data) => {
      if (data.session_id !== activeSessionId) return;
      resetSession();
    };

    const handleStopped = (data) => {
      if (data.session_id !== activeSessionId) return;
      resetSession();
    };

    const handleQuiz = (data) => {
      if (data.session_id !== activeSessionId) return;

      setQuizPartitionId(data.partition_id);
      setShowQuiz(true);

      // 🔥 refresh analytics after quiz
      setTimeout(fetchAnalytics, 2000);
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
  }, [activeSessionId]);

  // =========================
  // RESET SESSION
  // =========================
  const resetSession = () => {
    setSessionStatus(null);
    setCurrentPartition(null);
    setTimeLeft(null);
    setPartitionEndTime(null);
    setActiveSessionId(null);
    setActiveCourse(null);
    setShowQuiz(false);

    localStorage.removeItem("activeSessionId");
    localStorage.removeItem("activeCourseId");
  };

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

  const activeCourseData = courses.find(c => c.id === activeCourse);

  return (
    <div className="dashboard-wrapper">
      <div className="dashboard-container">

        {/* HERO */}
        {activeCourseData && sessionStatus && (
          <section className="hero-banner">
            <div>
              <div className="hero-header">
                <h2>{activeCourseData.course_name}</h2>
                <span className="badge-live">
  {sessionStatus.toUpperCase()}
</span>
              </div>
              <p className="current-topic">
                Partition {currentPartition || "-"}
              </p>
            </div>

            <div className="hero-actions">
              <div className="timer">
                <Clock size={18} />
                <span>{formatTime(timeLeft)}</span>
              </div>
            </div>
          </section>
        )}

        {/* JOIN COURSE */}
        <form className="hero-banner" onSubmit={handleJoinCourse}>
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
          <button className="btn-join-hero">
            {joining ? "Joining..." : "Join Course"}
          </button>
        </form>

        {/* COURSES */}
        <section>
          <h3 className="section-title">
            <BookOpen size={20} /> My Courses
          </h3>

          <div className="course-grid">
            {courses.map((course) => {
              const isActive = activeCourse === course.id;

              return (
                <div key={course.id} className="course-card-v2">
                  <div className="card-top">
                    <h4 className="course-name">{course.course_name}</h4>
                    <span className={`status-badge ${isActive ? "live" : "inactive"}`}>
                      {isActive ? "Live" : "Inactive"}
                    </span>
                  </div>

                  <p className="instructor-name">
                    {course.semester} {course.year}
                  </p>

                  <div className="button-group">
                    {!isActive && (
                      <button
                        className="btn-join-v2"
                        onClick={async () => {
                          const sessionId = await checkActiveSession(course.id);
                          if (!sessionId) return alert("No live session");
                          joinSession(sessionId, course.id);
                        }}
                      >
                        Join
                      </button>
                    )}

                    <button className="btn-action-v2">
                      <FileText size={16} /> Notes
                    </button>

                    <button className="btn-action-v2">
                      <BarChart2 size={16} /> Results
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* BOTTOM GRID */}
        <div className="bottom-grid">

          {/* PERFORMANCE */}
          <div className="info-card">
            <h3 className="card-title">
              <BarChart2 size={20} color="#1e40af" /> Performance
            </h3>

            {analytics ? (
              <>
                <div className="stat-row">
                  <div className="stat-info">
                    <span>Accuracy</span>
                    <span className="stat-value">
                      {Math.round(analytics.overall_accuracy || 0)}%
                    </span>
                  </div>
                  <div className="progress-bg">
                    <div
                      className="progress-fill"
                      style={{ width: `${analytics.overall_accuracy || 0}%` }}
                    />
                  </div>
                </div>

                <div className="stat-row">
                  <div className="stat-info">
                    <span>Participation</span>
                    <span className="stat-value">
                      {Math.round(analytics.participation_rate || 0)}%
                    </span>
                  </div>
                  <div className="progress-bg">
                    <div
                      className="progress-fill"
                      style={{ width: `${analytics.participation_rate || 0}%` }}
                    />
                  </div>
                </div>
              </>
            ) : (
              <p>Loading...</p>
            )}
          </div>

          {/* RESULTS */}
          <div className="info-card">
            <h3 className="card-title">
              <Target size={20} color="#1e40af" /> Recent Results
            </h3>

            <div className="data-list">
              {analytics?.sessions?.length ? (
                analytics.sessions.slice(0, 3).map((s, i) => (
                  <div key={i} className="data-row">
                    <div>
                      <div className="row-main">{s.course_name}</div>
                      <div className="row-sub">
                        {new Date(s.date).toLocaleDateString()}
                      </div>
                    </div>
                    <span className="score-badge">
                      {s.score}/{s.total}
                    </span>
                  </div>
                ))
              ) : (
                <div className="data-row">No results yet</div>
              )}
            </div>

            <button className="view-btn">View All Results</button>
          </div>

          {/* NOTES */}
          <div className="info-card">
            <h3 className="card-title">
              <FileText size={20} color="#1e40af" /> Lecture Notes
            </h3>

            <div className="data-list">
              {courses.map((course) => (
                <div key={course.id} className="data-row">
                  <div className="row-main">{course.course_name}</div>
                  <button className="link-text">View</button>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* QUIZ */}
        {showQuiz && (
          <QuizModal
            partitionId={quizPartitionId}
            onClose={() => setShowQuiz(false)}
          />
        )}

      </div>
    </div>
  );
};

export default StudentDashboard;