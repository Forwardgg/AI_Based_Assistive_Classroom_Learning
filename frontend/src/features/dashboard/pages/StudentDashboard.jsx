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
      await joinCourse({ class_code: classCode, roll_no: rollNo });
      setClassCode("");
      setRollNo("");
      fetchCourses();
    } catch (err) {
      alert("Failed to join course. Check class code and roll number.");
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1>Student Dashboard</h1>
          <p className="subtitle">Join courses and track your enrolled classes</p>
        </div>
        <div className="badge">
          <span>Enrolled: {courses.length}</span>
        </div>
      </div>

      <div className="join-section">
        <h2>Join a New Course</h2>
        <form onSubmit={handleJoin} className="join-form">
          <input
            type="text"
            placeholder="Class Code (e.g., CS101-2024)"
            value={classCode}
            onChange={(e) => setClassCode(e.target.value)}
            disabled={joining}
          />
          <input
            type="text"
            placeholder="Roll Number (e.g., 2024001)"
            value={rollNo}
            onChange={(e) => setRollNo(e.target.value)}
            disabled={joining}
          />
          <button type="submit" disabled={joining}>
            {joining ? "Joining..." : "Join Course"}
          </button>
        </form>
      </div>

      <div className="courses-section">
        <h2>Your Enrolled Courses</h2>

        {loading ? (
          <div className="loading">Loading courses...</div>
        ) : courses.length === 0 ? (
          <div className="empty">
            <p>No enrolled courses</p>
            <p className="hint">Join a course using the class code above</p>
          </div>
        ) : (
          <div className="courses-grid">
            {courses.map((course) => (
              <div key={course.id} className="course-card">
                <div className="card-header">
                  <div className="course-icon">
                    {course.course_name.charAt(0)}
                  </div>
                  <span className="status">Enrolled</span>
                </div>
                
                <h3>{course.course_name}</h3>
                
                <div className="details">
                  <p>📅 {course.semester} {course.year}</p>
                  <p>🔑 {course.class_code}</p>
                  {course.roll_no && <p>👤 Roll: {course.roll_no}</p>}
                </div>

                <div className="card-actions">
                  <button>View</button>
                  <button>Materials</button>
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