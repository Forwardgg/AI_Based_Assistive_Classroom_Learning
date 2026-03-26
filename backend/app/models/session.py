# backend/app/models/sessions.py

from app import db
from datetime import datetime

class Session(db.Model):
    __tablename__ = "sessions"

    id = db.Column(db.Integer, primary_key=True)

    course_id = db.Column(
        db.Integer,
        db.ForeignKey("courses.id", ondelete="CASCADE"),
        nullable=False
    )

    duration_minutes = db.Column(db.Integer, nullable=False)

    status = db.Column(
        db.Enum("scheduled", "active", "paused", "completed", "stopped",name="session_status"),
        default="scheduled",
        nullable=False
    )

    # 🔥 ADD THIS
    current_partition_index = db.Column(db.Integer, nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    course = db.relationship("Course", backref="sessions")

    partitions = db.relationship(
        "SessionPartition",
        backref="session",
        cascade="all, delete-orphan",
        order_by="SessionPartition.partition_index"
    )
    partition_start_time = db.Column(db.Integer)
    partition_end_time = db.Column(db.Integer)

    def to_dict(self):
        return {
            "id": self.id,
            "course_id": self.course_id,
            "duration_minutes": self.duration_minutes,
            "status": self.status,
            "current_partition_index": self.current_partition_index,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }