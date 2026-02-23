import { useEffect, useState } from "react";
import { getCourses } from "../../courses/courseAPI";
import CreateCourse from "../../courses/pages/CreateCourse";
import "./ProfessorDashboard.css";

const ProfessorDashboard = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="dashboard-container">
      {/* Header Section */}
      <div className="dashboard-header">
        <div className="header-content">
          <h1>Professor Dashboard</h1>
          <p className="welcome-text">Manage your courses and view class information</p>
        </div>
        <div className="header-stats">
          <div className="stat-badge">
            <span className="stat-label">Total Courses</span>
            <span className="stat-value">{courses.length}</span>
          </div>
        </div>
      </div>

      {/* Create Course Section */}
      <div className="create-course-wrapper">
        <CreateCourse onCourseCreated={fetchCourses} />
      </div>

      {/* Courses List Section */}
      <div className="courses-section">
        <div className="section-header">
          <h2>Your Courses</h2>
          {!loading && courses.length > 0 && (
            <span className="course-count">{courses.length} courses</span>
          )}
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading your courses...</p>
          </div>
        ) : courses.length === 0 ? (
          <div className="empty-state">
            <svg className="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              <circle cx="12" cy="12" r="10" />
            </svg>
            <h3>No Courses Yet</h3>
            <p>Get started by creating your first course above</p>
          </div>
        ) : (
          <div className="courses-grid">
            {courses.map((course) => (
              <div key={course.id} className="course-card">
                <div className="course-card-header">
                  <div className="course-icon">
                    {course.course_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="course-actions">
                    <button className="action-button" title="View Details">
                      <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none">
                        <circle cx="12" cy="12" r="2" />
                        <circle cx="12" cy="5" r="2" />
                        <circle cx="12" cy="19" r="2" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                <div className="course-card-body">
                  <h3 className="course-name">{course.course_name}</h3>
                  
                  <div className="course-details">
                    <div className="detail-item">
                      <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                      </svg>
                      <span>{course.semester.charAt(0).toUpperCase() + course.semester.slice(1)} {course.year}</span>
                    </div>
                    
                    <div className="detail-item class-code">
                      <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="3" y1="9" x2="21" y2="9"></line>
                        <line x1="9" y1="21" x2="9" y2="9"></line>
                      </svg>
                      <span>Class Code: <strong>{course.class_code}</strong></span>
                    </div>
                  </div>
                </div>
                
                <div className="course-card-footer">
                  <button className="footer-button view-button">
                    View Course
                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none">
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                      <polyline points="12 5 19 12 12 19"></polyline>
                    </svg>
                  </button>
                  <button className="footer-button manage-button">
                    Manage
                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none">
                      <circle cx="12" cy="12" r="3"></circle>
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H5.78a1.65 1.65 0 0 0-1.51 1 1.65 1.65 0 0 0 .33 1.82l.04.04A10 10 0 0 0 12 17.66a10 10 0 0 0 6.36-2.62z"></path>
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfessorDashboard;