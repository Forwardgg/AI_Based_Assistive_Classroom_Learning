import { useState } from "react";
import "./SessionModal.css";

const SessionModal = ({ courseId, onClose, onCreate, onSchedule }) => {

  const [sessionName, setSessionName] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");

  const [duration, setDuration] = useState(60);

  const [mode, setMode] = useState("partitioned");

  const [partitionCount, setPartitionCount] = useState(3);

  const [partitionNames, setPartitionNames] = useState([
    "",
    "",
    ""
  ]);

  // =====================================================
  // Keep partition names synced
  // =====================================================

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

  // =====================================================
  // Build payload
  // =====================================================

  const buildPayload = () => {

    if (duration <= 0) {
      alert("Duration must be greater than 0");
      return null;
    }

    // =========================================
    // FLUID MODE
    // =========================================

    if (mode === "fluid") {

      return {
        course_id: courseId,
        duration_minutes: duration,
        name: sessionName.trim() || null,
        mode: "fluid",
        partitions: []
      };
    }

    // =========================================
    // PARTITIONED MODE
    // =========================================

    if (partitionCount <= 0) {
      alert("Partitions must be greater than 0");
      return null;
    }

    if (partitionCount > duration) {
      alert("Partitions cannot exceed duration");
      return null;
    }

    if (duration % partitionCount !== 0) {
      alert(
        "Duration must be divisible by partition count"
      );
      return null;
    }

    const partitionLength = Math.floor(
      duration / partitionCount
    );

    const partitionsArray = Array.from(
      { length: partitionCount },
      (_, i) => ({
        start_minute: i * partitionLength,
        end_minute: (i + 1) * partitionLength,
        name: partitionNames[i]?.trim() || null
      })
    );

    return {
      course_id: courseId,
      duration_minutes: duration,
      name: sessionName.trim() || null,
      mode: "partitioned",
      partitions: partitionsArray
    };
  };

  // =====================================================
  // Start now
  // =====================================================

  const handleStartNow = () => {

    const payload = buildPayload();

    if (!payload) return;

    onCreate({
      ...payload,
      scheduled_at: null
    });
  };

  // =====================================================
  // Schedule
  // =====================================================

  const handleSchedule = () => {

    const payload = buildPayload();

    if (!payload) return;

    if (!scheduledAt) {
      alert("Please select a schedule time");
      return;
    }

    onSchedule({
      ...payload,
      scheduled_at: scheduledAt
    });
  };

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="modal-overlay">
      <div className="modal">

        <h2>Create Session</h2>

        {/* Session Name */}
        <label>
          Session Name
          <span className="optional">
            (optional)
          </span>
        </label>

        <input
          type="text"
          placeholder="e.g. Graph Algorithms"
          value={sessionName}
          onChange={(e) =>
            setSessionName(e.target.value)
          }
        />

        {/* Mode */}
        <label>Session Mode</label>

        <select
          value={mode}
          onChange={(e) => setMode(e.target.value)}
        >
          <option value="partitioned">
            Fixed Partitions
          </option>

          <option value="fluid">
            Fluid Segments (Professor Controlled)
          </option>
        </select>

        {/* Duration */}
        <label>Total Duration (minutes)</label>

        <input
          type="number"
          min="1"
          value={duration}
          onChange={(e) =>
            setDuration(Number(e.target.value))
          }
        />

        {/* ========================================= */}
        {/* PARTITIONED MODE ONLY */}
        {/* ========================================= */}

        {mode === "partitioned" && (
          <>
            {/* Partition Count */}
            <label>Number of Partitions</label>

            <input
              type="number"
              min="1"
              value={partitionCount}
              onChange={(e) =>
                handlePartitionCountChange(
                  e.target.value
                )
              }
            />

            {/* Partition Names */}
            {partitionCount > 0 && (
              <div className="partition-names-section">

                <label>
                  Partition Names
                  <span className="optional">
                    (optional)
                  </span>
                </label>

                {Array.from(
                  { length: partitionCount },
                  (_, i) => (
                    <input
                      key={i}
                      type="text"
                      placeholder={`Partition ${i + 1}`}
                      value={partitionNames[i] ?? ""}
                      onChange={(e) =>
                        handlePartitionNameChange(
                          i,
                          e.target.value
                        )
                      }
                    />
                  )
                )}
              </div>
            )}
          </>
        )}

        {/* ========================================= */}
        {/* FLUID MODE INFO */}
        {/* ========================================= */}

        {mode === "fluid" && (
          <div className="fluid-info">

            <p>
              Segments will be created dynamically
              during teaching.
            </p>

            <p>
              The professor can manually end segments
              and generate quizzes live.
            </p>

          </div>
        )}

        {/* Schedule */}
        <label>
          Schedule For
          <span className="optional">
            (optional – leave blank to start now)
          </span>
        </label>

        <input
          type="datetime-local"
          value={scheduledAt}
          onChange={(e) =>
            setScheduledAt(e.target.value)
          }
        />

        {/* Buttons */}
        <div className="modal-buttons">

          <button
            className="btn-cancel"
            onClick={onClose}
          >
            Cancel
          </button>

          {onSchedule && (
            <button
              className="btn-schedule"
              onClick={handleSchedule}
            >
              Schedule
            </button>
          )}

          <button
            className="btn-start"
            onClick={handleStartNow}
          >
            Start Now
          </button>

        </div>

      </div>
    </div>
  );
};

export default SessionModal;