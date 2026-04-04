import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  getSessionSummary,
  getPartitionAnalytics,
  getStudentAnalytics,
  getQuestionAnalytics
} from "../analyticsAPI";

import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  ArcElement,
  Tooltip,
  Legend
} from "chart.js";

import { Bar, Pie, Doughnut } from "react-chartjs-2";
import "./SessionAnalytics.css";

ChartJS.register(
  BarElement,
  CategoryScale,
  LinearScale,
  ArcElement,
  Tooltip,
  Legend
);

const SessionAnalytics = () => {
  const { sessionId } = useParams();

  const [summary, setSummary] = useState(null);
  const [partitions, setPartitions] = useState([]);
  const [students, setStudents] = useState([]);
  const [questions, setQuestions] = useState([]);

  const [loading, setLoading] = useState(true);

  // =========================
  // FETCH DATA
  // =========================
  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const [s, p, st, q] = await Promise.all([
        getSessionSummary(sessionId),
        getPartitionAnalytics(sessionId),
        getStudentAnalytics(sessionId),
        getQuestionAnalytics(sessionId)
      ]);

      setSummary(s.data || {});
      setPartitions(p.data || []);
      setStudents(st.data || []);
      setQuestions(q.data || []);

    } catch (err) {
      console.error("Analytics error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sessionId) fetchAnalytics();
  }, [sessionId]);

  if (loading) return <p className="loading">Loading analytics...</p>;
  if (!summary) return <p>No data available</p>;

  // =========================
  // 📊 CHART DATA
  // =========================

  // Partition Accuracy
  const partitionChart = {
    labels: partitions.map(p => `P${p.partition_index}`),
    datasets: [
      {
        label: "Accuracy %",
        data: partitions.map(p => (p.accuracy * 100).toFixed(1)),
        backgroundColor: "#3b82f6"
      }
    ]
  };

  // Accuracy Split
  const correct = (summary.accuracy || 0) * 100;
  const incorrect = 100 - correct;

  const pieChart = {
    labels: ["Correct", "Incorrect"],
    datasets: [
      {
        data: [correct, incorrect],
        backgroundColor: ["#22c55e", "#ef4444"]
      }
    ]
  };

  // Student Performance
  const studentChart = {
    labels: students.map(s => s.name),
    datasets: [
      {
        label: "Accuracy %",
        data: students.map(s => (s.accuracy * 100).toFixed(1)),
        backgroundColor: "#6366f1"
      }
    ]
  };

  // Question Difficulty
  const easy = questions.filter(q => q.correct_rate > 0.7).length;
  const medium = questions.filter(q => q.correct_rate > 0.4 && q.correct_rate <= 0.7).length;
  const hard = questions.filter(q => q.correct_rate <= 0.4).length;

  const difficultyChart = {
    labels: ["Easy", "Medium", "Hard"],
    datasets: [
      {
        data: [easy, medium, hard],
        backgroundColor: ["#22c55e", "#facc15", "#ef4444"]
      }
    ]
  };

  return (
    <div className="analytics-container">

      <h1>Session Analytics</h1>

      {/* =========================
          SUMMARY
      ========================= */}
      <div className="summary-row">

        <div className="summary-card">
          <h3>Accuracy</h3>
          <p>{correct.toFixed(1)}%</p>
        </div>

        <div className="summary-card">
          <h3>Participants</h3>
          <p>{summary.participants || 0}</p>
        </div>

        <div className="summary-card">
          <h3>Questions</h3>
          <p>{summary.total_questions || 0}</p>
        </div>

      </div>

      {/* =========================
          CHARTS
      ========================= */}
      <div className="chart-grid">

        {/* Partition */}
        <div className="chart-card full-width">
          <h2>Partition Performance</h2>
          <div className="chart-wrapper">
            <Bar data={partitionChart} />
          </div>
        </div>

        {/* Pie */}
        <div className="chart-card">
          <h2>Accuracy Split</h2>
          <div className="chart-wrapper">
            <Pie data={pieChart} />
          </div>
        </div>

        {/* Difficulty */}
        <div className="chart-card">
          <h2>Question Difficulty</h2>
          <div className="chart-wrapper">
            <Doughnut data={difficultyChart} />
          </div>
        </div>

        {/* Students */}
        <div className="chart-card full-width">
          <h2>Student Performance</h2>
          <div className="chart-wrapper">
            <Bar data={studentChart} />
          </div>
        </div>

      </div>

    </div>
  );
};

export default SessionAnalytics;