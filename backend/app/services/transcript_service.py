from app import db
from app.models.transcript_segment import TranscriptSegment
from app.models.transcript import Transcript


# Inserts a transcript segment for a given partition
def store_segment(partition_id, text):

    try:
        # determine next index (keeps segments ordered)
        next_index = TranscriptSegment.query.filter_by(
            partition_id=partition_id
        ).count()

        segment = TranscriptSegment(
            partition_id=partition_id,
            segment_index=next_index,
            text=text
        )

        db.session.add(segment)
        db.session.commit()  # persist segment

        return segment

    except Exception as e:
        db.session.rollback()  # revert on failure
        print("Segment DB insert failed:", e)
        raise


# Combines all segments of a partition into a final transcript
def finalize_partition_transcript(partition_id):

    try:
        # avoid duplicate transcript creation
        existing = Transcript.query.filter_by(
            partition_id=partition_id
        ).first()

        if existing:
            return existing

        # fetch segments in correct order
        segments = (
            TranscriptSegment.query
            .filter_by(partition_id=partition_id)
            .order_by(TranscriptSegment.segment_index)
            .all()
        )

        if not segments:
            return None

        # merge all segment texts
        full_text = " ".join(
            s.text.strip()
            for s in segments
            if s.text and s.text.strip()
        )

        full_text = full_text.replace("\n", " ")  # remove line breaks
        full_text = " ".join(full_text.split())  # normalize spaces
        full_text = full_text.strip()  # clean edges

        transcript = Transcript(
            partition_id=partition_id,
            transcript_text=full_text
        )

        db.session.add(transcript)
        db.session.commit()  # save final transcript

        return transcript

    except Exception as e:
        db.session.rollback()
        print("Transcript finalize failed:", e)
        raise