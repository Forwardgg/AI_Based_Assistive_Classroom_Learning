# backend/app/routes/transcript_routes.py

import os
import uuid

from flask import Blueprint, request, jsonify

from app import socketio
from app.models.session import Session
from app.models.session_partition import SessionPartition
from app.services.whisper_service import transcribe_audio
from app.services.transcript_service import store_segment


transcript_bp = Blueprint("transcripts", __name__)

UPLOAD_FOLDER = "recordings"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


@transcript_bp.route("/upload", methods=["POST"])
def upload_audio():

    print("\n===== UPLOAD DEBUG =====")
    print("FORM:", request.form)
    print("FILES:", request.files)
    print("========================")

    session_id = request.form.get("session_id")

    if not session_id or session_id == "null":
        print("❌ Invalid session_id")
        return jsonify({"error": "invalid session_id"}), 400

    try:
        session_id = int(session_id)
    except ValueError:
        print("❌ session_id not an integer")
        return jsonify({"error": "invalid session_id"}), 400

    if "audio" not in request.files:
        print("❌ Audio file missing")
        return jsonify({"error": "audio required"}), 400

    audio = request.files["audio"]

    # -------------------------
    # Validate session
    # -------------------------
    session = Session.query.get(session_id)

    print("SESSION:", session)

    if not session:
        print("❌ Session not found")
        return jsonify({"error": "session not found"}), 404

    print("CURRENT PARTITION INDEX:", session.current_partition_index)

    # -------------------------
    # Find partition
    # -------------------------

    partition = None

    # Try current partition first
    if session.current_partition_index:
        partition = SessionPartition.query.filter_by(
            session_id=session_id,
            partition_index=session.current_partition_index
        ).first()

    # Fallback: if session already finished, attach to last partition
    if not partition:
        partition = (
            SessionPartition.query
            .filter_by(session_id=session_id)
            .order_by(SessionPartition.partition_index.desc())
            .first()
        )

    print("PARTITION:", partition)

    if not partition:
        print("❌ No partition found")
        return jsonify({"error": "no partition found"}), 400

    # -------------------------
    # Save audio file
    # -------------------------
    ext = "webm"
    if audio.filename and "." in audio.filename:
        ext = audio.filename.split(".")[-1]

    filename = f"{uuid.uuid4()}.{ext}"
    filepath = os.path.join(UPLOAD_FOLDER, filename)

    audio.save(filepath)

    # -------------------------
    # Transcribe audio
    # -------------------------
    try:
        text = transcribe_audio(filepath)
    except Exception as e:
        os.remove(filepath)
        print("Whisper skipped bad audio chunk", e)
        return jsonify({
            "message": "invalid audio chunk skipped"
        }), 200

    os.remove(filepath)

    # -------------------------
    # Store transcript segment
    # -------------------------
    segment = store_segment(partition.id, text)

    # -------------------------
    # Debug log (terminal)
    # -------------------------
    print("\n==============================")
    print("TRANSCRIPT SEGMENT")
    print(text)
    print("==============================\n")

    # -------------------------
    # Send transcript to frontend
    # -------------------------
    socketio.emit(
        "transcript_segment",
        {
            "partition_id": partition.id,
            "text": text
        },
        room=f"session_{session_id}"
    )

    # -------------------------
    # Response
    # -------------------------
    return jsonify({
        "segment": segment.to_dict(),
        "text": text
    })