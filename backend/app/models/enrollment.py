# backend/app/models/enrollment.py
from app import db

class Enrollment(db.Model):
    __tablename__ = "enrollments"

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    course_id = db.Column(db.Integer, db.ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    roll_no = db.Column(db.String(20), nullable=False)

    __table_args__ = (
        db.UniqueConstraint("student_id", "course_id", name="unique_enrollment"),
    )

    student = db.relationship("User", backref="enrollments")
    course = db.relationship("Course", backref="enrollments")