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

UPLOAD_FOLDER = "recordings"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# THREAD POOL (prevents unlimited threads)
executor = ThreadPoolExecutor(max_workers=4)


# =========================
# BACKGROUND AUDIO PROCESSING
# =========================
def process_audio_chunk(app, filepath, partition_id, session_id):

    with app.app_context():

        wav_path = filepath.replace(".webm", ".wav")

        try:

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

            if not os.path.exists(wav_path):
                print("FFmpeg failed:")
                print(result.stderr.decode())
                return

            text = transcribe_audio(wav_path)

            segment = store_segment(partition_id, text)

            print("\n==============================")
            print("TRANSCRIPT SEGMENT")
            print(text)
            print("==============================\n")

            socketio.emit(
                "transcript_segment",
                {
                    "partition_id": partition_id,
                    "text": text
                },
                room=f"session_{session_id}"
            )

        except Exception:
            print("Audio processing error:")
            traceback.print_exc()

        finally:

            if os.path.exists(filepath):
                os.remove(filepath)

            if os.path.exists(wav_path):
                os.remove(wav_path)


# =========================
# UPLOAD AUDIO CHUNK
# =========================
@transcript_bp.route("/upload", methods=["POST"])
def upload_audio():

    print("\n===== UPLOAD DEBUG =====")
    print("FORM:", request.form)
    print("FILES:", request.files)
    print("========================")

    session_id = request.form.get("session_id")

    if not session_id or session_id == "null":
        return jsonify({"error": "invalid session_id"}), 400

    try:
        session_id = int(session_id)
    except ValueError:
        return jsonify({"error": "invalid session_id"}), 400

    if "audio" not in request.files:
        return jsonify({"error": "audio required"}), 400

    audio = request.files["audio"]

    session = Session.query.get(session_id)

    print("SESSION:", session)

    if not session:
        return jsonify({"error": "session not found"}), 404

    if session.status != "active" or not session.current_partition_index:
        return jsonify({"error": "session not active"}), 400

    print("CURRENT PARTITION INDEX:", session.current_partition_index)

    partition = SessionPartition.query.filter_by(
        session_id=session_id,
        partition_index=session.current_partition_index
    ).first()

    print("PARTITION:", partition)

    if not partition:
        return jsonify({"error": "no active partition"}), 400

    ext = "webm"
    if audio.filename and "." in audio.filename:
        ext = audio.filename.split(".")[-1]

    filename = f"{uuid.uuid4()}.{ext}"
    filepath = os.path.join(UPLOAD_FOLDER, filename)

    audio.save(filepath)

    app = current_app._get_current_object()

    # submit job to thread pool instead of spawning unlimited threads
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