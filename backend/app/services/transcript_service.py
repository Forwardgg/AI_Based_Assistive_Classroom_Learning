# backend/app/services/transcript_service.py

from app import db
from app.models.transcript_segment import TranscriptSegment
from app.models.transcript import Transcript


# =========================
# STORE TRANSCRIPT SEGMENT
# =========================
def store_segment(partition_id, text):

    # Find last segment index
    last_segment = (
        TranscriptSegment.query
        .filter_by(partition_id=partition_id)
        .order_by(TranscriptSegment.segment_index.desc())
        .first()
    )

    next_index = 0
    if last_segment:
        next_index = last_segment.segment_index + 1

    segment = TranscriptSegment(
        partition_id=partition_id,
        segment_index=next_index,
        text=text
    )

    db.session.add(segment)
    db.session.commit()

    return segment


# =========================
# FINALIZE PARTITION
# =========================
def finalize_partition_transcript(partition_id):

    existing = Transcript.query.filter_by(
        partition_id=partition_id
    ).first()

    if existing:
        return existing

    segments = (
        TranscriptSegment.query
        .filter_by(partition_id=partition_id)
        .order_by(TranscriptSegment.segment_index)
        .all()
    )

    if not segments:
        return None

    full_text = " ".join(
        s.text.strip()
        for s in segments
        if s.text and s.text.strip()
    )

    transcript = Transcript(
        partition_id=partition_id,
        transcript_text=full_text
    )

    db.session.add(transcript)
    db.session.commit()

    return transcript
