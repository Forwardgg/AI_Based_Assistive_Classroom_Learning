import { useEffect, useState } from "react";
import api from "../../../services/api";
import "./StudentResults.css"; // ✅ add this (you’ll create later)

const StudentResults = () => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  // =========================
  // FETCH STUDENT RESULTS
  // =========================
  useEffect(() => {
    const fetchResults = async () => {
      setLoading(true);
      try {
        const res = await api.get("/analytics/student/me");

        // sort latest sessions first
        const sorted = res.data.sort(
          (a, b) => b.session_id - a.session_id
        );

        setResults(sorted);
      } catch (err) {
        console.error("Failed to fetch results");
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, []);

  // =========================
  // COMPUTE OVERALL STATS
  // =========================
  const totalAttempted = results.reduce(
    (sum, r) => sum + r.attempted,
    0
  );

  const totalCorrect = results.reduce(
    (sum, r) => sum + r.correct,
    0
  );

  const overallAccuracy =
    totalAttempted > 0 ? totalCorrect / totalAttempted : 0;

  return (
    <div className="results-container">
      <h1 className="results-title">My Results</h1>

      {/* =========================
          OVERALL STATS
      ========================= */}
      <div className="results-summary">
        <h2>Overall Performance</h2>

        <div className="stats-grid">
          <div className="stat-card">
            <span>Accuracy</span>
            <h3>{(overallAccuracy * 100).toFixed(1)}%</h3>
          </div>

          <div className="stat-card">
            <span>Total Attempted</span>
            <h3>{totalAttempted}</h3>
          </div>

          <div className="stat-card">
            <span>Total Correct</span>
            <h3>{totalCorrect}</h3>
          </div>
        </div>
      </div>

      {/* =========================
          SESSION RESULTS
      ========================= */}
      <div className="session-results">
        <h2>Session Results</h2>

        {loading ? (
          <p>Loading...</p>
        ) : results.length === 0 ? (
          <p>No results available</p>
        ) : (
          results.map((r) => (
            <div key={r.session_id} className="session-card">
              <h3>Session #{r.session_id}</h3>

              <p>
                Accuracy:{" "}
                <strong>
                  {(r.accuracy * 100).toFixed(1)}%
                </strong>
              </p>

              <p>
                Score: {r.correct} / {r.attempted}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default StudentResults;