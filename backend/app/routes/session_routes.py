# backend/app/routes/session_routes.py

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity
from flask_socketio import join_room

from app import db, socketio
from app.models.session import Session
from app.models.session_partition import SessionPartition
from app.models.course import Course
from app.services.transcript_service import finalize_partition_transcript

import time

session_bp = Blueprint("session_bp", __name__)

# runtime session controls
session_controls = {}


# =========================
# CREATE SESSION
# =========================
@session_bp.route("", methods=["POST"])
@jwt_required()
def create_session():

    claims = get_jwt()
    current_user_id = int(get_jwt_identity())

    if claims.get("role") != "professor":
        return jsonify({"message": "Only professors can create sessions"}), 403

    data = request.get_json() or {}

    course_id = data.get("course_id")
    duration_minutes = data.get("duration_minutes")
    partitions = data.get("partitions")

    if not course_id or not duration_minutes or not partitions:
        return jsonify({"message": "Missing required fields"}), 400

    course = Course.query.get(course_id)

    if not course:
        return jsonify({"message": "Course not found"}), 404

    if course.professor_id != current_user_id:
        return jsonify({"message": "Unauthorized"}), 403

    new_session = Session(
        course_id=course_id,
        duration_minutes=duration_minutes,
        status="scheduled"
    )

    db.session.add(new_session)
    db.session.flush()

    for index, p in enumerate(partitions, start=1):

        partition = SessionPartition(
            session_id=new_session.id,
            partition_index=index,
            start_minute=p["start_minute"],
            end_minute=p["end_minute"]
        )

        db.session.add(partition)

    db.session.commit()

    return jsonify({
        "session": new_session.to_dict()
    }), 201


# =========================
# START SESSION
# =========================
@session_bp.route("/<int:session_id>/start", methods=["POST"])
@jwt_required()
def start_session(session_id):

    session = Session.query.get(session_id)

    if not session or session.status != "scheduled":
        return jsonify({"message": "Cannot start session"}), 400

    session.status = "active"
    db.session.commit()

    session_controls[session_id] = {
        "paused": False,
        "stopped": False
    }

    app = current_app._get_current_object()

    socketio.start_background_task(
        run_session_timer,
        app,
        session_id
    )

    return jsonify({"message": "Session started"}), 200


# =========================
# PAUSE SESSION
# =========================
@session_bp.route("/<int:session_id>/pause", methods=["POST"])
@jwt_required()
def pause_session(session_id):

    session = Session.query.get(session_id)

    if not session or session.status != "active":
        return jsonify({"message": "Cannot pause session"}), 400

    session.status = "paused"
    db.session.commit()

    session_controls[session_id]["paused"] = True

    socketio.emit(
        "session_paused",
        {"session_id": session_id},
        room=f"session_{session_id}"
    )

    return jsonify({"message": "Paused"}), 200


# =========================
# RESUME SESSION
# =========================
@session_bp.route("/<int:session_id>/resume", methods=["POST"])
@jwt_required()
def resume_session(session_id):

    session = Session.query.get(session_id)

    if not session or session.status != "paused":
        return jsonify({"message": "Cannot resume session"}), 400

    session.status = "active"
    db.session.commit()

    session_controls[session_id]["paused"] = False

    socketio.emit(
        "session_resumed",
        {"session_id": session_id},
        room=f"session_{session_id}"
    )

    return jsonify({"message": "Resumed"}), 200


# =========================
# STOP SESSION
# =========================
@session_bp.route("/<int:session_id>/stop", methods=["POST"])
@jwt_required()
def stop_session(session_id):

    session = Session.query.get(session_id)

    if not session:
        return jsonify({"message": "Cannot stop session"}), 404

    session_controls[session_id]["stopped"] = True

    return jsonify({"message": "Stopping"}), 200


# =========================
# SOCKET ROOM JOIN
# =========================
@socketio.on("join_session")
def handle_join_session(data):

    session_id = data.get("session_id")

    if not session_id:
        return

    room = f"session_{session_id}"
    join_room(room)

    print(f"Client joined room {room}")


# =========================
# TIMER ENGINE (FIXED)
# =========================
def run_session_timer(app, session_id):

    with app.app_context():

        session = Session.query.get(session_id)

        if not session:
            return

        partitions = (
            SessionPartition.query
            .filter_by(session_id=session_id)
            .order_by(SessionPartition.partition_index)
            .all()
        )

        print("Partitions found:", len(partitions))

        room = f"session_{session_id}"

        for partition in partitions:

            duration_seconds = (partition.end_minute - partition.start_minute) * 60

            print(
                f"Starting partition {partition.partition_index} "
                f"({partition.start_minute} -> {partition.end_minute}) "
                f"= {duration_seconds} seconds"
            )

            if duration_seconds <= 0:
                continue

            # mark active partition
            session.current_partition_index = partition.partition_index
            db.session.commit()

            socketio.emit(
                "partition_started",
                {
                    "session_id": session_id,
                    "partition_index": partition.partition_index,
                    "start_minute": partition.start_minute,
                    "end_minute": partition.end_minute
                },
                room=room
            )

            elapsed = 0

            # TIMER LOOP
            while elapsed < duration_seconds:

                if session_controls.get(session_id, {}).get("stopped"):

                    print("Session manually stopped")

                    session.status = "stopped"
                    session.current_partition_index = None
                    db.session.commit()

                    socketio.emit(
                        "session_stopped",
                        {"session_id": session_id},
                        room=room
                    )

                    return

                if session_controls.get(session_id, {}).get("paused"):
                    socketio.sleep(1)
                    continue

                socketio.sleep(1)
                elapsed += 1

            # partition finished AFTER timer
            finalize_partition_transcript(partition.id)

            socketio.emit(
                "partition_finished",
                {
                    "session_id": session_id,
                    "partition_index": partition.partition_index
                },
                room=room
            )

        # session finished
        session.status = "completed"
        session.current_partition_index = None
        db.session.commit()

        socketio.emit(
            "session_completed",
            {"session_id": session_id},
            room=room
        )

        print("Session completed")