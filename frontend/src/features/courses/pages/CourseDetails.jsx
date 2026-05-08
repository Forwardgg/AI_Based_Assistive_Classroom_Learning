// frontend/src/features/courses/pages/CourseDetails.jsx

import React, { useEffect, useState, useContext } from "react";
import {
  Trash2,
  FileText,
  BarChart2,
  Copy,
  Check,
  CalendarClock,
} from "lucide-react";
import { useParams } from "react-router-dom";
import { getCourses } from "../courseAPI";
import api from "../../../services/api";
import { AuthContext } from "../../auth/AuthContext";
import ProfessorQuizView from "../../quiz/ProfessorQuizView";
import NotesModal from "../../notes/NotesModal";
import { getNotes, generateNotes } from "../../lectures/sessionAPI";

import "./CourseDetails.css";

const CourseDetails = () => {
  const { courseId } = useParams();
  const { user }     = useContext(AuthContext);

  const isStudent   = user?.role === "student";
  const isProfessor = user?.role === "professor";

  const [course, setCourse]     = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading]   = useState(true);

  const [selectedPartition, setSelectedPartition] = useState(null);
  const [showQuiz, setShowQuiz]                   = useState(false);

  const [copied, setCopied] = useState(false);

  const [notesOpen, setNotesOpen]                 = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [notesData, setNotesData]                 = useState(null);

  const [generatingNotesId, setGeneratingNotesId]     = useState(null);
  const [deletingSessionId, setDeletingSessionId]     = useState(null);
  const [deletingPartitionId, setDeletingPartitionId] = useState(null);

  const formatScheduledAt = (iso) => {
    if (!iso) return null;
    return new Date(iso).toLocaleString(undefined, {
      weekday: "short", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  };

  const sessionTitle = (session) =>
    session.name ? session.name : `Session #${session.id}`;

  const partitionLabel = (p) =>
    p.name ? p.name : `Part ${p.partition_index}`;

  const fetchData = async () => {
    setLoading(true);
    try {
      const res   = await getCourses();
      const found = res.data.find((c) => c.id === parseInt(courseId));
      setCourse(found);
      const sessionRes = await api.get(`/courses/${courseId}/sessions`);
      setSessions(sessionRes.data);
    } catch (err) {
      console.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [courseId]);

  const handleCopy = async () => {
    if (!course) return;
    try {
      await navigator.clipboard.writeText(course.class_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) { console.error("Copy failed", err); }
  };

  const handleViewNotes = async (sessionId) => {
    try {
      const res = await getNotes(sessionId);
      if (!res.data.exists) { alert("No notes available yet"); return; }
      setNotesData(res.data);
      setSelectedSessionId(sessionId);
      setNotesOpen(true);
    } catch (err) { console.error(err); }
  };

  const handleGenerateNotes = async (sessionId) => {
    try {
      setGeneratingNotesId(sessionId);
      await generateNotes(sessionId);
      await handleViewNotes(sessionId);
    } catch (err) {
      const msg = err?.response?.data?.message;
      if (msg === "No transcript available") alert("Session is empty");
      else if (msg === "Notes already generated") alert("Notes already generated");
      else alert("Failed to generate notes");
    } finally {
      setGeneratingNotesId(null);
    }
  };

  const handleDeleteCourse = async () => {

  if (
    !window.confirm(
      "Delete this course and all sessions?"
    )
  ) {
    return;
  }

  try {

    await api.delete(`/courses/${courseId}`);

    alert("Course deleted");

    window.location.href = "/dashboard";

  } catch (err) {

    console.error(err);

    alert("Failed to delete course");
  }
};

  const handleDeleteSession = async (sessionId) => {

  if (
    !window.confirm(
      "Delete this session?"
    )
  ) {
    return;
  }

  try {

    setDeletingSessionId(sessionId);

    await api.delete(
      `/sessions/${sessionId}`
    );

    setSessions((prev) =>
      prev.filter(
        (s) => s.id !== sessionId
      )
    );

  } catch (err) {

    console.error(err);

    alert("Failed to delete session");

  } finally {

    setDeletingSessionId(null);
  }
};

  const handleDeletePartition = async (partitionId) => {

  if (
    !window.confirm(
      "Delete this partition?"
    )
  ) {
    return;
  }

  try {

    setDeletingPartitionId(partitionId);

    await api.delete(
      `/sessions/partition/${partitionId}`
    );

    setSessions((prev) =>
      prev.map((session) => ({
        ...session,
        partitions: (
          session.partitions || []
        ).filter(
          (p) => p.id !== partitionId
        )
      }))
    );

  } catch (err) {

    console.error(err);

    alert("Failed to delete partition");

  } finally {

    setDeletingPartitionId(null);
  }
};

  const handleTakeQuiz = async (sessionId) => {

  const session = sessions.find(
    (s) => s.id === sessionId
  );

  if (!session) {
    return;
  }

  // =====================================
  // FULL SESSION QUIZ
  // =====================================

  const fullQuiz = window.confirm(
    "OK = Full Session Quiz\n\nCancel = Choose Partition Quiz"
  );

  // =====================================
  // FULL SESSION
  // =====================================

  if (fullQuiz) {

    try {

      const res = await api.get(
        `/quiz/session/${sessionId}`
      );

      if (
        !res.data.questions?.length
      ) {
        alert(
          "No quiz available yet"
        );

        return;
      }

      // temporary:
      // open first partition quiz modal
      // until full-session UI added

      alert(
        `Loaded ${res.data.questions.length} questions`
      );

    } catch (err) {

      console.error(err);

      alert(
        "Failed to load quiz"
      );
    }

    return;
  }

  // =====================================
  // PARTITION QUIZ
  // =====================================

  const availablePartitions = (
    session.partitions || []
  ).filter((p) => p.id);

  if (
    availablePartitions.length === 0
  ) {

    alert("No partitions found");

    return;
  }

  const partitionId = Number(
    prompt(
      `Enter partition ID:\n\n${availablePartitions
        .map(
          (p) =>
            `${p.id} → ${partitionLabel(p)}`
        )
        .join("\n")}`
    )
  );

  if (!partitionId) {
    return;
  }

  setSelectedPartition(partitionId);

  setShowQuiz(true);
};
  const handleGenerateQuiz = async (sessionId) => {

  const session = sessions.find(
    (s) => s.id === sessionId
  );

  if (!session) {
    return;
  }

  const availablePartitions = (
    session.partitions || []
  );

  if (
    availablePartitions.length === 0
  ) {

    alert("No partitions found");

    return;
  }

  const partitionId = Number(
    prompt(
      `Generate quiz for partition:\n\n${availablePartitions
        .map(
          (p) =>
            `${p.id} → ${partitionLabel(p)}`
        )
        .join("\n")}`
    )
  );

  if (!partitionId) {
    return;
  }

  try {

    await api.post(
      `/sessions/${sessionId}/generate-quiz`,
      {
        partition_id: partitionId
      }
    );

    alert("Quiz generation started");

  } catch (err) {

    console.error(err);

    const msg =
      err?.response?.data?.message;

    if (
      msg === "Quiz already exists"
    ) {

      alert("Quiz already exists");

    } else {

      alert("Failed to generate quiz");
    }
  }
};

  if (loading) return <p>Loading...</p>;
  if (!course)  return <p>Course not found</p>;

  const scheduledSessions = sessions.filter((s) => s.status === "scheduled");
  const otherSessions     = sessions.filter((s) => s.status !== "scheduled");

  return (
    <div className="container">

      {/* HEADER */}
      <header className="header">
        <h1>{course.course_name}</h1>
        <p className="semester-text">{course.semester} {course.year}</p>

        <div className="course-id-row">
          <span className="course-badge">
            {course.class_code}
            {copied
              ? <Check size={14} className="icon-copy" />
              : <Copy size={14} className="icon-copy" onClick={handleCopy} />}
          </span>
        </div>

        {isProfessor && (
          <button className="delete-btn" onClick={handleDeleteCourse}>
            <Trash2 size={16} /> Delete Course
          </button>
        )}
      </header>

      {/* UPCOMING / SCHEDULED */}
      {scheduledSessions.length > 0 && (
        <div className="sessions-list">
          <h2 className="section-heading" style={{ marginBottom: 12 }}>
            <CalendarClock size={18} style={{ marginRight: 6, verticalAlign: "middle" }} />
            Upcoming Sessions
          </h2>

          {scheduledSessions.map((session) => (
            <div key={session.id} className="session-card">
              <div className="session-header">
                <div className="session-title-group">
                  <h2 className="session-title">{sessionTitle(session)}</h2>
                  <span className="status-badge pending">Scheduled</span>
                </div>
                <span className="duration-text">{session.duration_minutes} min</span>
              </div>

              {session.scheduled_at && (
                <p style={{ fontSize: "0.82rem", color: "#64748b", marginBottom: 8 }}>
                  {formatScheduledAt(session.scheduled_at)}
                </p>
              )}

              {session.partitions?.length > 0 && (
                <div className="parts-container">
                  {session.partitions.map((p) => (
                    <div key={p.id} className="part-row">
                      <span className="part-name">
                        {partitionLabel(p)}
                        <span className="part-time"> · {p.start_minute}–{p.end_minute} min</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ACTIVE / COMPLETED SESSIONS */}
      <div className="sessions-list">
        {otherSessions.length === 0 ? (
          <p>No sessions yet</p>
        ) : (
          otherSessions.map((session) => (
            <div key={session.id} className="session-card">

              <div className="session-header">
                <div className="session-title-group">
                  <h2 className="session-title">{sessionTitle(session)}</h2>
                  <span className={`status-badge ${
                    ["active","completed"].includes((session.status||"").toLowerCase())
                      ? (session.status||"").toLowerCase()
                      : "pending"
                  }`}>
                    {session.status}
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span className="duration-text">{session.duration_minutes} min</span>
                  {isProfessor && (
                    <button
                      className="danger-icon-btn"
                      title="Delete session"
                      onClick={() => handleDeleteSession(session.id)}
                      disabled={deletingSessionId === session.id}
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>

              <div className="action-buttons">
                <button className="secondary-btn" onClick={() => handleViewNotes(session.id)}>
                  <FileText size={16} /> View Notes
                </button>

                {isProfessor && (
                  <button
                    className="secondary-btn"
                    onClick={() => handleGenerateNotes(session.id)}
                    disabled={generatingNotesId === session.id}
                  >
                    <FileText size={16} />
                    {generatingNotesId === session.id ? "Generating..." : "Generate Notes"}
                  </button>
                )}

                <button className="secondary-btn" onClick={() => handleTakeQuiz(session.id)}>
                  <BarChart2 size={16} /> Take Quiz
                </button>

                {isProfessor && (
                  <button className="secondary-btn" onClick={() => handleGenerateQuiz(session.id)}>
                    <BarChart2 size={16} /> Generate Quiz
                  </button>
                )}
              </div>

              <div className="parts-container">
                {session.partitions?.map((p) => (
                  <div key={p.id} className="part-row">
                    <span className="part-name">
                      {partitionLabel(p)}
                      <span className="part-time"> · {p.start_minute}–{p.end_minute} min</span>
                    </span>

                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <button
                        className="view-quiz-btn"
                        onClick={() => { setSelectedPartition(p.id); setShowQuiz(true); }}
                      >
                        <FileText size={14} /> View Quiz
                      </button>

                      {isProfessor && (
                        <button
                          className="view-quiz-btn danger"
                          onClick={() => handleDeletePartition(p.id)}
                          disabled={deletingPartitionId === p.id}
                        >
                          <Trash2 size={14} />
                          {deletingPartitionId === p.id ? "..." : "Delete"}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

            </div>
          ))
        )}
      </div>

      <NotesModal
        open={notesOpen}
        onClose={() => setNotesOpen(false)}
        notes={notesData}
        sessionId={selectedSessionId}
        isProfessor={isProfessor}
      />

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
