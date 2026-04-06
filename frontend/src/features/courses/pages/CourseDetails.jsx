import { useEffect, useState, useContext } from "react";
import { useParams } from "react-router-dom";
import { getCourses } from "../courseAPI";
import SessionModal from "../../lectures/pages/SessionModal";
import ProfessorQuizView from "../../quiz/ProfessorQuizView";
import api from "../../../services/api";
import { AuthContext } from "../../auth/AuthContext"; // ✅ NEW
import "./CourseDetails.css";

const CourseDetails = () => {
  const { courseId } = useParams();
  const { user } = useContext(AuthContext); // ✅ NEW

  const isStudent = user?.role === "student"; // ✅ NEW

  const [course, setCourse] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);

  const [selectedPartition, setSelectedPartition] = useState(null);
  const [showQuiz, setShowQuiz] = useState(false);

  const [notes, setNotes] = useState(null);

  // =========================
  // FETCH COURSE + SESSIONS
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
    alert("Class code copied!");
  };

  // =========================
  // VIEW NOTES
  // =========================
  const handleViewNotes = async (sessionId) => {
    try {
      const res = await api.get(`/sessions/${sessionId}/notes`);
      setNotes(res.data.summary_text);
    } catch (err) {
      alert("No notes available yet");
    }
  };

  if (loading) return <p>Loading...</p>;
  if (!course) return <p>Course not found</p>;

  return (
    <div className="course-details-container">

      {/* HEADER */}
      <div className="course-header">
        <h1>{course.course_name}</h1>
        <p className="meta">
          {course.semester} {course.year}
        </p>

        <div className="course-code-box">
          <span>Class Code: {course.class_code}</span>

          {/* 👇 Only professor should copy */}
          {!isStudent && (
            <button className="btn btn-copy" onClick={handleCopy}>
              Copy
            </button>
          )}
        </div>
      </div>

      {/* ACTION */}
      {!isStudent && (
        <div className="course-actions">
          <button
            className="btn btn-start"
            onClick={() => setShowModal(true)}
          >
            Start New Session
          </button>
        </div>
      )}

      {/* =========================
          SESSION HISTORY
      ========================= */}
      <div className="sessions-section">
        <h2>Session History</h2>

        {sessions.length === 0 ? (
          <p className="empty-state">No sessions yet</p>
        ) : (
          sessions.map((session) => (
            <div key={session.id} className="session-card">

              <div className="session-header">
                <h3>Session #{session.id}</h3>
                <span className={`status ${session.status}`}>
                  {session.status}
                </span>
              </div>

              <p>Duration: {session.duration_minutes} mins</p>

              {/* SESSION ACTIONS */}
              <div className="session-actions">

                <button
                  className="btn btn-notes"
                  onClick={() => handleViewNotes(session.id)}
                >
                  View Notes
                </button>

                {/* 👇 Only professor */}
                {!isStudent && (
                  <button className="btn btn-report">
                    Generate Report
                  </button>
                )}

              </div>

              {/* =========================
                  PARTITIONS
              ========================= */}
              <div className="partition-list">
                <h4>Partitions</h4>

                {session.partitions?.map((p) => (
                  <div key={p.id} className="partition-card">

                    <span>
                      Part {p.partition_index} ({p.start_minute}–{p.end_minute} min)
                    </span>

                    <button
                      className="btn btn-quiz"
                      onClick={() => {
                        setSelectedPartition(p.id);
                        setShowQuiz(true);
                      }}
                    >
                      View Quiz
                    </button>

                  </div>
                ))}

              </div>

            </div>
          ))
        )}
      </div>

      {/* =========================
          NOTES MODAL
      ========================= */}
      {notes && (
        <div className="notes-modal">
          <div className="notes-content">
            <h3>Lecture Notes</h3>
            <pre>{notes}</pre>
            <button onClick={() => setNotes(null)}>Close</button>
          </div>
        </div>
      )}

      {/* =========================
          QUIZ VIEW
      ========================= */}
      {showQuiz && (
        <ProfessorQuizView
          partitionId={selectedPartition}
          onClose={() => setShowQuiz(false)}
        />
      )}

      {/* =========================
          SESSION MODAL (PROF ONLY)
      ========================= */}
      {!isStudent && showModal && (
        <SessionModal
          courseId={course.id}
          onClose={() => setShowModal(false)}
          onCreate={() => setShowModal(false)}
        />
      )}

    </div>
  );
};

export default CourseDetails;