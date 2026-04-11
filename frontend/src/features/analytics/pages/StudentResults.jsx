import React from 'react';
import { TrendingUp, Users } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import './StudentResults.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const StudentResults = () => {

  // 🔵 LINE CHART
  const lineData = {
    labels: ['Mar 12', 'Mar 19', 'Mar 26', 'Apr 2', 'Apr 5', 'Apr 8', 'Apr 11'],
    datasets: [{
      data: [62, 68, 58, 74, 71, 80, 76],
      borderColor: '#2563eb',
      backgroundColor: 'rgba(37, 99, 235, 0.05)',
      fill: true,
      tension: 0.4,
      pointRadius: 3,
      pointBackgroundColor: '#2563eb',
    }]
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: {
        min: 0,
        max: 100,
        ticks: { stepSize: 25, callback: (v) => v + '%' },
        grid: { borderDash: [5, 5], drawBorder: false }
      },
      x: { grid: { display: false } }
    }
  };

  // 🔵 BAR CHART
  const barData = {
    labels: ['Data Structures', 'Algorithms', 'DBMS', 'OS'],
    datasets: [
      {
        label: 'You',
        data: [80, 60, 100, 60],
        backgroundColor: '#2563eb',
        borderRadius: 4,
      },
      {
        label: 'Class Avg',
        data: [68, 65, 72, 58],
        backgroundColor: '#e2e8f0',
        borderRadius: 4,
      }
    ]
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: {
        min: 0,
        max: 100,
        ticks: { stepSize: 25, callback: (v) => v + '%' },
        grid: { borderDash: [5, 5], drawBorder: false }
      },
      x: { grid: { display: false } }
    }
  };

  return (
    <div className="dashboard-container">

      <header className="header">
        <h1>Analytics</h1>
        <p>Your performance insights</p>
      </header>

      <div className="charts-grid">

        {/* LINE CHART */}
        <div className="chart-card">
          <div className="chart-header">
            <h3><TrendingUp size={18} className="icon-blue" /> Accuracy Trend</h3>
          </div>
          <p className="chart-sub">Performance over time</p>
          <div className="chart-wrapper">
            <Line data={lineData} options={lineOptions} />
          </div>
        </div>

        {/* BAR CHART */}
        <div className="chart-card">
          <div className="chart-header">
            <h3><Users size={18} className="icon-blue" /> You vs Class</h3>
          </div>
          <p className="chart-sub">Comparison by subject</p>
          <div className="chart-wrapper">
            <Bar data={barData} options={barOptions} />
          </div>

          <div className="custom-legend">
            <span><i className="dot blue"></i> You</span>
            <span><i className="dot gray"></i> Class Avg</span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default StudentResults;