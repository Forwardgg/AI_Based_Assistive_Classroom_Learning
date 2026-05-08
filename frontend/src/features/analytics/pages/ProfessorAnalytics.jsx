// frontend/src/features/analytics/pages/ProfessorAnalytics.jsx

import React, { useEffect, useState, useMemo } from "react";
import {
  Users,
  Target,
  HelpCircle,
  BarChart3,
  AlertTriangle,
  Search,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Filter,
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
  CategoryScale, LinearScale, PointElement, LineElement,
  Title, Tooltip, Filler, Legend
);

// ─── Sort icon helper ───────────────────────────────────────────────────────
const SortIcon = ({ field, sortKey, sortDir }) => {
  if (sortKey !== field) return <ChevronsUpDown size={13} className="sort-icon muted" />;
  return sortDir === "asc"
    ? <ChevronUp   size={13} className="sort-icon active" />
    : <ChevronDown size={13} className="sort-icon active" />;
};

const useSortFilter = (data, defaultSort) => {
  const [sortKey, setSortKey] = useState(defaultSort);
  const [sortDir, setSortDir] = useState("desc");

  const toggle = (key) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  };

  const sorted = useMemo(() => {
    if (!data) return [];
    return [...data].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      if (typeof av === "number") return sortDir === "asc" ? av - bv : bv - av;
      return sortDir === "asc"
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
  }, [data, sortKey, sortDir]);

  return { sorted, sortKey, sortDir, toggle };
};

// ─── Main Component ──────────────────────────────────────────────────────────
const ProfessorAnalytics = () => {
  const [data,      setData]      = useState(null);
  const [sessions,  setSessions]  = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [loading,   setLoading]   = useState(true);

  // Session dropdown state
  const [open,       setOpen]       = useState(false);
  const [search,     setSearch]     = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [sortOrder,  setSortOrder]  = useState("desc");

  // Expanded student row
  const [expandedStudent, setExpandedStudent] = useState(null);

  // Section filters
  const [questionDiff,  setQuestionDiff]  = useState("all");
  const [weakFilter,    setWeakFilter]    = useState("all");
  const [studentSearch, setStudentSearch] = useState("");

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const res = await api.get("/analytics/sessions");
        setSessions(res.data);
        if (res.data.length > 0) setSessionId(res.data[0].id);
      } catch (err) { console.error(err); }
    };
    fetchSessions();
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    setLoading(true);
    const fetch = async () => {
      try {
        const res = await api.get(`/analytics/session/${sessionId}`);
        setData(res.data);
        setExpandedStudent(null);
      } catch (err) { console.error("Analytics fetch failed:", err); }
      finally { setLoading(false); }
    };
    fetch();
  }, [sessionId]);

  // ── Questions sort/filter ────────────────────────────────────────────────
  const { sorted: sortedQuestions, sortKey: qSortKey, sortDir: qSortDir, toggle: qToggle } =
    useSortFilter(data?.questions, "accuracy");

  const filteredQuestions = useMemo(() => {
    if (!sortedQuestions) return [];
    return questionDiff === "all"
      ? sortedQuestions
      : sortedQuestions.filter((q) => q.difficulty === questionDiff);
  }, [sortedQuestions, questionDiff]);

  // ── Weak topics sort/filter ──────────────────────────────────────────────
  const { sorted: sortedTopics, sortKey: tSortKey, sortDir: tSortDir, toggle: tToggle } =
    useSortFilter(data?.weak_topics, "accuracy");

  const filteredTopics = useMemo(() => {
    if (!sortedTopics) return [];
    return weakFilter === "all"
      ? sortedTopics
      : sortedTopics.filter((t) => t.status === weakFilter);
  }, [sortedTopics, weakFilter]);

  // ── Student sort/filter ──────────────────────────────────────────────────
  const { sorted: sortedStudents, sortKey: sSortKey, sortDir: sSortDir, toggle: sToggle } =
    useSortFilter(data?.students, "accuracy");

  const filteredStudents = useMemo(() => {
    if (!sortedStudents) return [];
    return studentSearch
      ? sortedStudents.filter((s) =>
          s.name.toLowerCase().includes(studentSearch.toLowerCase())
        )
      : sortedStudents;
  }, [sortedStudents, studentSearch]);

  if (loading) return <div className="pa-loading">Loading analytics...</div>;
  if (!data)   return <div className="pa-loading">No analytics data</div>;

  const now = new Date();
  const filteredSessions = sessions
    .filter((s) => {
      const match = s.course_name.toLowerCase().includes(search.toLowerCase());
      if (!match) return false;
      const d = new Date(s.date);
      if (dateFilter === "7")  return (now - d) / 86400000 <= 7;
      if (dateFilter === "30") return (now - d) / 86400000 <= 30;
      return true;
    })
    .sort((a, b) =>
      sortOrder === "desc"
        ? new Date(b.date) - new Date(a.date)
        : new Date(a.date) - new Date(b.date)
    );

  const lineData = {
    labels: data.trend.map((t) => `Part ${t.partition}`),
    datasets: [{
      fill: true,
      label: "Accuracy %",
      data: data.trend.map((t) => t.accuracy),
      borderColor: "#3b82f6",
      backgroundColor: "rgba(59,130,246,0.05)",
      tension: 0.4,
      pointBackgroundColor: "#1d4ed8",
      pointRadius: 4,
    }],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: { beginAtZero: true, max: 100, ticks: { stepSize: 25, callback: (v) => v + "%" }, grid: { borderDash: [5,5], color: "#e2e8f0" } },
      x: { grid: { display: false } },
    },
    plugins: { legend: { display: false } },
  };

  return (
    <div className="ProfessorAnalytics-root">
      <div className="analytics-container">

        {/* ── Header ── */}
        <div className="analytics-header">
          <div className="header-text">
            <h1>Session Analytics</h1>
            <p>Analyze student performance for a lecture session</p>
          </div>

          <div className="dropdown-selector" onClick={() => setOpen(!open)}>
            <span>
              {data.header.course_name} — {new Date(data.header.session_date).toDateString()}
            </span>
            <ChevronDown size={16} />

            {open && (
              <div className="dropdown-menu" onClick={(e) => e.stopPropagation()}>
                <input type="text" placeholder="Search..." className="dropdown-search"
                  value={search} onChange={(e) => setSearch(e.target.value)} />
                <div className="dropdown-controls">
                  <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="dropdown-select">
                    <option value="all">All Dates</option>
                    <option value="7">Last 7 days</option>
                    <option value="30">Last 30 days</option>
                  </select>
                  <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="dropdown-select">
                    <option value="desc">Newest</option>
                    <option value="asc">Oldest</option>
                  </select>
                </div>
                <div className="dropdown-list">
                  {filteredSessions.map((s) => (
                    <div key={s.id}
                      className={`dropdown-item ${s.id === sessionId ? "active" : ""}`}
                      onClick={() => { setSessionId(s.id); setOpen(false); }}>
                      {s.course_name} — {new Date(s.date).toDateString()}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="stats-grid">
          <StatCard title="AVERAGE ACCURACY"       value={`${data.stats.avg_accuracy}%`}       icon={<Target    size={20} className="icon-blue"   />} />
          <StatCard title="STUDENTS PARTICIPATED"  value={data.stats.students_participated}     icon={<Users     size={20} className="icon-green"  />} />
          <StatCard title="QUESTIONS ATTEMPTED"    value={data.stats.questions_attempted}       icon={<HelpCircle size={20} className="icon-orange" />} />
          <StatCard title="AVG ATTEMPTS / STUDENT" value={data.stats.avg_attempts_per_student}  icon={<BarChart3 size={20} className="icon-purple" />} />
        </div>

        {/* ── Chart ── */}
        <div className="card chart-section">
          <div className="card-header">
            <BarChart3 size={18} className="text-blue" />
            <h3>Understanding Trend Across Lecture</h3>
          </div>
          <div className="chart-wrapper">
            <Line data={lineData} options={chartOptions} />
          </div>
        </div>

        {/* ── Weak Topics + Questions ── */}
        <div className="side-by-side-flex-container">

          {/* Weak Topics */}
          <div className="card equal-height">
            <div className="card-header text-orange">
              <AlertTriangle size={18} />
              <h3>Weak Learning Areas</h3>
              <div className="header-filter-group">
                <Filter size={13} className="filter-icon" />
                <select className="inline-select"
                  value={weakFilter} onChange={(e) => setWeakFilter(e.target.value)}>
                  <option value="all">All</option>
                  <option value="weak">Weak</option>
                  <option value="medium">Medium</option>
                  <option value="strong">Strong</option>
                </select>
              </div>
            </div>

            <div className="section-sort-bar">
              <button className="sort-btn" onClick={() => tToggle("topic")}>
                Topic <SortIcon field="topic" sortKey={tSortKey} sortDir={tSortDir} />
              </button>
              <button className="sort-btn" onClick={() => tToggle("accuracy")}>
                Accuracy <SortIcon field="accuracy" sortKey={tSortKey} sortDir={tSortDir} />
              </button>
              <button className="sort-btn" onClick={() => tToggle("partition")}>
                Partition <SortIcon field="partition" sortKey={tSortKey} sortDir={tSortDir} />
              </button>
            </div>

            <div className="topics-list">
              {filteredTopics.length === 0
                ? <p className="empty-msg">No topics match filter.</p>
                : filteredTopics.map((t, i) => (
                  <TopicRow key={i}
                    title={t.topic}
                    part={`Partition ${t.partition}`}
                    score={`${t.accuracy}%`}
                    status={t.status.charAt(0).toUpperCase() + t.status.slice(1)}
                    type={t.status === "weak" ? "status-red" : t.status === "medium" ? "status-orange" : "status-green"}
                  />
                ))
              }
            </div>
          </div>

          {/* Questions */}
          <div className="card equal-height">
            <div className="card-header text-blue">
              <Search size={18} />
              <h3>Question Insights</h3>
              <div className="header-filter-group">
                <Filter size={13} className="filter-icon" />
                <select className="inline-select"
                  value={questionDiff} onChange={(e) => setQuestionDiff(e.target.value)}>
                  <option value="all">All</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
            </div>

            <div className="table-responsive">
              <table className="analytics-table">
                <thead>
                  <tr>
                    <th>Question</th>
                    <th className="text-center sortable" onClick={() => qToggle("accuracy")}>
                      Accuracy <SortIcon field="accuracy" sortKey={qSortKey} sortDir={qSortDir} />
                    </th>
                    <th className="text-right sortable" onClick={() => qToggle("difficulty")}>
                      Difficulty <SortIcon field="difficulty" sortKey={qSortKey} sortDir={qSortDir} />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredQuestions.map((q, i) => (
                    <QuestionRow key={i}
                      q={q.question}
                      acc={`${q.accuracy}%`}
                      diff={q.difficulty.charAt(0).toUpperCase() + q.difficulty.slice(1)}
                      diffClass={q.difficulty === "easy" ? "diff-easy" : q.difficulty === "medium" ? "diff-medium" : "diff-hard"}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── Student Performance + Participation ── */}
        <div className="bottom-grid">

          {/* Student Performance — expanded with partition breakdown */}
          <div className="card equal-height">
            <div className="card-header">
              <Users size={18} />
              <h3>Student Performance</h3>
            </div>

            {/* Search bar */}
            <div className="student-search-bar">
              <Search size={14} className="muted" />
              <input type="text" placeholder="Search students..."
                value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} />
            </div>

            <div className="table-responsive">
              <table className="analytics-table">
                <thead>
                  <tr>
                    <th className="sortable" onClick={() => sToggle("name")}>
                      Student <SortIcon field="name" sortKey={sSortKey} sortDir={sSortDir} />
                    </th>
                    <th className="text-center sortable" onClick={() => sToggle("attempts")}>
                      Attempts <SortIcon field="attempts" sortKey={sSortKey} sortDir={sSortDir} />
                    </th>
                    <th className="text-right sortable" onClick={() => sToggle("accuracy")}>
                      Accuracy <SortIcon field="accuracy" sortKey={sSortKey} sortDir={sSortDir} />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((s, i) => (
                    <React.Fragment key={i}>
                      <tr
                        className={`student-row ${expandedStudent === i ? "expanded" : ""}`}
                        onClick={() => setExpandedStudent(expandedStudent === i ? null : i)}
                      >
                        <td>
                          <div className="student-name-cell">
                            <ChevronDown size={14}
                              className={`expand-arrow ${expandedStudent === i ? "rotated" : ""}`}
                            />
                            {s.name}
                          </div>
                        </td>
                        <td className="text-center text-slate-600">{s.attempts}</td>
                        <td className="text-right">
                          <div className="progress-container">
                            <div className="progress-bar-bg">
                              <div className="progress-bar-fill" style={{ width: `${s.accuracy}%` }} />
                            </div>
                            <span className="progress-text">{s.accuracy}%</span>
                          </div>
                        </td>
                      </tr>

                      {/* Partition breakdown row */}
                      {expandedStudent === i && s.partitions?.length > 0 && (
                        <tr className="partition-breakdown-row">
                          <td colSpan={3}>
                            <div className="partition-breakdown-grid">
                              {s.partitions.map((p, j) => (
                                <div key={j} className="partition-chip">
                                  <span className="partition-chip-label">Part {p.partition}</span>
                                  <span className={`partition-chip-score ${
                                    p.accuracy >= 70 ? "score-good"
                                    : p.accuracy >= 40 ? "score-mid"
                                    : "score-low"
                                  }`}>
                                    {p.accuracy}%
                                  </span>
                                  <span className="partition-chip-attempts">
                                    {p.correct}/{p.total}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Participation */}
          <div className="card participation-card">
            <h3 className="self-start text-slate-800 font-semibold">Participation</h3>
            <div className="participation-stat">
              <span className="participation-value">{data.participation.rate}%</span>
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

// ─── Sub-components ──────────────────────────────────────────────────────────
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

export default ProfessorAnalytics;
