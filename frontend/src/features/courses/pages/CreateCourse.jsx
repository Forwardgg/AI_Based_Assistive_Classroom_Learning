import { useState } from "react";
import { createCourse } from "../courseAPI";
import "./CreateCourse.css";

const CreateCourse = ({ onCourseCreated }) => {
  const [form, setForm] = useState({
    course_name: "",
    year: "",
    semester: "spring",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createCourse({
        ...form,
        year: parseInt(form.year),
      });
      setForm({
        course_name: "",
        year: "",
        semester: "spring",
      });
      onCourseCreated();
    } catch (err) {
      alert("Failed to create course");
    }
  };

  return (
    <div className="create-course-card">
      <div className="card-header">
        <h3>Create New Course</h3>
        <p>Add a new course to the system</p>
      </div>
      
      <form onSubmit={handleSubmit} className="course-form">
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="course_name">Course Name</label>
            <input
              id="course_name"
              type="text"
              name="course_name"
              placeholder="e.g., Introduction to Computer Science"
              value={form.course_name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="year">Year</label>
              <input
                id="year"
                type="number"
                name="year"
                placeholder="2024"
                value={form.year}
                onChange={handleChange}
                min="2000"
                max="2100"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="semester">Semester</label>
              <div className="select-wrapper">
                <select
                  id="semester"
                  name="semester"
                  value={form.semester}
                  onChange={handleChange}
                  required
                >
                  <option value="spring">Spring Semester</option>
                  <option value="autumn">Autumn Semester</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="create-button">
            <svg className="button-icon" viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Create Course
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateCourse;