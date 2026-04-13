import React, { useEffect, useState } from 'react';
import {
  LogIn,
  GraduationCap,
  ExternalLink,
  Hash,
  UserCircle,
  Copy,
  Check
} from 'lucide-react';
import { getCourses, joinCourse } from '../courseAPI';
import { useNavigate } from 'react-router-dom';
import './StudentCourses.css';

const StudentCourses = () => {
  const [courses, setCourses] = useState([]);
  const [classCode, setClassCode] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  const navigate = useNavigate();

  // Fetch courses
  const fetchCourses = async () => {
    try {
      const res = await getCourses();
      setCourses(res.data || []);
    } catch (err) {
      console.error('Error fetching courses', err);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  // Join course
  const handleJoin = async () => {
    if (!classCode || !rollNo) return;

    try {
      setLoading(true);

      await joinCourse({
        class_code: classCode,
        roll_no: rollNo,
      });

      setClassCode('');
      setRollNo('');
      await fetchCourses();
    } catch (err) {
      console.error('Join failed', err);
      alert('Failed to join course');
    } finally {
      setLoading(false);
    }
  };

  // Copy handler
  const handleCopy = async (code, id) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(id);

      setTimeout(() => {
        setCopiedId(null);
      }, 1500);
    } catch (err) {
      console.error('Copy failed', err);
    }
  };

  return (
    <div className="dashboard-container">
      {/* Join Banner */}
      <section className="join-banner">
        <div className="join-header">
          <div className="icon-wrapper">
            <LogIn size={24} className="icon-blue" />
          </div>
          <div className="text-content">
            <h2>Join a Course</h2>
            <p>Enter your class code and roll number to enroll</p>
          </div>
        </div>

        <div className="join-controls">
          <div className="input-field">
            <Hash size={18} className="field-icon" />
            <input
              type="text"
              placeholder="Class Code (e.g. DS-2026S)"
              value={classCode}
              onChange={(e) => setClassCode(e.target.value)}
            />
          </div>

          <div className="input-field">
            <UserCircle size={18} className="field-icon" />
            <input
              type="text"
              placeholder="Roll Number"
              value={rollNo}
              onChange={(e) => setRollNo(e.target.value)}
            />
          </div>

          <button
            className="join-button"
            onClick={handleJoin}
            disabled={loading}
          >
            <LogIn size={18} />
            {loading ? 'Joining...' : 'Join Course'}
          </button>
        </div>
      </section>

      {/* Courses */}
      <section className="courses-wrapper">
        <div className="section-header">
          <GraduationCap size={24} className="navy-dark" />
          <h1>My Courses</h1>
          <span className="badge">{courses.length}</span>
        </div>

        <div className="courses-grid">
          {courses.length === 0 ? (
            <p className="empty-text">No courses joined yet.</p>
          ) : (
            courses.map((course) => (
              <div key={course.id} className="course-card">
                <div className="card-top">
                  <h3>{course.course_name}</h3>

                  <p className="term">
                    {course.semester} {course.year}
                  </p>

                  <div className="tag-container">
                    <span className="course-tag">
                      {course.class_code}
                    </span>

                    {/* ✅ COPY BUTTON */}
                    <button
                      className="copy-btn"
                      onClick={() =>
                        handleCopy(course.class_code, course.id)
                      }
                    >
                      {copiedId === course.id ? (
                        <Check size={16} />
                      ) : (
                        <Copy size={16} />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  className="open-button"
                  onClick={() =>
                    navigate(`/dashboard/student/courses/${course.id}`)
                  }
                >
                  <ExternalLink size={18} />
                  Open Course
                </button>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};

export default StudentCourses;