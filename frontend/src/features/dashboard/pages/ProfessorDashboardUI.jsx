// frontend/src/features/dashboard/pages/ProfessorDashboardUI.jsx
import React, { useState, useMemo } from "react";
import {
  BookOpen, Users, Clock, Brain, Plus, FileText, BarChart3,
  Pause, Play, Square, Search, X, Library
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import CreateCourse from "../../courses/pages/CreateCourse";
import SessionModal from "../../lectures/pages/SessionModal";
import ProfessorQuizView from "../../quiz/ProfessorQuizView";
import "./ProfessorDashboardUI.css";

const ProfessorDashboardUI = (props) => {
  const {
    courses, loading, activeCourse, sessionStatus, currentPartition, timeLeft,
    showModal, showCourseModal, selectedCourse, showQuizPrompt, lastPartitionId,
    quizGenerated, loadingQuiz, onStartSession, onPause, onResume, onStop,
    onGenerateQuiz, onCreateSession, onCloseModal, onOpenCourseModal,
    onCloseCourseModal, onFetchCourses, onCloseQuiz
  } = props;

  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  // =========================
  // FILTER COURSES
  // =========================
  const filteredCourses = courses.filter(course =>
    course.course_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.class_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // =========================
  // STATS (REAL DATA)
  // =========================
  const stats = useMemo(() => {
    const totalSessions = courses.reduce((sum, c) => sum + (c.sessions_count || 0), 0);
    const totalStudents = courses.reduce((sum, c) => sum + (c.students_count || 0), 0);

    return {
      totalSessions,
      totalStudents
    };
  }, [courses]);

  // =========================
  // RECENT SESSIONS (DERIVED)
  // =========================
  const recentSessions = useMemo(() => {
    const sessions = [];

    courses.forEach(course => {
      if (course.last_session) {
        sessions.push({
          id: course.id,
          name: course.course_name,
          time: course.last_session,
          students: course.students_count || 0,
          status: course.live ? "Active" : "Completed"
        });
      }
    });

    return sessions.slice(0, 5);
  }, [courses]);

  return (
    <div className="professor-dashboard-ui-root">
      <div className="dashboard-container">
        <main className="main-content">

          {/* LIVE BAR */}
          {(sessionStatus === "active" || sessionStatus === "paused") && (
            <div className={`session-control-bar ${sessionStatus}`}>
              <div className="session-bar-info">
                <div className="pulse-indicator"></div>
                <strong>Live Session: Partition {currentPartition}</strong>
                <span className="timer-display">
                  <Clock size={16} /> {timeLeft !== null ? `${timeLeft}s` : "--"}
                </span>
              </div>

              <div className="session-bar-actions">
                {sessionStatus === "paused" ? (
                  <button className="bar-btn resume" onClick={onResume}>
                    <Play size={18}/> Resume
                  </button>
                ) : (
                  <button className="bar-btn pause" onClick={onPause}>
                    <Pause size={18}/> Pause
                  </button>
                )}
                <button className="bar-btn stop" onClick={onStop}>
                  <Square size={18}/> Stop
                </button>
              </div>
            </div>
          )}

          {/* HEADER */}
          <header className="greeting">
            <h1>Good morning, Professor</h1>
            <p>Here's an overview of your lecture activity.</p>
          </header>

          {/* STATS */}
          <div className="stats-row">
            <StatCard title="Total Sessions" value={stats.totalSessions} label="Across courses" Icon={BookOpen} />
            <StatCard title="Active Students" value={stats.totalStudents} label="Across courses" Icon={Users} />
            <StatCard title="Courses" value={courses.length} label="You teach" Icon={Library} />
            <StatCard title="Live Sessions" value={courses.filter(c => c.live).length} label="Right now" Icon={Brain} />
          </div>

          <div className="dashboard-layout-stack">
            <div className="dual-grid-row">

              {/* COURSES */}
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
                  {filteredCourses.map((course) => (
                    <div key={course.id} className="course-row-simple">
                      <div className="course-info">
                        <h3>{course.course_name}</h3>
                        <p>{course.class_code}</p>
                      </div>

                      {activeCourse === course.id && sessionStatus !== "completed" ? (
                        <div className="session-controls">
                          {sessionStatus === "active" && (
                            <button onClick={onPause} className="btn-icon-only"><Pause size={14}/></button>
                          )}
                          {sessionStatus === "paused" && (
                            <button onClick={onResume} className="btn-icon-only"><Play size={14}/></button>
                          )}
                          <button onClick={onStop} className="btn-icon-only stop"><Square size={14}/></button>
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
                  ))}
                </div>
              </div>

              {/* ACTIONS */}
              <aside className="content-card flex-column">
                <h2>Quick Actions</h2>
                <div className="actions-grid-compact">
                  <ActionButton icon={<Plus size={18} />} title="Create Course" desc="Add new" onClick={onOpenCourseModal} />
                  <ActionButton icon={<FileText size={18} />} title="Notes" desc="PDFs" onClick={() => navigate("/dashboard/professor/courses")} />
                  <ActionButton icon={<Library size={18} />} title="Quiz" desc="AI & Custom" onClick={() => navigate("/dashboard/professor/courses")} />
                  <ActionButton icon={<BarChart3 size={18} />} title="Analytics" desc="Insights" onClick={() => navigate("/dashboard/professor/analytics")} />
                </div>
              </aside>
            </div>

            {/* RECENT SESSIONS */}
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
                        <span><Users size={12}/> {s.students}</span>
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

          {/* MODALS (UNCHANGED) */}
          {showModal && (
            <SessionModal
              courseId={selectedCourse}
              onClose={onCloseModal}
              onCreate={onCreateSession}
            />
          )}

          {showCourseModal && (
            <div className="modal-overlay" onClick={onCloseCourseModal}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>Create New Course</h2>
                  <button className="close-btn" onClick={onCloseCourseModal}>
                    <X size={20} />
                  </button>
                </div>
                <CreateCourse onCourseCreated={() => {
                  onFetchCourses();
                  onCloseCourseModal();
                }} />
              </div>
            </div>
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
    <div className="stat-icon-blue"><Icon size={20}/></div>
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