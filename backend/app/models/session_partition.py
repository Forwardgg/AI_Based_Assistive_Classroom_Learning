# backend/app/models/session_partition.py

from app import db


class SessionPartition(db.Model):
    __tablename__ = "session_partitions"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    session_id = db.Column(
        db.Integer,
        db.ForeignKey(
            "sessions.id",
            ondelete="CASCADE"
        ),
        nullable=False
    )

    partition_index = db.Column(
        db.Integer,
        nullable=False
    )

    start_minute = db.Column(
        db.Integer,
        nullable=False
    )

    end_minute = db.Column(
        db.Integer,
        nullable=False
    )

    name = db.Column(
        db.String(120),
        nullable=True
    )

    # =========================================
    # ONE TRANSCRIPT PER PARTITION
    # =========================================

    transcript = db.relationship(
        "Transcript",
        cascade="all, delete-orphan",
        passive_deletes=True,
        uselist=False
    )

    segments = db.relationship(
        "TranscriptSegment",
        cascade="all, delete-orphan",
        passive_deletes=True
    )

    # =========================================
    # ONE QUIZ PER PARTITION
    # =========================================

    quiz = db.relationship(
        "Quiz",
        cascade="all, delete-orphan",
        passive_deletes=True,
        uselist=False
    )

    def to_dict(self):
        return {
            "id": self.id,
            "session_id": self.session_id,
            "partition_index": self.partition_index,
            "start_minute": self.start_minute,
            "end_minute": self.end_minute,
            "name": self.name
        }