from app import db
from datetime import datetime


class StudentAnswer(db.Model):
    __tablename__ = "student_answers"

    id = db.Column(db.Integer, primary_key=True)

    question_id = db.Column(
        db.Integer,
        db.ForeignKey("questions.id", ondelete="CASCADE"),
        nullable=False
    )

    student_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )

    selected_option = db.Column(db.String(1), nullable=False)

    is_correct = db.Column(db.Boolean, nullable=False)

    answered_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )