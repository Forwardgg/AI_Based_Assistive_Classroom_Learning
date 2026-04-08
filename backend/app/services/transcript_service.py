from app import db
from app.models.transcript_segment import TranscriptSegment
from app.models.transcript import Transcript


# Inserts a transcript segment for a given partition
def store_segment(partition_id, text):

    try:

        # Determine next segment index based on existing count
        next_index = TranscriptSegment.query.filter_by(
            partition_id=partition_id
        ).count()

        # Create new transcript segment
        segment = TranscriptSegment(
            partition_id=partition_id,
            segment_index=next_index,
            text=text
        )

        # Save segment to database
        db.session.add(segment)
        db.session.commit()

        return segment

    except Exception as e:

        # Rollback transaction on failure
        db.session.rollback()
        print("Segment DB insert failed:", e)
        raise


# Combines all segments of a partition into a final transcript
def finalize_partition_transcript(partition_id):

    try:

        # Check if transcript already exists to avoid duplication
        existing = Transcript.query.filter_by(
            partition_id=partition_id
        ).first()

        if existing:
            return existing

        # Fetch all segments in order
        segments = (
            TranscriptSegment.query
            .filter_by(partition_id=partition_id)
            .order_by(TranscriptSegment.segment_index)
            .all()
        )

        # If no segments found, return None
        if not segments:
            return None

        # Combine all segment texts into one string
        full_text = " ".join(
            s.text.strip()
            for s in segments
            if s.text and s.text.strip()
        )

        # Remove newline characters
        full_text = full_text.replace("\n", " ")

        # Normalize spacing (remove extra spaces)
        full_text = " ".join(full_text.split())

        # Trim leading and trailing whitespace
        full_text = full_text.strip()

        # Create final transcript record
        transcript = Transcript(
            partition_id=partition_id,
            transcript_text=full_text
        )

        # Save transcript to database
        db.session.add(transcript)
        db.session.commit()

        return transcript

    except Exception as e:

        # Rollback transaction on failure
        db.session.rollback()
        print("Transcript finalize failed:", e)
        raise