import React, { useEffect, useState } from 'react';
import { 
  Search, ChevronDown, Filter, HelpCircle, 
  Target, Award, Users, AlertCircle, TrendingUp, Info 
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import './StudentAnalytics.css';

import {
  getStudentSessions,
  getStudentSessionAnalytics
} from '../analyticsAPI';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler);

const StudentAnalytics = () => {
  const [sessions, setSessions] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [dropdownOpen, setDropdownOpen] = useState(false);

  // 🔥 FILTER STATES
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [courseFilter, setCourseFilter] = useState("all");

  // =========================
  // FETCH SESSIONS
  // =========================
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const res = await getStudentSessions();
        setSessions(res);

        if (res.length > 0) {
          setSessionId(res[0].id);
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchSessions();
  }, []);

  // =========================
  // FETCH ANALYTICS
  // =========================
  useEffect(() => {
    if (!sessionId) return;

    const fetchAnalytics = async () => {
      try {
        const res = await getStudentSessionAnalytics(sessionId);
        setData(res);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [sessionId]);

  if (loading) return <div className="p-6">Loading...</div>;
  if (!data) return <div className="p-6">No data</div>;

  // =========================
  // FILTER LOGIC
  // =========================
  const uniqueCourses = [...new Set(sessions.map(s => s.course_name))];
  const now = new Date();

  const filteredSessions = sessions.filter(s => {
    const matchesSearch = s.course_name
      .toLowerCase()
      .includes(search.toLowerCase());

    const matchesCourse =
      courseFilter === "all" || s.course_name === courseFilter;

    const sessionDate = new Date(s.date);

    let matchesDate = true;

    if (dateFilter === "7") {
      matchesDate =
        (now - sessionDate) / (1000 * 60 * 60 * 24) <= 7;
    }

    if (dateFilter === "30") {
      matchesDate =
        (now - sessionDate) / (1000 * 60 * 60 * 24) <= 30;
    }

    return matchesSearch && matchesCourse && matchesDate;
  });

  const selectedSession = sessions.find(s => s.id === sessionId);

  // =========================
  // CHART DATA
  // =========================
  const chartData = {
    labels: data.trend.map(t => `Part ${t.partition}`),
    datasets: [{
      data: data.trend.map(t => t.accuracy),
      borderColor: '#2563eb',
      backgroundColor: (context) => {
        const ctx = context.chart.ctx;
        const gradient = ctx.createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(0, 'rgba(37, 99, 235, 0.08)');
        gradient.addColorStop(1, 'rgba(37, 99, 235, 0)');
        return gradient;
      },
      fill: true,
      tension: 0.4,
      pointRadius: 3,
      pointBackgroundColor: '#2563eb',
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: { min: 0, max: 100, ticks: { stepSize: 25, callback: (v) => v + '%', font: { size: 10 } }, grid: { borderDash: [5, 5] } },
      x: { grid: { display: false }, ticks: { font: { size: 10 } } }
    },
    plugins: { legend: { display: false } }
  };

  return (
    <div className="StudentAnalytics-root">
      <div className="analytics-container">

        {/* HEADER */}
        <header className="page-header">
          <div className="title-group">
            <h1>Session Analytics</h1>
            <p>Review your performance for a lecture session</p>
          </div>

          <div className="filter-bar">
            {/* SEARCH */}
            <div className="search-box">
              <Search size={14} />
              <input
                type="text"
                placeholder="Search sessions..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* COURSE FILTER */}
            <select
              className="filter-btn"
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
            >
              <option value="all">All Courses</option>
              {uniqueCourses.map((c, i) => (
                <option key={i} value={c}>{c}</option>
              ))}
            </select>

            {/* DATE FILTER */}
            <select
              className="filter-btn"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            >
              <option value="all">All Dates</option>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
            </select>

            {/* SESSION DROPDOWN */}
            <div className="filter-btn select-main" onClick={() => setDropdownOpen(!dropdownOpen)}>
              {selectedSession
                ? `${selectedSession.course_name} — ${new Date(selectedSession.date).toDateString()}`
                : "Select Session"}
              <ChevronDown size={12} />

              {dropdownOpen && (
                <div className="dropdown-menu">
                  {filteredSessions.map((s) => (
                    <div
                      key={s.id}
                      className="dropdown-item"
                      onClick={() => {
                        setSessionId(s.id);
                        setDropdownOpen(false);
                      }}
                    >
                      {s.course_name} — {new Date(s.date).toDateString()}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* STATS */}
        <div className="stats-grid">
          <StatCard label="YOUR ACCURACY" value={`${data.stats.accuracy}%`} icon={<Target size={18} color="#2563eb" />} />
          <StatCard label="YOUR SCORE" value={`${data.stats.correct} / ${data.stats.total}`} icon={<Award size={18} color="#10b981" />} />
          <StatCard label="QUESTIONS ATTEMPTED" value={data.stats.total} icon={<HelpCircle size={18} color="#f59e0b" />} />
          <StatCard label="CLASS AVERAGE" value={`${data.stats.class_avg}%`} icon={<Users size={18} color="#64748b" />} />
        </div>

        {/* CHART */}
        <section className="card chart-card">
          <div className="card-header-stack">
            <h3><Target size={16} /> Accuracy Across Partitions</h3>
            <p className="subtitle">Your accuracy per lecture section</p>
          </div>
          <div className="chart-wrapper">
            <Line data={chartData} options={chartOptions} />
          </div>
        </section>

        {/* WEAK AREAS */}
        <div className="mid-section-grid">
          <section className="card weak-areas">
            <div className="card-header-stack">
              <h3><AlertCircle size={16} /> Weak Areas</h3>
            </div>
            <div className="topic-list">
              {data.weak_topics.map((t, i) => (
                <TopicRow
                  key={i}
                  title={t.topic}
                  part={`Part ${t.partition}`}
                  score={`${t.accuracy}%`}
                  tag={t.status}
                  status={
                    t.status === "weak"
                      ? "error"
                      : t.status === "medium"
                      ? "warning"
                      : "success"
                  }
                />
              ))}
            </div>
          </section>

          {/* INSIGHTS */}
          <section className="card insights-card">
            <div className="card-header-stack">
              <h3><Info size={16} /> Insights</h3>
            </div>

            <div className="insight-box alert">
              Accuracy: <strong>{data.stats.accuracy}%</strong>
            </div>

            <div className="insight-box success">
              {data.stats.accuracy > data.stats.class_avg
                ? "You are above class average"
                : "You are below class average"}
            </div>
          </section>
        </div>

        {/* QUESTIONS */}
        <section className="card table-card">
          <div className="card-header-stack">
            <h3><HelpCircle size={16} /> Question Review</h3>
          </div>
          <table className="review-table">
            <thead>
              <tr><th>#</th><th>Question</th><th>Your Answer</th><th>Correct Answer</th><th>Result</th></tr>
            </thead>
            <tbody>
              {data.questions.map((q, i) => (
                <QuestionRow
                  key={i}
                  id={i + 1}
                  q={q.question}
                  mine={q.your_answer}
                  correct={q.correct_answer}
                  status={q.is_correct ? "Correct" : "Wrong"}
                />
              ))}
            </tbody>
          </table>
        </section>

      </div>
    </div>
  );
};

/* SMALL COMPONENTS */
const StatCard = ({ label, value, icon }) => (
  <div className="stat-card">
    <div className="stat-content">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
    </div>
    <div className="stat-icon-wrapper">{icon}</div>
  </div>
);

const TopicRow = ({ title, part, score, tag, status }) => (
  <div className="topic-row">
    <div className="topic-text">
      <span className="topic-title">{title}</span>
      <span className="topic-part">{part}</span>
    </div>
    <div className="topic-data">
      <span className="topic-score">{score}</span>
      <span className={`tag ${status}`}>{tag}</span>
    </div>
  </div>
);

const QuestionRow = ({ id, q, mine, correct, status }) => (
  <tr>
    <td className="w-id">{id}</td>
    <td className="w-q">{q}</td>
    <td className={`w-ans ${status === 'Wrong' ? 'text-red' : 'text-green'}`}>{mine}</td>
    <td className="w-ans">{correct}</td>
    <td className="w-res"><span className={`status-pill ${status.toLowerCase()}`}>{status}</span></td>
  </tr>
);

export default StudentAnalytics;