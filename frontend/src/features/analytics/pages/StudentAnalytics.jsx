// frontend/src/features/analytics/pages/StudentAnalytics.jsx

import React, { useEffect, useState, useMemo } from 'react';
import {
  Search, ChevronDown, ChevronUp, ChevronsUpDown,
  Filter, HelpCircle, Target, Award, Users,
  AlertCircle, TrendingUp, Info,
} from 'lucide-react';
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  PointElement, LineElement, Title, Tooltip, Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import './StudentAnalytics.css';
import { getStudentSessions, getStudentSessionAnalytics } from '../analyticsAPI';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler);

// ─── Sort helpers ─────────────────────────────────────────────────────────────
const SortIcon = ({ field, sortKey, sortDir }) => {
  if (sortKey !== field) return <ChevronsUpDown size={12} className="sort-icon muted" />;
  return sortDir === 'asc'
    ? <ChevronUp   size={12} className="sort-icon active" />
    : <ChevronDown size={12} className="sort-icon active" />;
};

const useSortFilter = (data, defaultSort, defaultDir = 'desc') => {
  const [sortKey, setSortKey] = useState(defaultSort);
  const [sortDir, setSortDir] = useState(defaultDir);

  const toggle = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const sorted = useMemo(() => {
    if (!data) return [];
    return [...data].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      if (typeof av === 'number') return sortDir === 'asc' ? av - bv : bv - av;
      return sortDir === 'asc'
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
  }, [data, sortKey, sortDir]);

  return { sorted, sortKey, sortDir, toggle };
};

// ─── Main ─────────────────────────────────────────────────────────────────────
const StudentAnalytics = () => {
  const [sessions,   setSessions]   = useState([]);
  const [sessionId,  setSessionId]  = useState(null);
  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Session dropdown filters
  const [search,       setSearch]       = useState('');
  const [dateFilter,   setDateFilter]   = useState('all');
  const [courseFilter, setCourseFilter] = useState('all');

  // Section filters
  const [weakFilter,    setWeakFilter]    = useState('all');
  const [questionFilter, setQuestionFilter] = useState('all'); // all / correct / wrong

  // ── Fetch sessions ──────────────────────────────────────────────────────────
  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await getStudentSessions();
        setSessions(res);
        if (res.length > 0) setSessionId(res[0].id);
      } catch (err) { console.error(err); }
    };
    fetch();
  }, []);

  // ── Fetch analytics ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!sessionId) return;
    setLoading(true);
    const fetch = async () => {
      try {
        const res = await getStudentSessionAnalytics(sessionId);
        setData(res);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetch();
  }, [sessionId]);

  // ── Weak topics sort/filter ─────────────────────────────────────────────────
  const { sorted: sortedTopics, sortKey: tSortKey, sortDir: tSortDir, toggle: tToggle } =
    useSortFilter(data?.weak_topics, 'accuracy');

  const filteredTopics = useMemo(() => {
    if (!sortedTopics) return [];
    return weakFilter === 'all' ? sortedTopics
      : sortedTopics.filter(t => t.status === weakFilter);
  }, [sortedTopics, weakFilter]);

  // ── Questions sort/filter ───────────────────────────────────────────────────
  const { sorted: sortedQuestions, sortKey: qSortKey, sortDir: qSortDir, toggle: qToggle } =
    useSortFilter(data?.questions, 'is_correct', 'desc');

  const filteredQuestions = useMemo(() => {
    if (!sortedQuestions) return [];
    if (questionFilter === 'correct') return sortedQuestions.filter(q => q.is_correct);
    if (questionFilter === 'wrong')   return sortedQuestions.filter(q => !q.is_correct);
    return sortedQuestions;
  }, [sortedQuestions, questionFilter]);

  if (loading) return <div className="sa-loading">Loading...</div>;
  if (!data)   return <div className="sa-loading">No data</div>;

  // ── Session dropdown filter ─────────────────────────────────────────────────
  const uniqueCourses = [...new Set(sessions.map(s => s.course_name))];
  const now = new Date();

  const filteredSessions = sessions.filter(s => {
    const matchSearch = s.course_name.toLowerCase().includes(search.toLowerCase());
    const matchCourse = courseFilter === 'all' || s.course_name === courseFilter;
    const d = new Date(s.date);
    const matchDate =
      dateFilter === '7'  ? (now - d) / 86400000 <= 7  :
      dateFilter === '30' ? (now - d) / 86400000 <= 30 : true;
    return matchSearch && matchCourse && matchDate;
  });

  const selectedSession = sessions.find(s => s.id === sessionId);

  // ── Chart ───────────────────────────────────────────────────────────────────
  const chartData = {
    labels: data.trend.map(t => `Part ${t.partition}`),
    datasets: [{
      data: data.trend.map(t => t.accuracy),
      borderColor: '#2563eb',
      backgroundColor: ctx => {
        const g = ctx.chart.ctx.createLinearGradient(0, 0, 0, 300);
        g.addColorStop(0, 'rgba(37,99,235,0.08)');
        g.addColorStop(1, 'rgba(37,99,235,0)');
        return g;
      },
      fill: true, tension: 0.4, pointRadius: 3, pointBackgroundColor: '#2563eb',
    }],
  };

  const chartOptions = {
    responsive: true, maintainAspectRatio: false,
    scales: {
      y: { min: 0, max: 100, ticks: { stepSize: 25, callback: v => v + '%', font: { size: 10 } }, grid: { borderDash: [5,5] } },
      x: { grid: { display: false }, ticks: { font: { size: 10 } } },
    },
    plugins: { legend: { display: false } },
  };

  const aboveAvg = data.stats.accuracy > data.stats.class_avg;

  return (
    <div className="StudentAnalytics-root">
      <div className="analytics-container">

        {/* ── Header ── */}
        <header className="page-header">
          <div className="title-group">
            <h1>Session Analytics</h1>
            <p>Review your performance for a lecture session</p>
          </div>

          <div className="filter-bar">
            <div className="search-box">
              <Search size={14} />
              <input type="text" placeholder="Search sessions..."
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            <select className="filter-btn" value={courseFilter} onChange={e => setCourseFilter(e.target.value)}>
              <option value="all">All Courses</option>
              {uniqueCourses.map((c, i) => <option key={i} value={c}>{c}</option>)}
            </select>

            <select className="filter-btn" value={dateFilter} onChange={e => setDateFilter(e.target.value)}>
              <option value="all">All Dates</option>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
            </select>

            <div className="filter-btn select-main" onClick={() => setDropdownOpen(!dropdownOpen)}>
              {selectedSession
                ? `${selectedSession.course_name} — ${new Date(selectedSession.date).toDateString()}`
                : 'Select Session'}
              <ChevronDown size={12} />
              {dropdownOpen && (
                <div className="dropdown-menu" onClick={e => e.stopPropagation()}>
                  {filteredSessions.map(s => (
                    <div key={s.id} className="dropdown-item"
                      onClick={() => { setSessionId(s.id); setDropdownOpen(false); }}>
                      {s.course_name} — {new Date(s.date).toDateString()}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ── Stats ── */}
        <div className="stats-grid">
          <StatCard label="YOUR ACCURACY"       value={`${data.stats.accuracy}%`}                   icon={<Target    size={18} color="#2563eb" />} />
          <StatCard label="YOUR SCORE"          value={`${data.stats.correct} / ${data.stats.total}`} icon={<Award     size={18} color="#10b981" />} />
          <StatCard label="QUESTIONS ATTEMPTED" value={data.stats.total}                             icon={<HelpCircle size={18} color="#f59e0b" />} />
          <StatCard label="CLASS AVERAGE"       value={`${data.stats.class_avg}%`}                  icon={<Users     size={18} color="#64748b" />} />
        </div>

        {/* ── Chart ── */}
        <section className="card chart-card">
          <div className="card-header-stack">
            <h3><Target size={16} /> Accuracy Across Partitions</h3>
            <p className="subtitle">Your accuracy per lecture section</p>
          </div>
          <div className="chart-wrapper">
            <Line data={chartData} options={chartOptions} />
          </div>
        </section>

        {/* ── Weak Areas + Insights ── */}
        <div className="mid-section-grid">

          <section className="card equal-height">
            <div className="section-card-header">
              <div className="card-header-stack" style={{ marginBottom: 0 }}>
                <h3><AlertCircle size={16} /> Weak Areas</h3>
              </div>
              <div className="header-filter-group">
                <Filter size={13} className="filter-icon" />
                <select className="inline-select" value={weakFilter} onChange={e => setWeakFilter(e.target.value)}>
                  <option value="all">All</option>
                  <option value="weak">Weak</option>
                  <option value="medium">Medium</option>
                  <option value="strong">Strong</option>
                </select>
              </div>
            </div>

            <div className="section-sort-bar">
              <button className="sort-btn" onClick={() => tToggle('topic')}>
                Topic <SortIcon field="topic" sortKey={tSortKey} sortDir={tSortDir} />
              </button>
              <button className="sort-btn" onClick={() => tToggle('accuracy')}>
                Accuracy <SortIcon field="accuracy" sortKey={tSortKey} sortDir={tSortDir} />
              </button>
              <button className="sort-btn" onClick={() => tToggle('partition')}>
                Partition <SortIcon field="partition" sortKey={tSortKey} sortDir={tSortDir} />
              </button>
            </div>

            <div className="topic-list">
              {filteredTopics.length === 0
                ? <p className="empty-msg">No topics match filter.</p>
                : filteredTopics.map((t, i) => (
                  <TopicRow key={i}
                    title={t.topic}
                    part={`Part ${t.partition}`}
                    score={`${t.accuracy}%`}
                    tag={t.status}
                    status={t.status === 'weak' ? 'error' : t.status === 'medium' ? 'warning' : 'success'}
                  />
                ))
              }
            </div>
          </section>

          <section className="card insights-card">
            <div className="card-header-stack">
              <h3><Info size={16} /> Insights</h3>
            </div>

            <div className="insight-box alert">
              Your accuracy: <strong>{data.stats.accuracy}%</strong>
            </div>

            <div className={`insight-box ${aboveAvg ? 'success' : 'warn'}`}>
              {aboveAvg
                ? `You're ${data.stats.accuracy - data.stats.class_avg}% above class average`
                : `You're ${data.stats.class_avg - data.stats.accuracy}% below class average`}
            </div>

            <div className="insight-box neutral">
              Score: <strong>{data.stats.correct}/{data.stats.total}</strong> questions correct
            </div>

            {data.weak_topics?.length > 0 && (
              <div className="insight-box warn">
                <strong>{data.weak_topics.filter(t => t.status === 'weak').length}</strong> weak area{data.weak_topics.filter(t => t.status === 'weak').length !== 1 ? 's' : ''} to review
              </div>
            )}
          </section>
        </div>

        {/* ── Question Review ── */}
        <section className="card equal-height table-card">
          <div className="section-card-header">
            <div className="card-header-stack" style={{ marginBottom: 0 }}>
              <h3><HelpCircle size={16} /> Question Review</h3>
            </div>
            <div className="header-filter-group">
              <Filter size={13} className="filter-icon" />
              <select className="inline-select" value={questionFilter} onChange={e => setQuestionFilter(e.target.value)}>
                <option value="all">All</option>
                <option value="correct">Correct</option>
                <option value="wrong">Wrong</option>
              </select>
            </div>
          </div>

          <div className="section-sort-bar">
            <button className="sort-btn" onClick={() => qToggle('is_correct')}>
              Result <SortIcon field="is_correct" sortKey={qSortKey} sortDir={qSortDir} />
            </button>
            <button className="sort-btn" onClick={() => qToggle('question')}>
              Question <SortIcon field="question" sortKey={qSortKey} sortDir={qSortDir} />
            </button>
          </div>

          <div className="table-scroll">
            <table className="review-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Question</th>
                  <th>Your Answer</th>
                  <th>Correct Answer</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {filteredQuestions.map((q, i) => (
                  <QuestionRow key={i} id={i + 1}
                    q={q.question}
                    mine={q.your_answer}
                    correct={q.correct_answer}
                    status={q.is_correct ? 'Correct' : 'Wrong'}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </div>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────────
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
