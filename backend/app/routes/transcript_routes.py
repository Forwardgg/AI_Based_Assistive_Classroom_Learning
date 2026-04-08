# backend/app/routes/transcript_routes.py

import os
import uuid
import subprocess
import traceback

from flask import Blueprint, request, jsonify, current_app
from concurrent.futures import ThreadPoolExecutor

from app import socketio
from app.models.session import Session
from app.models.session_partition import SessionPartition
from app.services.whisper_service import transcribe_audio
from app.services.transcript_service import store_segment


transcript_bp = Blueprint("transcripts", __name__)

# Directory where uploaded audio files are temporarily stored
UPLOAD_FOLDER = "recordings"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Thread pool to limit concurrent background processing
executor = ThreadPoolExecutor(max_workers=4)


def process_audio_chunk(app, filepath, partition_id, session_id):

    # Run inside Flask app context for DB and config access
    with app.app_context():

        # Convert webm file path to wav path
        wav_path = filepath.replace(".webm", ".wav")

        try:

            # Convert audio to 16kHz mono WAV using FFmpeg (required for Whisper)
            result = subprocess.run(
                [
                    "ffmpeg",
                    "-y",
                    "-i", filepath,
                    "-ar", "16000",
                    "-ac", "1",
                    "-c:a", "pcm_s16le",
                    wav_path
                ],
                capture_output=True
            )

            # Check if conversion succeeded
            if not os.path.exists(wav_path):
                print("FFmpeg failed:")
                print(result.stderr.decode())
                return

            # Transcribe audio using Whisper
            text = transcribe_audio(wav_path)

            # Store transcript segment in database
            segment = store_segment(partition_id, text)

            print("\n==============================")
            print("TRANSCRIPT SEGMENT")
            print(text)
            print("==============================\n")

            # Emit transcript to frontend in real-time
            socketio.emit(
                "transcript_segment",
                {
                    "partition_id": partition_id,
                    "text": text
                },
                room=f"session_{session_id}"
            )

        except Exception:
            # Log any errors during processing
            print("Audio processing error:")
            traceback.print_exc()

        finally:

            # Cleanup original uploaded file
            if os.path.exists(filepath):
                os.remove(filepath)

            # Cleanup converted wav file
            if os.path.exists(wav_path):
                os.remove(wav_path)


@transcript_bp.route("/upload", methods=["POST"])
def upload_audio():

    # Debug logs for incoming request
    print("\n===== UPLOAD DEBUG =====")
    print("FORM:", request.form)
    print("FILES:", request.files)
    print("========================")

    # Get session ID from request
    session_id = request.form.get("session_id")

    # Validate session ID presence
    if not session_id or session_id == "null":
        return jsonify({"error": "invalid session_id"}), 400

    # Convert session ID to integer
    try:
        session_id = int(session_id)
    except ValueError:
        return jsonify({"error": "invalid session_id"}), 400

    # Ensure audio file is present
    if "audio" not in request.files:
        return jsonify({"error": "audio required"}), 400

    audio = request.files["audio"]

    # Fetch session from database
    session = Session.query.get(session_id)

    print("SESSION:", session)

    # Validate session existence
    if not session:
        return jsonify({"error": "session not found"}), 404

    # Ensure session is active and partition is set
    if session.status != "active" or not session.current_partition_index:
        return jsonify({"error": "session not active"}), 400

    print("CURRENT PARTITION INDEX:", session.current_partition_index)

    # Fetch current active partition
    partition = SessionPartition.query.filter_by(
        session_id=session_id,
        partition_index=session.current_partition_index
    ).first()

    print("PARTITION:", partition)

    # Validate partition existence
    if not partition:
        return jsonify({"error": "no active partition"}), 400

    # Determine file extension
    ext = "webm"
    if audio.filename and "." in audio.filename:
        ext = audio.filename.split(".")[-1]

    # Generate unique filename
    filename = f"{uuid.uuid4()}.{ext}"
    filepath = os.path.join(UPLOAD_FOLDER, filename)

    # Save uploaded file locally
    audio.save(filepath)

    app = current_app._get_current_object()

    # Submit processing task to thread pool (non-blocking)
    executor.submit(
        process_audio_chunk,
        app,
        filepath,
        partition.id,
        session_id
    )

    return jsonify({
        "message": "chunk received"
    })