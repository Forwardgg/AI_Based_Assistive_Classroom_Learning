from app import db
from datetime import datetime


class Quiz(db.Model):
    __tablename__ = "quizzes"

    id = db.Column(db.Integer, primary_key=True)

    partition_id = db.Column(
        db.Integer,
        db.ForeignKey("session_partitions.id", ondelete="CASCADE"),
        unique=True,
        nullable=False
    )

    source = db.Column(db.String(10), nullable=False)  # 'AI' or 'manual'

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )

    # relationship
    questions = db.relationship(
        "Question",
        backref="quiz",
        cascade="all, delete-orphan",
        lazy=True
    )

    def to_dict(self):
        return {
            "id": self.id,
            "partition_id": self.partition_id,
            "source": self.source,
            "created_at": self.created_at
        }