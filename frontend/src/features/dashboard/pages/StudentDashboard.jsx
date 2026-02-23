import { useEffect, useState } from "react";
import { getCourses, joinCourse } from "../../courses/courseAPI";
import "./StudentDashboard.css";

const StudentDashboard = () => {
  const [courses, setCourses] = useState([]);
  const [classCode, setClassCode] = useState("");
  const [rollNo, setRollNo] = useState("");
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

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

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!classCode.trim() || !rollNo.trim()) {
      alert("Please fill in both fields");
      return;
    }

    setJoining(true);
    try {
      await joinCourse({
        class_code: classCode,
        roll_no: rollNo,
      });
      setClassCode("");
      setRollNo("");
      fetchCourses();
    } catch (err) {
      alert("Failed to join course. Please check your class code and roll number.");
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="student-dashboard">
      {/* Header Section */}
      <div className="dashboard-header">
        <div className="header-content">
          <h1>Student Dashboard</h1>
          <p className="welcome-text">Join courses and track your enrolled classes</p>
        </div>
        <div className="header-stats">
          <div className="stat-badge">
            <span className="stat-label">Enrolled Courses</span>
            <span className="stat-value">{courses.length}</span>
          </div>
        </div>
      </div>

      {/* Join Course Section */}
      <div className="join-course-section">
        <div className="section-header">
          <h2>Join a New Course</h2>
          <p>Enter the class code provided by your professor</p>
        </div>
        
        <form onSubmit={handleJoin} className="join-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="classCode">Class Code</label>
              <div className="input-wrapper">
                <svg className="input-icon" viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="3" y1="9" x2="21" y2="9"></line>
                  <line x1="9" y1="21" x2="9" y2="9"></line>
                </svg>
                <input
                  id="classCode"
                  type="text"
                  placeholder="e.g., CS101-2024"
                  value={classCode}
                  onChange={(e) => setClassCode(e.target.value)}
                  disabled={joining}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="rollNo">Roll Number</label>
              <div className="input-wrapper">
                <svg className="input-icon" viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                <input
                  id="rollNo"
                  type="text"
                  placeholder="e.g., 2024001"
                  value={rollNo}
                  onChange={(e) => setRollNo(e.target.value)}
                  disabled={joining}
                  required
                />
              </div>
            </div>

            <div className="form-group button-group">
              <button 
                type="submit" 
                className={`join-button ${joining ? "loading" : ""}`}
                disabled={joining}
              >
                {joining ? (
                  <>
                    <span className="spinner-small"></span>
                    Joining...
                  </>
                ) : (
                  <>
                    <svg className="button-icon" viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none">
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    Join Course
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Enrolled Courses Section */}
      <div className="courses-section">
        <div className="section-header">
          <h2>Your Enrolled Courses</h2>
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
            <h3>No Enrolled Courses</h3>
            <p>Join a course using the class code above</p>
          </div>
        ) : (
          <div className="courses-grid">
            {courses.map((course) => (
              <div key={course.id} className="course-card">
                <div className="course-card-header">
                  <div className="course-icon">
                    {course.course_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="course-status">
                    <span className="status-badge enrolled">Enrolled</span>
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
                    
                    <div className="detail-item">
                      <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="3" y1="9" x2="21" y2="9"></line>
                      </svg>
                      <span>Class Code: <strong>{course.class_code}</strong></span>
                    </div>

                    {course.roll_no && (
                      <div className="detail-item">
                        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                          <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                        <span>Roll No: <strong>{course.roll_no}</strong></span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="course-card-footer">
                  <button className="footer-button view-button">
                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none">
                      <circle cx="12" cy="12" r="3"></circle>
                      <path d="M22 12c-2.667 4.667-6 7-10 7s-7.333-2.333-10-7c2.667-4.667 6-7 10-7s7.333 2.333 10 7z"></path>
                    </svg>
                    View Details
                  </button>
                  <button className="footer-button materials-button">
                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                      <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                    Materials
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

export default StudentDashboard;