# backend/app/models/transcript.py

from app import db

class Transcript(db.Model):
    __tablename__ = "transcripts"

    id = db.Column(db.Integer, primary_key=True)

    partition_id = db.Column(
        db.Integer,
        db.ForeignKey("session_partitions.id", ondelete="CASCADE"),
        unique=True,
        nullable=False
    )

    transcript_text = db.Column(db.Text, nullable=False)

    partition = db.relationship(
        "SessionPartition",
        backref="transcript",
        passive_deletes=True
    )

    def to_dict(self):
        return {
            "id": self.id,
            "partition_id": self.partition_id,
            "transcript_text": self.transcript_text
        }