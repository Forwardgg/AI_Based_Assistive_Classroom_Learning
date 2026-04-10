import React, { useEffect, useState, useContext } from "react";
import {
  Trash2,
  FileText,
  BarChart2,
  Copy,
} from "lucide-react";
import { useParams } from "react-router-dom";
import { getCourses } from "../courseAPI";
import api from "../../../services/api";
import { AuthContext } from "../../auth/AuthContext";
import ProfessorQuizView from "../../quiz/ProfessorQuizView";
import "./CourseDetails.css";

const CourseDetails = () => {
  const { courseId } = useParams();
  const { user } = useContext(AuthContext);

  const isStudent = user?.role === "student";

  const [course, setCourse] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [notes, setNotes] = useState(null);
  const [selectedPartition, setSelectedPartition] = useState(null);
  const [showQuiz, setShowQuiz] = useState(false);

  // =========================
  // FETCH DATA
  // =========================
  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getCourses();

      const found = res.data.find(
        (c) => c.id === parseInt(courseId)
      );

      setCourse(found);

      const sessionRes = await api.get(`/courses/${courseId}/sessions`);
      setSessions(sessionRes.data);
    } catch (err) {
      console.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [courseId]);

  // =========================
  // COPY CODE
  // =========================
  const handleCopy = () => {
    if (!course) return;
    navigator.clipboard.writeText(course.class_code);
  };

  // =========================
  // VIEW NOTES
  // =========================
  const handleViewNotes = async (sessionId) => {
    try {
      const res = await api.get(`/sessions/${sessionId}/notes`);
      setNotes(res.data.summary_text);
    } catch {
      alert("No notes available yet");
    }
  };

  // =========================
  // DELETE COURSE (placeholder)
  // =========================
  const handleDelete = () => {
    alert("Delete functionality not implemented yet");
  };

  if (loading) return <p>Loading...</p>;
  if (!course) return <p>Course not found</p>;

  return (
    <div className="container">
      {/* HEADER */}
      <header className="header">
        <h1>{course.course_name}</h1>
        <p className="semester-text">
          {course.semester} {course.year}
        </p>

        <div className="course-id-row">
          <span className="course-badge">
            {course.class_code}
            <Copy size={14} className="icon-copy" onClick={handleCopy} />
          </span>
        </div>

        {!isStudent && (
          <button className="delete-btn" onClick={handleDelete}>
            <Trash2 size={16} /> Delete Course
          </button>
        )}
      </header>

      {/* SESSIONS */}
      <div className="sessions-list">
        {sessions.length === 0 ? (
          <p>No sessions yet</p>
        ) : (
          sessions.map((session) => (
            <div key={session.id} className="session-card">
              <div className="session-header">
                <div className="session-title-group">
                  <h2 className="session-title">
                    Session #{session.id}
                  </h2>
                  <span
                    className={`status-badge ${
  ["active", "completed"].includes((session.status || "").toLowerCase())
    ? (session.status || "").toLowerCase()
    : "pending"
}`}
                  >
                    {session.status}
                  </span>
                </div>

                <span className="duration-text">
                  {session.duration_minutes} min
                </span>
              </div>

              {/* ACTIONS */}
              <div className="action-buttons">
                <button
                  className="secondary-btn"
                  onClick={() => handleViewNotes(session.id)}
                >
                  <FileText size={16} /> View Notes
                </button>

                {!isStudent && (
                  <button className="secondary-btn">
                    <BarChart2 size={16} /> Generate Report
                  </button>
                )}
              </div>

              {/* PARTITIONS */}
              <div className="parts-container">
                {session.partitions?.map((p) => (
                  <div key={p.id} className="part-row">
                    <span className="part-name">
                      Part {p.partition_index}
                      <span className="part-time">
                        {" "}
                        · {p.start_minute} - {p.end_minute} min
                      </span>
                    </span>

                    <button
                      className="view-quiz-btn"
                      onClick={() => {
                        setSelectedPartition(p.id);
                        setShowQuiz(true);
                      }}
                    >
                      <FileText size={14} /> View Quiz
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* NOTES MODAL */}
      {notes && (
        <div className="notes-modal">
          <div className="notes-content">
            <h3>Lecture Notes</h3>
            <pre>{notes}</pre>
            <button onClick={() => setNotes(null)}>Close</button>
          </div>
        </div>
      )}

      {/* QUIZ VIEW */}
      {showQuiz && (
        <ProfessorQuizView
          partitionId={selectedPartition}
          onClose={() => setShowQuiz(false)}
        />
      )}
    </div>
  );
};

export default CourseDetails;