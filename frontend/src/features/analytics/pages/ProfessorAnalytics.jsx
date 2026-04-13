import React, { useEffect, useState } from "react";
import { 
  Users, 
  Target, 
  HelpCircle, 
  BarChart3, 
  AlertTriangle, 
  Search, 
  ChevronDown 
} from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";
import api from "../../../services/api";
import "./ProfessorAnalytics.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend
);

const ProfessorAnalytics = () => {
  const [data, setData] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const [dateFilter, setDateFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("desc");

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const res = await api.get("/analytics/sessions");
        setSessions(res.data);

        if (res.data.length > 0) {
          setSessionId(res.data[0].id);
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchSessions();
  }, []);

  useEffect(() => {
    if (!sessionId) return;

    const fetchAnalytics = async () => {
      try {
        const res = await api.get(`/analytics/session/${sessionId}`);
        setData(res.data);
      } catch (err) {
        console.error("Analytics fetch failed:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [sessionId]);

  if (loading) return <div className="p-6">Loading analytics...</div>;
  if (!data) return <div className="p-6">No analytics data</div>;

  const now = new Date();

  const filteredSessions = sessions
    .filter(s => {
      const matchesSearch = s.course_name
        .toLowerCase()
        .includes(search.toLowerCase());

      if (!matchesSearch) return false;

      const sessionDate = new Date(s.date);

      if (dateFilter === "7") {
        return (now - sessionDate) / (1000 * 60 * 60 * 24) <= 7;
      }

      if (dateFilter === "30") {
        return (now - sessionDate) / (1000 * 60 * 60 * 24) <= 30;
      }

      return true;
    })
    .sort((a, b) =>
      sortOrder === "desc"
        ? new Date(b.date) - new Date(a.date)
        : new Date(a.date) - new Date(b.date)
    );

  const lineData = {
    labels: data.trend.map(t => `Part ${t.partition}`),
    datasets: [
      {
        fill: true,
        label: "Accuracy %",
        data: data.trend.map(t => t.accuracy),
        borderColor: "#3b82f6",
        backgroundColor: "rgba(59, 130, 246, 0.05)",
        tension: 0.4,
        pointBackgroundColor: "#1d4ed8",
        pointRadius: 4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: { 
        beginAtZero: true, 
        max: 100, 
        ticks: { stepSize: 25, callback: (v) => v + "%" },
        grid: { borderDash: [5, 5], color: "#e2e8f0" } 
      },
      x: { grid: { display: false } }
    },
    plugins: { legend: { display: false } }
  };

  const handleSessionClick = (id) => {
    setSessionId(id);
    setOpen(false);
  };

  return (
    <div className="ProfessorAnalytics-root">
      <div className="analytics-container">
        
        {/* Header */}
        <div className="analytics-header">
          <div className="header-text">
            <h1>Session Analytics</h1>
            <p>Analyze student performance for a lecture session</p>
          </div>

          <div 
            className="dropdown-selector"
            onClick={() => setOpen(!open)}
          >
            <span>
              {data.header.course_name} — {new Date(data.header.session_date).toDateString()}
            </span>
            <ChevronDown size={16} />

            {open && (
              <div 
                className="dropdown-menu"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Search */}
                <input
                  type="text"
                  placeholder="Search..."
                  className="dropdown-search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />

                {/* Filters */}
                <div className="dropdown-controls">
                  <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="dropdown-select"
                  >
                    <option value="all">All Dates</option>
                    <option value="7">Last 7 days</option>
                    <option value="30">Last 30 days</option>
                  </select>

                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    className="dropdown-select"
                  >
                    <option value="desc">Newest</option>
                    <option value="asc">Oldest</option>
                  </select>
                </div>

                {/* List */}
                <div className="dropdown-list">
                  {filteredSessions.map((s) => (
                    <div
                      key={s.id}
                      className={`dropdown-item ${s.id === sessionId ? "active" : ""}`}
                      onClick={() => handleSessionClick(s.id)}
                    >
                      {s.course_name} — {new Date(s.date).toDateString()}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="stats-grid">
          <StatCard title="AVERAGE ACCURACY" value={`${data.stats.avg_accuracy}%`} icon={<Target size={20} className="icon-blue" />} />
          <StatCard title="STUDENTS PARTICIPATED" value={data.stats.students_participated} icon={<Users size={20} className="icon-green" />} />
          <StatCard title="QUESTIONS ATTEMPTED" value={data.stats.questions_attempted} icon={<HelpCircle size={20} className="icon-orange" />} />
          <StatCard title="AVG ATTEMPTS / STUDENT" value={data.stats.avg_attempts_per_student} icon={<BarChart3 size={20} className="icon-purple" />} />
        </div>

        {/* Chart */}
        <div className="card chart-section">
          <div className="card-header">
            <BarChart3 size={18} className="text-blue" />
            <h3>Understanding Trend Across Lecture</h3>
          </div>
          <div className="chart-wrapper">
            <Line data={lineData} options={chartOptions} />
          </div>
        </div>

        {/* Middle Section */}
        <div className="side-by-side-flex-container">
          
          {/* Weak Topics */}
          <div className="card">
            <div className="card-header text-orange">
              <AlertTriangle size={18} />
              <h3>Weak Learning Areas</h3>
            </div>
            <div className="topics-list">
              {data.weak_topics.map((t, i) => (
                <TopicRow
                  key={i}
                  title={t.topic}
                  part={`Partition ${t.partition}`}
                  score={`${t.accuracy}%`}
                  status={t.status.charAt(0).toUpperCase() + t.status.slice(1)}
                  type={
                    t.status === "weak"
                      ? "status-red"
                      : t.status === "medium"
                      ? "status-orange"
                      : "status-green"
                  }
                />
              ))}
            </div>
          </div>

          {/* Questions */}
          <div className="card">
            <div className="card-header text-blue">
              <Search size={18} />
              <h3>Question Insights</h3>
            </div>
            <div className="table-responsive">
              <table className="analytics-table">
                <thead>
                  <tr>
                    <th>Question</th>
                    <th className="text-center">Accuracy</th>
                    <th className="text-right">Difficulty</th>
                  </tr>
                </thead>
                <tbody>
                  {data.questions.map((q, i) => (
                    <QuestionRow
                      key={i}
                      q={q.question}
                      acc={`${q.accuracy}%`}
                      diff={q.difficulty.charAt(0).toUpperCase() + q.difficulty.slice(1)}
                      diffClass={
                        q.difficulty === "easy"
                          ? "diff-easy"
                          : q.difficulty === "medium"
                          ? "diff-medium"
                          : "diff-hard"
                      }
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="bottom-grid">
          
          {/* Students */}
          <div className="card">
            <div className="card-header">
              <Users size={18} />
              <h3>Student Performance</h3>
            </div>
            <div className="table-responsive">
              <table className="analytics-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th className="text-center">Attempts</th>
                    <th className="text-right">Accuracy</th>
                  </tr>
                </thead>
                <tbody>
                  {data.students.map((s, i) => (
                    <StudentRow
                      key={i}
                      name={s.name}
                      attempts={s.attempts}
                      acc={s.accuracy}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Participation */}
          <div className="card participation-card">
            <h3 className="self-start text-slate-800 font-semibold">Participation</h3>
            <div className="participation-stat">
              <span className="participation-value">
                {data.participation.rate}%
              </span>
              <span className="participation-label">PARTICIPATION RATE</span>
            </div>
            <div className="participation-breakdown">
              <div className="breakdown-item item-green">
                <span><Users size={14} /> Participated</span>
                <strong>{data.participation.participated}</strong>
              </div>
              <div className="breakdown-item item-red">
                <span><Users size={14} /> Did not attempt</span>
                <strong>{data.participation.not_participated}</strong>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon }) => (
  <div className="stat-card">
    <div>
      <span className="stat-title">{title}</span>
      <span className="stat-value">{value}</span>
    </div>
    <div className="stat-icon-container">{icon}</div>
  </div>
);

const TopicRow = ({ title, part, score, status, type }) => (
  <div className="topic-row">
    <div>
      <p className="topic-title">{title}</p>
      <p className="topic-subtitle">{part}</p>
    </div>
    <div className="topic-stats">
      <span className="topic-score">{score}</span>
      <span className={`status-badge ${type}`}>{status}</span>
    </div>
  </div>
);

const QuestionRow = ({ q, acc, diff, diffClass }) => (
  <tr>
    <td className="question-text">{q}</td>
    <td className="text-center font-bold text-slate-700">{acc}</td>
    <td className={`text-right font-bold diff-badge ${diffClass}`}>{diff}</td>
  </tr>
);

const StudentRow = ({ name, attempts, acc }) => (
  <tr>
    <td className="text-slate-700">{name}</td>
    <td className="text-center text-slate-600">{attempts}</td>
    <td className="text-right">
      <div className="progress-container">
        <div className="progress-bar-bg">
          <div className="progress-bar-fill" style={{ width: `${acc}%` }}></div>
        </div>
        <span className="progress-text">{acc}%</span>
      </div>
    </td>
  </tr>
);

export default ProfessorAnalytics;