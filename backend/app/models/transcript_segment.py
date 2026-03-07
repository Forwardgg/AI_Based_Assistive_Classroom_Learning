# backend/app/models/transcript_segment.py

from app import db
from datetime import datetime

class TranscriptSegment(db.Model):
    __tablename__ = "transcript_segments"

    id = db.Column(db.Integer, primary_key=True)

    partition_id = db.Column(
        db.Integer,
        db.ForeignKey("session_partitions.id", ondelete="CASCADE"),
        nullable=False
    )

    segment_index = db.Column(db.Integer, nullable=False)

    text = db.Column(db.Text, nullable=False)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    partition = db.relationship(
        "SessionPartition",
        backref="segments",
        passive_deletes=True
    )

    __table_args__ = (
        db.UniqueConstraint("partition_id", "segment_index"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "partition_id": self.partition_id,
            "segment_index": self.segment_index,
            "text": self.text,
            "created_at": self.created_at
        }