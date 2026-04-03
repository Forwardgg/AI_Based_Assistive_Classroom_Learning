from app import db

class LectureNotes(db.Model):
    __tablename__ = "lecture_notes"

    id = db.Column(db.Integer, primary_key=True)

    session_id = db.Column(
        db.Integer,
        db.ForeignKey("sessions.id", ondelete="CASCADE"),
        unique=True,
        nullable=False
    )

    summary_text = db.Column(db.Text, nullable=False)

    def to_dict(self):
        return {
            "session_id": self.session_id,
            "summary_text": self.summary_text
        }