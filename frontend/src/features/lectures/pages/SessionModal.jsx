import { useState } from "react";
import "./SessionModal.css";

const SessionModal = ({ courseId, onClose, onCreate }) => {
  const [duration, setDuration] = useState(60);
  const [partitions, setPartitions] = useState(3);

  const handleSubmit = () => {
    // Validation
    if (duration <= 0 || partitions <= 0) {
      alert("Duration and partitions must be greater than 0");
      return;
    }

    if (partitions > duration) {
      alert("Partitions cannot be greater than total duration");
      return;
    }

    if (duration % partitions !== 0) {
      alert("Duration must be divisible by partitions (no decimals allowed)");
      return;
    }

    const partitionLength = duration / partitions;
    const partitionArray = [];

    for (let i = 0; i < partitions; i++) {
      partitionArray.push({
        start_minute: i * partitionLength,
        end_minute: (i + 1) * partitionLength,
      });
    }

    onCreate({
      course_id: courseId,
      duration_minutes: duration,
      partitions: partitionArray,
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>Create Session</h2>

        <label>Total Duration (minutes)</label>
        <input
          type="number"
          min="1"
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
        />

        <label>Number of Partitions</label>
        <input
          type="number"
          min="1"
          value={partitions}
          onChange={(e) => setPartitions(Number(e.target.value))}
        />

        <div className="modal-buttons">
          <button onClick={onClose}>Cancel</button>
          <button onClick={handleSubmit}>Start Session</button>
        </div>
      </div>
    </div>
  );
};

export default SessionModal;