# backend/app/models/course.py
from app import db
from datetime import datetime

class Course(db.Model):
    __tablename__ = "courses"

    id = db.Column(db.Integer, primary_key=True)
    course_name = db.Column(db.String(100), nullable=False)
    year = db.Column(db.Integer, nullable=False)
    semester = db.Column(db.Enum("spring", "autumn", name="semester_type"), nullable=False)
    class_code = db.Column(db.String(8), unique=True, nullable=False)
    professor_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    professor = db.relationship("User", backref="courses")

    def to_dict(self):
        return {
            "id": self.id,
            "course_name": self.course_name,
            "year": self.year,
            "semester": self.semester,
            "class_code": self.class_code,
            "professor_id": self.professor_id
        }