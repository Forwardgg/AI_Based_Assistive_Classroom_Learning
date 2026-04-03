// frontend/src/features/courses/pages/ProfessorCourses.jsx
import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getCourses } from "../courseAPI";
import CreateCourse from "./CreateCourse";
import SessionModal from "../../lectures/pages/SessionModal";
import "./ProfessorCourses.css";

const ProfessorCourses = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);

  // 🔍 SEARCH + SORT + FILTER STATES
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("name");
  const [semesterFilter, setSemesterFilter] = useState("all");

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
  // FILTER + SORT LOGIC
  // =========================
  const filteredCourses = useMemo(() => {
    let result = [...courses];

    // 🔍 SEARCH
    if (search.trim()) {
      result = result.filter((course) =>
        course.course_name.toLowerCase().includes(search.toLowerCase()) ||
        course.class_code.toLowerCase().includes(search.toLowerCase())
      );
    }

    // 🎛 FILTER (semester)
    if (semesterFilter !== "all") {
      result = result.filter(
        (course) => course.semester === semesterFilter
      );
    }

    // 🔽 SORT
    switch (sort) {
      case "name":
        result.sort((a, b) =>
          a.course_name.localeCompare(b.course_name)
        );
        break;
      case "year":
        result.sort((a, b) => b.year - a.year);
        break;
      case "semester":
        result.sort((a, b) =>
          a.semester.localeCompare(b.semester)
        );
        break;
      default:
        break;
    }

    return result;
  }, [courses, search, sort, semesterFilter]);

  // =========================
  // COPY CODE
  // =========================
  const handleCopy = (code) => {
    navigator.clipboard.writeText(code);
    alert("Class code copied!");
  };

  return (
    <div className="courses-container">

      {/* HEADER */}
      <div className="courses-header">
        <h1>Courses</h1>
        <p>Manage and organize your courses</p>
      </div>

      {/* CREATE COURSE */}
      <CreateCourse onCourseCreated={fetchCourses} />

      {/* CONTROLS */}
      <div className="courses-controls">

        {/* SEARCH */}
        <input
          type="text"
          placeholder="Search by name or code..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
        />

        {/* FILTER */}
        <select
          value={semesterFilter}
          onChange={(e) => setSemesterFilter(e.target.value)}
          className="filter-select"
        >
          <option value="all">All Semesters</option>
          <option value="spring">Spring</option>
          <option value="autumn">Autumn</option>
        </select>

        {/* SORT */}
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="sort-select"
        >
          <option value="name">Sort by Name</option>
          <option value="year">Sort by Year</option>
          <option value="semester">Sort by Semester</option>
        </select>

      </div>

      {/* COURSE LIST */}
      <div className="courses-section">
        {loading ? (
          <p>Loading courses...</p>
        ) : filteredCourses.length === 0 ? (
          <p className="empty-state">
            No matching courses found
          </p>
        ) : (
          <div className="course-grid">
            {filteredCourses.map((course) => (
              <div key={course.id} className="course-card">

                <div className="course-info">
                  <h3>{course.course_name}</h3>
                  <p className="meta">
                    {course.semester} {course.year}
                  </p>
                  <p className="code">
                    Code: <span>{course.class_code}</span>
                  </p>
                </div>

                {/* ACTIONS */}
                <div className="course-actions">

                  <button
                    className="btn btn-open"
                    onClick={() =>
                      navigate(
                        `/dashboard/professor/courses/${course.id}`
                      )
                    }
                  >
                    Open
                  </button>

                  <button
                    className="btn btn-start"
                    onClick={() => {
                      setSelectedCourse(course.id);
                      setShowModal(true);
                    }}
                  >
                    Start Session
                  </button>

                  <button
                    className="btn btn-copy"
                    onClick={() => handleCopy(course.class_code)}
                  >
                    Copy Code
                  </button>

                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SESSION MODAL */}
      {showModal && (
        <SessionModal
          courseId={selectedCourse}
          onClose={() => setShowModal(false)}
          onCreate={() => setShowModal(false)}
        />
      )}

    </div>
  );
};

export default ProfessorCourses;