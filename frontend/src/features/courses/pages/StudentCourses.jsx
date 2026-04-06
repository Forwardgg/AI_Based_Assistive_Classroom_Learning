import { useEffect, useState } from "react";
import { getCourses, joinCourse } from "../courseAPI";
import { useNavigate } from "react-router-dom";
import "./StudentCourses.css";

const StudentCourses = () => {
  const [courses, setCourses] = useState([]);
  const [classCode, setClassCode] = useState("");
  const [rollNo, setRollNo] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const fetchCourses = async () => {
    try {
      const res = await getCourses();
      setCourses(res.data);
    } catch (err) {
      console.error("Error fetching courses", err);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const handleJoin = async () => {
    if (!classCode || !rollNo) return;

    try {
      setLoading(true);
      await joinCourse({
        class_code: classCode,
        roll_no: rollNo,
      });

      setClassCode("");
      setRollNo("");

      await fetchCourses();
    } catch (err) {
      console.error("Join failed", err);
      alert("Failed to join course");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="student-courses-container">
      {/* Join Section */}
      <div className="join-section">
        <h2>Join Course</h2>

        <input
          type="text"
          placeholder="Class Code"
          value={classCode}
          onChange={(e) => setClassCode(e.target.value)}
        />

        <input
          type="text"
          placeholder="Roll Number"
          value={rollNo}
          onChange={(e) => setRollNo(e.target.value)}
        />

        <button onClick={handleJoin} disabled={loading}>
          {loading ? "Joining..." : "Join"}
        </button>
      </div>

      {/* Course List */}
      <div className="courses-section">
        <h2>My Courses</h2>

        {courses.length === 0 ? (
          <p>No courses joined yet.</p>
        ) : (
          <div className="courses-grid">
            {courses.map((course) => (
              <div key={course.id} className="course-card">
                <h3>{course.course_name}</h3>
                <p>
                  {course.semester} {course.year}
                </p>
                <p className="code">Code: {course.class_code}</p>

                <button
                  onClick={() =>
                    navigate(`/dashboard/student/courses/${course.id}`)
                  }
                >
                  Open
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentCourses;