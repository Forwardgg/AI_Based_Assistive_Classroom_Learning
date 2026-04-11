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
import NotesModal from "../../notes/NotesModal";
import {
  getNotes,
  generateNotes,
} from "../../lectures/sessionAPI";

import "./CourseDetails.css";

const CourseDetails = () => {
  const { courseId } = useParams();
  const { user } = useContext(AuthContext);

  const isStudent = user?.role === "student";
  const isProfessor = user?.role === "professor";

  const [course, setCourse] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedPartition, setSelectedPartition] = useState(null);
  const [showQuiz, setShowQuiz] = useState(false);

  // ✅ NOTES STATE
  const [notesOpen, setNotesOpen] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [notesData, setNotesData] = useState(null);

  // ✅ LOADING STATE
  const [generatingNotesId, setGeneratingNotesId] = useState(null);

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
      const res = await getNotes(sessionId);

      if (!res.data.exists) {
        alert("No notes available yet");
        return;
      }

      setNotesData(res.data);
      setSelectedSessionId(sessionId);
      setNotesOpen(true);
    } catch (err) {
      console.error(err);
    }
  };

  // =========================
  // GENERATE NOTES
  // =========================
  const handleGenerateNotes = async (sessionId) => {
    try {
      setGeneratingNotesId(sessionId);

      await generateNotes(sessionId);

      await handleViewNotes(sessionId);
    } catch (err) {
      const msg = err?.response?.data?.message;

      if (msg === "No transcript available") {
        alert("Session is empty");
      } else if (msg === "Notes already generated") {
        alert("Notes already generated");
      } else {
        alert("Failed to generate notes");
      }

      console.error(err);
    } finally {
      setGeneratingNotesId(null);
    }
  };

  // =========================
  // DELETE COURSE
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
                      ["active", "completed"].includes(
                        (session.status || "").toLowerCase()
                      )
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
                {/* VIEW NOTES */}
                <button
                  className="secondary-btn"
                  onClick={() => handleViewNotes(session.id)}
                >
                  <FileText size={16} /> View Notes
                </button>

                {/* GENERATE NOTES */}
                {isProfessor && (
                  <button
                    className="secondary-btn"
                    onClick={() => handleGenerateNotes(session.id)}
                    disabled={generatingNotesId === session.id}
                  >
                    <FileText size={16} />
                    {generatingNotesId === session.id
                      ? "Generating..."
                      : "Generate Notes"}
                  </button>
                )}

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
      <NotesModal
        open={notesOpen}
        onClose={() => setNotesOpen(false)}
        notes={notesData}
        sessionId={selectedSessionId}
        isProfessor={isProfessor}
      />

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