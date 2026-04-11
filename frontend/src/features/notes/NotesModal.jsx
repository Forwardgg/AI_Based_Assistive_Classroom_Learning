import { useState, useEffect } from "react";
import "./NotesModal.css";
import { updateNotes } from "../lectures/sessionAPI";

const NotesModal = ({ open, onClose, notes, sessionId, isProfessor }) => {
  const [editMode, setEditMode] = useState(false);
  const [text, setText] = useState("");

  useEffect(() => {
    if (notes?.summary_text) {
      setText(notes.summary_text);
    }
  }, [notes]);

  if (!open) return null;

  const handleSave = async () => {
    try {
      await updateNotes(sessionId, { summary_text: text });
      setEditMode(false);
    } catch (err) {
      console.error("Failed to update notes", err);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `session_${sessionId}_notes.txt`;
    a.click();

    URL.revokeObjectURL(url);
  };

  return (
    <div className="notes-modal-overlay">
      <div className="notes-modal">

        <div className="notes-header">
          <h2>Lecture Notes</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="notes-content">
          {editMode ? (
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="notes-textarea"
            />
          ) : (
            <pre className="notes-text">
              {text || "No notes available"}
            </pre>
          )}
        </div>

        <div className="notes-actions">
          <button onClick={handleDownload}>Download TXT</button>

          {isProfessor && !editMode && (
            <button onClick={() => setEditMode(true)}>Edit</button>
          )}

          {isProfessor && editMode && (
            <>
              <button onClick={handleSave}>Save</button>
              <button onClick={() => setEditMode(false)}>Cancel</button>
            </>
          )}
        </div>

      </div>
    </div>
  );
};

export default NotesModal;