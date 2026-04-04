import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getCourses } from "../../courses/courseAPI";
import api from "../../../services/api";
import "./ProfessorAnalytics.css";

const ProfessorAnalytics = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();

  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [sessions, setSessions] = useState([]);

  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingSessions, setLoadingSessions] = useState(false);

  // 🔍 UI STATE
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("latest");

  // 📄 Pagination
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 5;

  // =========================
  // FETCH COURSES
  // =========================
  const fetchCourses = async () => {
    setLoadingCourses(true);
    try {
      const res = await getCourses();
      const data = res.data || [];
      setCourses(data);

      if (courseId) {
        const found = data.find(c => c.id === parseInt(courseId));
        if (found) {
          setSelectedCourse(found);
          return;
        }
      }

      if (data.length > 0) {
        setSelectedCourse(data[0]);
      }

    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCourses(false);
    }
  };

  // =========================
  // FETCH SESSIONS
  // =========================
  const fetchSessions = async (cid) => {
    if (!cid) return;

    setLoadingSessions(true);
    try {
      const res = await api.get(`/courses/${cid}/sessions`);
      setSessions(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSessions(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      fetchSessions(selectedCourse.id);
    }
  }, [selectedCourse]);

  // =========================
  // FILTER + SORT
  // =========================
  const processedSessions = useMemo(() => {
    let data = [...sessions];

    // 🔍 Search
    if (search) {
      data = data.filter(s =>
        String(s.id).includes(search)
      );
    }

    // 🎛 Filter
    if (statusFilter !== "all") {
      data = data.filter(s => s.status === statusFilter);
    }

    // 🔽 Sort
    if (sortBy === "latest") {
      data.sort((a, b) => b.id - a.id);
    } else if (sortBy === "oldest") {
      data.sort((a, b) => a.id - b.id);
    } else if (sortBy === "duration") {
      data.sort((a, b) => b.duration_minutes - a.duration_minutes);
    }

    return data;
  }, [sessions, search, statusFilter, sortBy]);

  // =========================
  // PAGINATION
  // =========================
  const totalPages = Math.ceil(processedSessions.length / PAGE_SIZE);

  const paginatedSessions = processedSessions.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  // =========================
  // HANDLERS
  // =========================
  const handleCourseChange = (e) => {
    const cid = parseInt(e.target.value);
    const course = courses.find(c => c.id === cid);

    setSelectedCourse(course);
    setPage(1);
    navigate(`/dashboard/professor/analytics/${cid}`);
  };

  // =========================
  // UI
  // =========================
  if (loadingCourses) return <p>Loading courses...</p>;
  if (!selectedCourse) return <p>No courses available</p>;

  return (
    <div className="analytics-container">
      <h1>Professor Analytics</h1>

      {/* =========================
          CONTROLS
      ========================= */}
      <div className="controls">

        <select value={selectedCourse.id} onChange={handleCourseChange}>
          {courses.map(c => (
            <option key={c.id} value={c.id}>
              {c.course_name}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Search by session ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All</option>
          <option value="completed">Completed</option>
          <option value="active">Active</option>
          <option value="stopped">Stopped</option>
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="latest">Latest</option>
          <option value="oldest">Oldest</option>
          <option value="duration">Duration</option>
        </select>

      </div>

      {/* =========================
          SESSIONS
      ========================= */}
      {loadingSessions ? (
        <p>Loading sessions...</p>
      ) : paginatedSessions.length === 0 ? (
        <p>No sessions found</p>
      ) : (
        <>
          <div className="session-list">
            {paginatedSessions.map((session) => (
              <div key={session.id} className="session-card">

                <div className="session-header">
                  <h3>Session #{session.id}</h3>
                  <span className={`status ${session.status}`}>
                    {session.status}
                  </span>
                </div>

                <p>Duration: {session.duration_minutes} mins</p>

                <button
                  className="btn btn-analytics"
                  onClick={() =>
                    navigate(
                      `/dashboard/professor/analytics/session/${session.id}`
                    )
                  }
                >
                  View Analytics
                </button>

              </div>
            ))}
          </div>

          {/* =========================
              PAGINATION
          ========================= */}
          <div className="pagination">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
            >
              Prev
            </button>

            <span>
              Page {page} / {totalPages || 1}
            </span>

            <button
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default ProfessorAnalytics;