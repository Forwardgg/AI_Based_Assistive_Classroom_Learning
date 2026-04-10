import React, { useEffect, useState, useMemo } from "react";
import {
  Search,
  Plus,
  Filter,
  ArrowUpDown,
  ExternalLink,
  Copy,
  Video,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getCourses } from "../courseAPI";
import CreateCourse from "./CreateCourse";
import "./ProfessorCourses.css";

const ProfessorCourses = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [semesterFilter, setSemesterFilter] = useState("all");
  const [sort, setSort] = useState("name");

  const [showModal, setShowModal] = useState(false);

  const navigate = useNavigate();

  // =========================
  // FETCH COURSES
  // =========================
  const fetchCourses = async () => {
    setLoading(true);
    try {
      const res = await getCourses();
      setCourses(res.data);
    } catch (err) {
      console.error("Failed to fetch courses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  // =========================
  // FILTER + SORT
  // =========================
  const filteredCourses = useMemo(() => {
    let result = [...courses];

    if (search.trim()) {
      result = result.filter(
        (c) =>
          c.course_name.toLowerCase().includes(search.toLowerCase()) ||
          c.class_code.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (semesterFilter !== "all") {
      result = result.filter((c) => c.semester === semesterFilter);
    }

    switch (sort) {
      case "name":
        result.sort((a, b) => a.course_name.localeCompare(b.course_name));
        break;
      case "year":
        result.sort((a, b) => b.year - a.year);
        break;
      case "semester":
        result.sort((a, b) => a.semester.localeCompare(b.semester));
        break;
      default:
        break;
    }

    return result;
  }, [courses, search, semesterFilter, sort]);

  // =========================
  // COPY CODE
  // =========================
  const handleCopy = (code) => {
    navigator.clipboard.writeText(code);
  };

  return (
    <div className="courses-container">
      {/* HEADER */}
      <header className="header-section">
        <div className="header-left">
          <h1>Courses</h1>
          <p>Manage your courses and lecture sessions.</p>
        </div>

        <button
          className="create-btn"
          onClick={() => setShowModal(true)}
        >
          <Plus size={18} /> Create Course
        </button>
      </header>

      {/* TOOLBAR */}
      <div className="toolbar">
        <div className="search-wrapper">
          <Search className="search-icon" size={18} />
          <input
            type="text"
            placeholder="Search by name or class code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="filters">
          <div className="select-wrapper">
            <Filter size={16} />
            <select
              value={semesterFilter}
              onChange={(e) => setSemesterFilter(e.target.value)}
            >
              <option value="all">All Semesters</option>
              <option value="spring">Spring</option>
              <option value="autumn">Autumn</option>
            </select>
          </div>

          <div className="select-wrapper">
            <ArrowUpDown size={16} />
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="name">Name</option>
              <option value="year">Year</option>
              <option value="semester">Semester</option>
            </select>
          </div>
        </div>
      </div>

      {/* COURSE GRID */}
      <div className="course-grid">
        {loading ? (
          <p>Loading courses...</p>
        ) : filteredCourses.length === 0 ? (
          <p>No courses found</p>
        ) : (
          filteredCourses.map((course) => (
            <div key={course.id} className="course-card">
              <div className="card-header">
                <div>
                  <h3>{course.course_name}</h3>
                  <span className="subtitle">
                    {course.semester} {course.year} • {course.class_code}
                  </span>
                </div>

                {course.live && (
                  <span className="live-badge">
                    <Video size={12} /> Live
                  </span>
                )}
              </div>

              <div className="stats-row">
                <div className="stat-box">
                  <span className="stat-value">
                    {course.students_count || 0}
                  </span>
                  <span className="stat-label">Students</span>
                </div>

                <div className="stat-box">
                  <span className="stat-value">
                    {course.sessions_count || 0}
                  </span>
                  <span className="stat-label">Sessions</span>
                </div>

                <div className="stat-box">
                  <span className="stat-value">
                    {course.last_session || "-"}
                  </span>
                  <span className="stat-label">Last Session</span>
                </div>
              </div>

              <div className="card-footer">
                <button
                  className="btn-outline"
                  onClick={() =>
                    navigate(`/dashboard/professor/courses/${course.id}`)
                  }
                >
                  <ExternalLink size={16} /> Open
                </button>

                <button
                  className="btn-primary"
                  onClick={() => handleCopy(course.class_code)}
                >
                  <Copy size={16} /> Copy Code
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button
              className="modal-close"
              onClick={() => setShowModal(false)}
            >
              <X size={18} />
            </button>

            <CreateCourse
              onCourseCreated={() => {
                fetchCourses();
                setShowModal(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfessorCourses;