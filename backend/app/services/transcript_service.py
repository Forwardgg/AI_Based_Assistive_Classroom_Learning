from app import db
from app.models.transcript_segment import TranscriptSegment
from app.models.transcript import Transcript


# =========================
# STORE TRANSCRIPT SEGMENT
# =========================
def store_segment(partition_id, text):

    try:

        # generate next index safely
        next_index = TranscriptSegment.query.filter_by(
            partition_id=partition_id
        ).count()

        segment = TranscriptSegment(
            partition_id=partition_id,
            segment_index=next_index,
            text=text
        )

        db.session.add(segment)
        db.session.commit()

        return segment

    except Exception as e:

        db.session.rollback()
        print("Segment DB insert failed:", e)
        raise


# =========================
# FINALIZE PARTITION TRANSCRIPT
# =========================
def finalize_partition_transcript(partition_id):

    try:

        # prevent duplicate transcripts
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

        # combine segment text
        full_text = " ".join(
            s.text.strip()
            for s in segments
            if s.text and s.text.strip()
        )

        # =========================
        # CLEAN TRANSCRIPT TEXT
        # =========================

        # remove newlines
        full_text = full_text.replace("\n", " ")

        # remove repeated spaces
        full_text = " ".join(full_text.split())

        # optional: trim very long whitespace
        full_text = full_text.strip()

        transcript = Transcript(
            partition_id=partition_id,
            transcript_text=full_text
        )

        db.session.add(transcript)
        db.session.commit()

        return transcript

    except Exception as e:

        db.session.rollback()
        print("Transcript finalize failed:", e)
        raise