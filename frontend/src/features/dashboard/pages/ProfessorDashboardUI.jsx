// frontend/src/features/dashboard/pages/ProfessorDashboardUI.jsx
import React, { useState } from "react";
import {
  BookOpen, Users, Clock, Brain, Plus, FileText, BarChart3,
  Pause, Play, Square, Search, X, Library
} from "lucide-react";

import CreateCourse from "../../courses/pages/CreateCourse";
import SessionModal from "../../lectures/pages/SessionModal";
import ProfessorQuizView from "../../quiz/ProfessorQuizView";
import "./ProfessorDashboardUI.css";

const ProfessorDashboardUI = ({
  courses, loading, activeCourse, sessionStatus, currentPartition, timeLeft,
  showModal, showCourseModal, selectedCourse, showQuizPrompt, lastPartitionId, 
  quizGenerated, loadingQuiz, onStartSession, onPause, onResume, onStop, 
  onGenerateQuiz, onCreateSession, onCloseModal, onOpenCourseModal, 
  onCloseCourseModal, onFetchCourses, onCloseQuiz 
}) => {

  const [searchTerm, setSearchTerm] = useState("");

  const filteredCourses = courses.filter(course =>
    course.course_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.class_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const recentSessions = [
    { id: 1, name: "Data Structures – Lecture 12", time: "Today, 10:00 AM", duration: "50 min", students: 42, status: "Active" },
    { id: 2, name: "Algorithms – Lecture 8", time: "Yesterday, 2:00 PM", duration: "45 min", students: 38, status: "Completed" },
    { id: 3, name: "Data Structures – Lecture 11", time: "Apr 6, 10:00 AM", duration: "50 min", students: 40, status: "Completed" },
    { id: 4, name: "Algorithms – Lecture 7", time: "Apr 5, 2:00 PM", duration: "45 min", students: 35, status: "Completed" },
  ];

  return (
    <div className="professor-dashboard-ui-root"> {/* THE FIREWALL WRAPPER */}
      <div className="dashboard-container">
        <main className="main-content">

          {/* --- LIVE SESSION BAR --- */}
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

          {/* Greeting Section */}
          <header className="greeting">
            <h1>Good morning, Professor</h1>
            <p>Here's an overview of your lecture activity.</p>
          </header>

          {/* Stats Grid */}
          <div className="stats-row">
            <StatCard title="Total Sessions" value="24" label="This semester" Icon={BookOpen} />
            <StatCard title="Active Students" value="127" label="Across courses" Icon={Users} />
            <StatCard title="Avg Duration" value="48m" label="Per session" Icon={Clock} />
            <StatCard title="Quiz Accuracy" value="73%" label="Class avg" Icon={Brain} />
          </div>

          <div className="dashboard-layout-stack">
            <div className="dual-grid-row">

              {/* MAIN COLUMN: YOUR COURSES */}
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

              {/* SIDE COLUMN: QUICK ACTIONS */}
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
                  />
                  <ActionButton 
                    icon={<Library size={18} />} 
                    title="Quiz Library" 
                    desc="AI & Custom" 
                  />
                  <ActionButton 
                    icon={<BarChart3 size={18} />} 
                    title="Analytics" 
                    desc="Insights" 
                  />
                </div>
              </aside>
            </div>

            {/* RECENT SESSIONS LIST */}
            <div className="content-card full-width-sessions">
              <h2>Recent Sessions</h2>
              <div className="recent-list-horizontal">
                {recentSessions.map((s) => (
                  <div key={s.id} className="recent-row">
                    <div className="recent-info">
                      <h3>{s.name}</h3>
                      <p>{s.time}</p>
                    </div>
                    <div className="recent-meta">
                      <span><Clock size={12}/> {s.duration}</span>
                      <span><Users size={12}/> {s.students}</span>
                      <span className={`status-badge ${s.status.toLowerCase()}`}>
                        {s.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Modals remain same as they are often globally positioned */}
          {showQuizPrompt && (
            <div className="quiz-popup-bar">
              <div className="quiz-popup-content">
                <span>Partition complete</span>
                {loadingQuiz && <span>Generating quiz...</span>}
                {!quizGenerated && !loadingQuiz && (
                  <button className="quiz-btn" onClick={onGenerateQuiz}>
                    Generate Quiz
                  </button>
                )}
                {quizGenerated && <span className="quiz-ready">Quiz Ready</span>}
                <button className="quiz-btn secondary" onClick={onResume}>
                  Resume
                </button>
              </div>
              {quizGenerated && (
                <div className="quiz-view-wrapper">
                  <ProfessorQuizView
                    partitionId={lastPartitionId}
                    onClose={onCloseQuiz}
                  />
                </div>
              )}
            </div>
          )}

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