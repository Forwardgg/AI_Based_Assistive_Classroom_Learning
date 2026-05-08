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
from app.routes.session_routes import session_controls


transcript_bp = Blueprint("transcripts", __name__)  # transcript route group

UPLOAD_FOLDER = "recordings"  # temp storage for audio files
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

executor = ThreadPoolExecutor(max_workers=4)  # limits parallel processing

# background task: convert + transcribe + store + emit
def process_audio_chunk(app, filepath, partition_id, session_id):

    with app.app_context():  # required for DB access in background thread

        wav_path = filepath.replace(".webm", ".wav")  # convert to wav

        try:
            # convert to 16kHz mono wav (Whisper requirement)
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

            text = transcribe_audio(wav_path)  # STT using Whisper

            segment = store_segment(partition_id, text)  # save transcript chunk

            print("\n==============================")
            print("TRANSCRIPT SEGMENT")
            print(text)
            print("==============================\n")

            # push to frontend via socket
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
            traceback.print_exc()  # debug errors

        finally:
            # cleanup temp files
            if os.path.exists(filepath):
                os.remove(filepath)

            if os.path.exists(wav_path):
                os.remove(wav_path)

@transcript_bp.route("/upload", methods=["POST"])
def upload_audio():

    # debug logs (useful during dev)
    print("\n===== UPLOAD DEBUG =====")
    print("FORM:", request.form)
    print("FILES:", request.files)
    print("========================")

    session_id = request.form.get("session_id")  # session identifier

    if not session_id or session_id == "null":
        return jsonify({"error": "invalid session_id"}), 400

    try:
        session_id = int(session_id)
    except ValueError:
        return jsonify({"error": "invalid session_id"}), 400

    if "audio" not in request.files:
        return jsonify({"error": "audio required"}), 400

    audio = request.files["audio"]

    session = Session.query.get(session_id)  # fetch session

    print("SESSION:", session)

    if not session:
        return jsonify({"error": "session not found"}), 404

    # ensure session is active and partition is running
    if session.status != "active" or not session.current_partition_index:
        return jsonify({"error": "session not active"}), 400

    ctrl = session_controls.get(session_id, {})

    # prevent transcript leakage during fluid transitions
    if ctrl.get("transitioning"):
        return jsonify({
            "error": "segment transition in progress"
        }), 409

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
        ext = audio.filename.split(".")[-1]  # preserve extension

    filename = f"{uuid.uuid4()}.{ext}"  # unique file name
    filepath = os.path.join(UPLOAD_FOLDER, filename)

    audio.save(filepath)  # save chunk locally

    app = current_app._get_current_object()  # get actual Flask app instance

    # async processing (prevents request blocking)
    executor.submit(
        process_audio_chunk,
        app,
        filepath,
        partition.id,
        session_id
    )

    return jsonify({
        "message": "chunk received"  # immediate response while processing runs
    })