import React from 'react';
import { 
  Target, TrendingUp, BookOpen, Clock, 
  Calendar, CheckCircle, XCircle, AlertTriangle 
} from 'lucide-react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, 
  PointElement, LineElement, Title, Tooltip, 
  Filler, Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import './StudentResults.css';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, 
  LineElement, Title, Tooltip, Filler, Legend
);

const StudentResults = () => {
  const chartData = {
    labels: ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8', 'W9', 'W10'],
    datasets: [
      {
        fill: true,
        label: 'Your Score',
        data: [65, 70, 60, 75, 78, 68, 85, 80, 78, 88],
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
      },
      {
        label: 'Class Average',
        data: [60, 62, 65, 66, 68, 69, 70, 68, 70, 72],
        borderColor: '#10b981',
        backgroundColor: 'transparent',
        tension: 0.4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { min: 40, max: 100, ticks: { stepSize: 15 } },
      x: { grid: { display: false } }
    }
  };

  return (
    <div className="dashboard-wrapper-fix">
      <header className="dashboard-header">
        <div className="header-text">
          <h1>Welcome back, Alex</h1>
          <p>Keep up your learning streak! Here's your progress.</p>
        </div>
        <div className="streak-badge">
          <span>7 Day Streak 🔥</span>
        </div>
      </header>

      <div className="stats-grid">
        <StatCard title="Quizzes Taken" value="42" sub="8 this week" icon={<Target />} />
        <StatCard title="Avg. Score" value="78%" sub="5% improvement" icon={<TrendingUp />} />
        <StatCard title="Sessions Attended" value="18" sub="Out of 24 total" icon={<BookOpen />} />
        <StatCard title="Study Time" value="32h" sub="4h more than last month" icon={<Clock />} />
      </div>

      <div className="top-row-layout">
        <section className="content-card performance-section">
          <h3>Performance Trend</h3>
          <p className="card-subtitle">Your quiz scores vs class average over the semester</p>
          <div className="chart-container">
            <Line data={chartData} options={chartOptions} />
          </div>
        </section>

        <section className="content-card scores-section">
          <h3>Subject Scores</h3>
          <div className="card-body-grow">
            <ScoreBar label="Data Structures" value={85} color="#1d4ed8" />
            <ScoreBar label="Algorithms" value={72} color="#059669" />
            <ScoreBar label="Databases" value={90} color="#d97706" />
            <ScoreBar label="Networks" value={65} color="#7c3aed" />
          </div>
        </section>
      </div>

      <div className="bottom-row-layout">
        <section className="content-card">
          <h3><Calendar size={18} /> Upcoming Sessions</h3>
          <div className="card-body-grow">
            <SessionItem title="Data Structures" tutor="Dr. Smith" time="Today, 2:00 PM" duration="50 min" />
            <SessionItem title="Algorithms" tutor="Dr. Patel" time="Tomorrow, 10:00 AM" duration="45 min" />
            <SessionItem title="Database Systems" tutor="Dr. Lee" time="Wed, 1:00 PM" duration="55 min" />
          </div>
        </section>

        <section className="content-card">
          <h3><CheckCircle size={18} /> Recent Quizzes</h3>
          <div className="card-body-grow">
            <QuizItem title="Binary Trees" date="Today" score="4/5" status="pass" />
            <QuizItem title="SQL Joins" date="Yesterday" score="5/5" status="pass" />
            <QuizItem title="Graph Traversal" date="2 days ago" score="2/5" status="fail" />
            <QuizItem title="Normalization" date="3 days ago" score="4/5" status="pass" />
          </div>
        </section>

        <section className="content-card focus-section">
          <h3><AlertTriangle size={18} /> Focus Areas</h3>
          <div className="card-body-grow">
            <FocusItem title="Graph Traversal" subject="Algorithms" percent={35} />
            <FocusItem title="TCP/IP Layers" subject="Networks" percent={40} />
            <FocusItem title="Heap Operations" subject="Data Structures" percent={45} />
          </div>
          <p className="focus-footer">Topics with less than 50% quiz accuracy. Review these before the next session.</p>
        </section>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, sub, icon }) => (
  <div className="stat-card">
    <div className="stat-info">
      <p className="stat-label">{title}</p>
      <p className="stat-main">{value}</p>
      <p className="stat-trend">↑ {sub}</p>
    </div>
    <div className="stat-icon-container">{icon}</div>
  </div>
);

const SessionItem = ({ title, tutor, time, duration }) => (
  <div className="table-row">
    <div className="row-left">
      <p className="bold-text">{title}</p>
      <p className="sub-text">{tutor}</p>
    </div>
    <div className="row-right" style={{ textAlign: 'right' }}>
      <p className="highlight-text">{time}</p>
      <p className="sub-text">{duration}</p>
    </div>
  </div>
);

const QuizItem = ({ title, date, score, status }) => (
  <div className="table-row">
    <div className="row-left flex-align">
      {status === 'pass' ? <CheckCircle size={16} className="pass-icon" /> : <XCircle size={16} className="fail-icon" />}
      <div className="margin-left">
        <p className="bold-text">{title}</p>
        <p className="sub-text">{date}</p>
      </div>
    </div>
    <span className={`status-pill ${status}`}>{score}</span>
  </div>
);

const ScoreBar = ({ label, value, color }) => (
  <div className="bar-wrapper">
    <div className="bar-labels">
      <span>{label}</span>
      <span>{value}%</span>
    </div>
    <div className="bar-background">
      <div className="bar-fill" style={{ width: `${value}%`, backgroundColor: color }}></div>
    </div>
  </div>
);

const FocusItem = ({ title, subject, percent }) => (
  <div className="focus-item-wrap">
    <div className="bar-labels">
      <div>
        <p className="bold-text">{title}</p>
        <p className="sub-text">{subject}</p>
      </div>
      <p className="fail-text">{percent}%</p>
    </div>
    <div className="bar-background small">
      <div className="bar-fill blue-fill" style={{ width: `${percent}%` }}></div>
    </div>
  </div>
);

export default StudentResults;