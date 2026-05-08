// frontend/src/features/dashboard/pages/ProfessorDashboardUI.jsx

import React, { useState, useMemo } from "react";
import {
  BookOpen,
  Users,
  Clock,
  Brain,
  Plus,
  FileText,
  BarChart3,
  Pause,
  Play,
  Square,
  Search,
  X,
  Library,
  CalendarClock,
  Zap,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import CreateCourse from "../../courses/pages/CreateCourse";
import SessionModal from "../../lectures/pages/SessionModal";
import ProfessorQuizView from "../../quiz/ProfessorQuizView";
import "./ProfessorDashboardUI.css";

const ProfessorDashboardUI = (props) => {
  const {
    courses,
    loading,
    activeCourse,
    activeSessionName,
    sessionMode,
elapsedTime,
onEndSegment,
    sessionStatus,
    currentPartition,
    timeLeft,
    scheduledSessions,

    showModal,
    showCourseModal,
    selectedCourse,

    showQuizPrompt,
    lastPartitionId,
    quizGenerated,
    loadingQuiz,

    onStartSession,
    onPause,
    onResume,
    onStop,

    onGenerateQuiz,
    onStartNow,
    onScheduleSession,
    onStartScheduled,
    onCloseModal,

    onOpenCourseModal,
    onCloseCourseModal,
    onFetchCourses,

    onCloseQuiz,
  } = props;

  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  const formatTime = (seconds) => {

  if (seconds === null || seconds === undefined) {
    return "--";
  }

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return `${mins}:${String(secs).padStart(2, "0")}`;
};

  const filteredCourses = useMemo(() => {
    return courses.filter(
      (course) =>
        course.course_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.class_code.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [courses, searchTerm]);

  const stats = useMemo(() => {
    const totalSessions = courses.reduce(
      (sum, c) => sum + (c.sessions_count || 0),
      0
    );
    const totalStudents = courses.reduce(
      (sum, c) => sum + (c.students_count || 0),
      0
    );
    return { totalSessions, totalStudents };
  }, [courses]);

  const recentSessions = useMemo(() => {
    const sessions = [];
    courses.forEach((course) => {
      if (course.last_session) {
        sessions.push({
          id:       course.id,
          name:     course.course_name,
          time:     course.last_session,
          students: course.students_count || 0,
          status:   course.live ? "Active" : "Completed",
        });
      }
    });
    return sessions.slice(0, 5);
  }, [courses]);

  // Format scheduled_at for display
  const formatScheduledAt = (iso) => {
    if (!iso) return "No time set";
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month:   "short",
      day:     "numeric",
      hour:    "2-digit",
      minute:  "2-digit",
    });
  };

  return (
    <div className="professor-dashboard-ui-root">
      <div className="dashboard-container">
        <main className="main-content">

          {/* ── LIVE SESSION BAR ── */}
          {(sessionStatus === "active" || sessionStatus === "paused") && (

  <div className={`session-control-bar ${sessionStatus}`}>

    <div className="session-bar-info">

      <div className="pulse-indicator"></div>

      <strong>

        {sessionMode === "fluid"
          ? (
              activeSessionName
                ? `Live: ${activeSessionName} — Segment ${currentPartition}`
                : `Live Session: Segment ${currentPartition}`
            )
          : (
              activeSessionName
                ? `Live: ${activeSessionName} — Partition ${currentPartition}`
                : `Live Session: Partition ${currentPartition}`
            )}

      </strong>

      <span className="timer-display">

        <Clock size={16} />

        {sessionMode === "fluid"
          ? formatTime(elapsedTime)
          : (
              timeLeft !== null
                ? `${timeLeft}s`
                : "--"
            )}

      </span>

    </div>

    <div className="session-bar-actions">

      {/* ================================= */}
      {/* END SEGMENT BUTTON */}
      {/* ================================= */}

      {sessionMode === "fluid" &&
       sessionStatus === "active" && (
        <button
          className="bar-btn"
          onClick={onEndSegment}
        >
          End Segment
        </button>
      )}

      {/* ================================= */}
      {/* PAUSE / RESUME */}
      {/* ================================= */}

      {sessionStatus === "paused" ? (

        <button
          className="bar-btn resume"
          onClick={onResume}
        >
          <Play size={18} />
          Resume
        </button>

      ) : (

        <button
          className="bar-btn pause"
          onClick={onPause}
        >
          <Pause size={18} />
          Pause
        </button>

      )}

      {/* ================================= */}
      {/* STOP */}
      {/* ================================= */}

      <button
        className="bar-btn stop"
        onClick={onStop}
      >
        <Square size={18} />
        Stop
      </button>

    </div>

  </div>
)}

          {/* ── HEADER ── */}
          <header className="greeting">
            <h1>Dashboard</h1>
            <p>Here's an overview of your lecture activity.</p>
          </header>

          {/* ── STATS ── */}
          <div className="stats-row">
            <StatCard
              title="Total Sessions"
              value={stats.totalSessions}
              label="Across courses"
              Icon={BookOpen}
            />
            <StatCard
              title="Active Students"
              value={stats.totalStudents}
              label="Across courses"
              Icon={Users}
            />
            <StatCard
              title="Courses"
              value={courses.length}
              label="You teach"
              Icon={Library}
            />
            <StatCard
              title="Live Sessions"
              value={courses.filter((c) => c.live).length}
              label="Right now"
              Icon={Brain}
            />
          </div>

          <div className="dashboard-layout-stack">
            <div className="dual-grid-row">

              {/* ── COURSES ── */}
              <div className="content-card flex-column list-container">
                <div className="list-header">
                  <h2>Your Courses</h2>
                  <div className="search-wrapper">
                    <Search size={14} />
                    <input
                      type="text"
                      placeholder="Search courses..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>

                <div className="scroll-area">
                  {loading ? (
                    <p>Loading...</p>
                  ) : filteredCourses.length === 0 ? (
                    <p>No courses found.</p>
                  ) : (
                    filteredCourses.map((course) => (
                      <div key={course.id} className="course-row-simple">
                        <div className="course-info">
                          <h3>{course.course_name}</h3>
                          <p>{course.class_code}</p>
                        </div>

                        {activeCourse === course.id &&
                        sessionStatus !== "completed" ? (
                          <div className="session-controls">
                            {sessionStatus === "active" && (
                              <button
                                onClick={onPause}
                                className="btn-icon-only"
                              >
                                <Pause size={14} />
                              </button>
                            )}
                            {sessionStatus === "paused" && (
                              <button
                                onClick={onResume}
                                className="btn-icon-only"
                              >
                                <Play size={14} />
                              </button>
                            )}
                            <button
                              onClick={onStop}
                              className="btn-icon-only stop"
                            >
                              <Square size={14} />
                            </button>
                          </div>
                        ) : (
                          <button
                            className="btn-primary-blue"
                            onClick={() => onStartSession(course.id)}
                          >
                            Start
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* ── QUICK ACTIONS ── */}
              <aside className="content-card flex-column">
                <h2>Quick Actions</h2>
                <div className="actions-grid-compact">
                  <ActionButton
                    icon={<Plus size={18} />}
                    title="Create Course"
                    desc="Add new"
                    onClick={onOpenCourseModal}
                  />
                  <ActionButton
                    icon={<FileText size={18} />}
                    title="Notes"
                    desc="PDFs"
                    onClick={() => navigate("/dashboard/professor/courses")}
                  />
                  <ActionButton
                    icon={<Library size={18} />}
                    title="Quiz"
                    desc="AI & Custom"
                    onClick={() => navigate("/dashboard/professor/courses")}
                  />
                  <ActionButton
                    icon={<BarChart3 size={18} />}
                    title="Analytics"
                    desc="Insights"
                    onClick={() => navigate("/dashboard/professor/analytics")}
                  />
                </div>
              </aside>
            </div>

            {/* ── SCHEDULED SESSIONS ── */}
            <div className="content-card full-width-sessions">
              <div className="list-header">
                <h2>
                  <CalendarClock size={18} style={{ marginRight: 6, verticalAlign: "middle" }} />
                  Scheduled Sessions
                </h2>
                <span className="scheduled-count">
                  {scheduledSessions.length} pending
                </span>
              </div>

              {scheduledSessions.length === 0 ? (
                <p style={{ color: "var(--text-muted, #888)", fontSize: "0.9rem", marginTop: 8 }}>
                  No sessions scheduled. Use the <strong>Start</strong> button on a course, then choose <em>Schedule</em>.
                </p>
              ) : (
                <div className="recent-list-horizontal">
                  {scheduledSessions.map((session) => (
                    <div key={session.id} className="recent-row">
                      <div className="recent-info">
                        <h3>
                          {session.name || "Unnamed Session"}
                        </h3>
                        <p>{session.course_name}</p>
                        <p style={{ fontSize: "0.78rem", color: "var(--text-muted, #888)" }}>
                          {session.scheduled_at
                            ? `Scheduled: ${formatScheduledAt(session.scheduled_at)}`
                            : `${session.duration_minutes} min · ${session.partitions?.length ?? 0} partitions`}
                        </p>
                      </div>

                      <div className="recent-meta">
                        <span>
                          <Clock size={12} />
                          {session.duration_minutes}m
                        </span>

                        <button
                          className="btn-primary-blue"
                          style={{ display: "flex", alignItems: "center", gap: 4 }}
                          onClick={() =>
                            onStartScheduled(
                              session.id,
                              session.course_id,
                              session.name
                            )
                          }
                        >
                          <Zap size={13} />
                          Start
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── RECENT SESSIONS ── */}
            <div className="content-card full-width-sessions">
              <h2>Recent Sessions</h2>
              <div className="recent-list-horizontal">
                {recentSessions.length === 0 ? (
                  <p>No recent sessions</p>
                ) : (
                  recentSessions.map((s) => (
                    <div key={s.id} className="recent-row">
                      <div className="recent-info">
                        <h3>{s.name}</h3>
                        <p>{s.time}</p>
                      </div>
                      <div className="recent-meta">
                        <span>
                          <Users size={12} />
                          {s.students}
                        </span>
                        <span className={`status-badge ${s.status.toLowerCase()}`}>
                          {s.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* ── SESSION MODAL ── */}
          {showModal && (
            <SessionModal
              courseId={selectedCourse}
              onClose={onCloseModal}
              onCreate={onStartNow}
              onSchedule={onScheduleSession}
            />
          )}

          {/* ── CREATE COURSE MODAL ── */}
          {showCourseModal && (
            <div className="modal-overlay" onClick={onCloseCourseModal}>
              <div
                className="modal-content"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="modal-header">
                  <h2>Create New Course</h2>
                  <button className="close-btn" onClick={onCloseCourseModal}>
                    <X size={20} />
                  </button>
                </div>
                <CreateCourse
                  onCourseCreated={() => {
                    onFetchCourses();
                    onCloseCourseModal();
                  }}
                />
              </div>
            </div>
          )}

          {/* ── QUIZ MODAL ── */}
          {showQuizPrompt && (
            <>
              {!quizGenerated ? (
                <div
                  className="modal-overlay"
                  onClick={onCloseQuiz}
                >
                  <div
                    className="modal-content"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="modal-header">
                      <h2>Partition Completed</h2>
                      <button className="close-btn" onClick={onCloseQuiz}>
                        <X size={20} />
                      </button>
                    </div>

                    <p>Generate quiz for students or continue session.</p>

                    <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
                      <button
                        className="btn-primary-blue"
                        onClick={onGenerateQuiz}
                        disabled={loadingQuiz}
                      >
                        {loadingQuiz ? "Generating..." : "Generate Quiz"}
                      </button>
                      <button className="btn-primary-blue" onClick={onResume}>
                        Resume Session
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <ProfessorQuizView
                  partitionId={lastPartitionId}
                  onClose={onCloseQuiz}
                />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, label, Icon }) => (
  <div className="stat-card-white">
    <div>
      <span>{title}</span>
      <h2>{value}</h2>
      <small>{label}</small>
    </div>
    <div className="stat-icon-blue">
      <Icon size={20} />
    </div>
  </div>
);

const ActionButton = ({ icon, title, desc, onClick }) => (
  <button className="action-tile-compact" onClick={onClick}>
    <div className="action-icon-wrapper">{icon}</div>
    <div className="action-text">
      <h3>{title}</h3>
      <p>{desc}</p>
    </div>
  </button>
);

export default ProfessorDashboardUI;
