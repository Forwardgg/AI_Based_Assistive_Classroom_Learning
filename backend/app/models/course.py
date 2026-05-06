# backend/app/models/course.py

from app import db                      # Import the SQLAlchemy database instance
from datetime import datetime          # Used to store timestamps

class Course(db.Model):
    __tablename__ = "courses"

    id = db.Column(db.Integer, primary_key=True)

    # Name of the course (required field, max length 100 characters)
    course_name = db.Column(db.String(100), nullable=False)

    # Academic year (e.g., 2025) - required
    year = db.Column(db.Integer, nullable=False)

    # Semester field using ENUM (only allows "spring" or "autumn")
    semester = db.Column(
        db.Enum("spring", "autumn", name="semester_type"),
        nullable=False
    )

    # Unique course code (e.g., CS101), max length 8 characters
    class_code = db.Column(db.String(8), unique=True, nullable=False)

    # Foreign key linking to users table (professor who teaches the course)
    # ondelete="CASCADE" → if the professor is deleted, this course is also deleted
    professor_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )

    # Timestamp when the course was created (defaults to current UTC time)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationship with User model
    # Allows accessing the professor object from a course
    # Also adds 'courses' attribute to User (backref)
    professor = db.relationship("User", backref="courses")

    # Convert the Course object into a dictionary (useful for APIs/JSON responses)
    def to_dict(self):
        return {
            "id": self.id,                   # Course ID
            "course_name": self.course_name, # Course name
            "year": self.year,               # Year
            "semester": self.semester,       # Semester (spring/autumn)
            "class_code": self.class_code,   # Unique class code
            "professor_id": self.professor_id # Linked professor ID
        }