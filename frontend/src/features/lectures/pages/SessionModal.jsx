// frontend/src/features/lectures/pages/SessionModal.jsx

import { useState } from "react";
import "./SessionModal.css";

const SessionModal = ({ courseId, onClose, onCreate, onSchedule }) => {
  const [sessionName, setSessionName]     = useState("");
  const [scheduledAt, setScheduledAt]     = useState("");
  const [duration, setDuration]           = useState(60);
  const [partitionCount, setPartitionCount] = useState(3);
  const [partitionNames, setPartitionNames] = useState(["", "", ""]);

  // Keep partition names array in sync with count
  const handlePartitionCountChange = (val) => {
    const count = Math.max(1, Number(val));
    setPartitionCount(count);
    setPartitionNames((prev) =>
      Array.from({ length: count }, (_, i) => prev[i] ?? "")
    );
  };

  const handlePartitionNameChange = (index, value) => {
    setPartitionNames((prev) => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  };

  const buildPayload = () => {
    if (duration <= 0 || partitionCount <= 0) {
      alert("Duration and partitions must be greater than 0");
      return null;
    }
    if (partitionCount > duration) {
      alert("Partitions cannot be greater than total duration");
      return null;
    }
    if (duration % partitionCount !== 0) {
      alert("Duration must be divisible by number of partitions (no decimals)");
      return null;
    }

    const partitionLength = Math.floor(duration / partitionCount);
    const partitionsArray = Array.from({ length: partitionCount }, (_, i) => ({
      start_minute: i * partitionLength,
      end_minute:   (i + 1) * partitionLength,
      name:         partitionNames[i]?.trim() || null,
    }));

    return {
      course_id:        courseId,
      duration_minutes: duration,
      name:             sessionName.trim() || null,
      partitions:       partitionsArray,
    };
  };

  const handleStartNow = () => {
    const payload = buildPayload();
    if (!payload) return;
    // Ignore scheduled_at for immediate start
    onCreate({ ...payload, scheduled_at: null });
  };

  const handleSchedule = () => {
    const payload = buildPayload();
    if (!payload) return;
    if (!scheduledAt) {
      alert("Please pick a date and time to schedule the session.");
      return;
    }
    onSchedule({ ...payload, scheduled_at: scheduledAt });
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>Create Session</h2>

        {/* Session name */}
        <label>Session Name <span className="optional">(optional)</span></label>
        <input
          type="text"
          placeholder="e.g. Week 3 – Sorting Algorithms"
          value={sessionName}
          onChange={(e) => setSessionName(e.target.value)}
        />

        {/* Duration */}
        <label>Total Duration (minutes)</label>
        <input
          type="number"
          min="1"
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
        />

        {/* Partition count */}
        <label>Number of Partitions</label>
        <input
          type="number"
          min="1"
          value={partitionCount}
          onChange={(e) => handlePartitionCountChange(e.target.value)}
        />

        {/* Per-partition names */}
        {partitionCount > 0 && (
          <div className="partition-names-section">
            <label>
              Partition Names <span className="optional">(optional)</span>
            </label>
            {Array.from({ length: partitionCount }, (_, i) => (
              <input
                key={i}
                type="text"
                placeholder={`Partition ${i + 1}`}
                value={partitionNames[i] ?? ""}
                onChange={(e) => handlePartitionNameChange(i, e.target.value)}
              />
            ))}
          </div>
        )}

        {/* Schedule datetime */}
        <label>
          Schedule For <span className="optional">(optional – leave blank to start now)</span>
        </label>
        <input
          type="datetime-local"
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
        />

        <div className="modal-buttons">
          <button className="btn-cancel" onClick={onClose}>
            Cancel
          </button>

          {onSchedule && (
            <button className="btn-schedule" onClick={handleSchedule}>
              Schedule
            </button>
          )}

          <button className="btn-start" onClick={handleStartNow}>
            Start Now
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionModal;
