# backend/app/routes/session_routes.py

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity
from flask_socketio import join_room
from sqlalchemy.exc import IntegrityError

from app import db, socketio
from app.models.session import Session
from app.models.session_partition import SessionPartition
from app.models.course import Course
from app.models.lecture_notes import LectureNotes

from app.services.transcript_service import finalize_partition_transcript
from app.services.quiz_service import generate_quiz_for_partition

import time

session_bp = Blueprint("session_bp", __name__)  # session route group

session_controls = {}  # runtime flags for pause/stop state


def run_quiz_with_context(app, partition_id, session_id):
    with app.app_context():  # required for DB in background thread
        generate_quiz_for_partition(partition_id, session_id)


def emit_session_state(session_id, room):
    session = Session.query.get(session_id)

    if not session:
        return

    # push current session state to frontend
    socketio.emit(
        "session_state",
        {
            "session_id": session_id,
            "status": session.status,
            "current_partition_index": session.current_partition_index,
            "start_time": session.partition_start_time,
            "end_time": session.partition_end_time,
            "server_time": int(time.time())
        },
        room=room
    )

@session_bp.route("/course/<int:course_id>/active", methods=["GET"])
@jwt_required()
def get_active_session(course_id):

    # fetch latest active/paused session
    session = (
        Session.query
        .filter_by(course_id=course_id)
        .filter(Session.status.in_(["active", "paused"]))
        .order_by(Session.id.desc())
        .first()
    )

    if not session:
        return jsonify({"exists": False}), 200

    # fix broken paused state (edge case after restart)
    if session.status == "paused" and session.partition_end_time is None:
        session.status = "stopped"
        session.current_partition_index = None
        session.partition_start_time = None
        session.partition_end_time = None
        db.session.commit()
        return jsonify({"exists": False}), 200

    return jsonify({
        "exists": True,
        "session_id": session.id,
        "status": session.status
    }), 200

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

    # create session
    new_session = Session(
        course_id=course_id,
        duration_minutes=duration_minutes,
        status="scheduled"
    )

    db.session.add(new_session)
    db.session.flush()  # get id before commit

    # create partitions for session
    for index, p in enumerate(partitions, start=1):
        partition = SessionPartition(
            session_id=new_session.id,
            partition_index=index,
            start_minute=p["start_minute"],
            end_minute=p["end_minute"]
        )
        db.session.add(partition)

    db.session.commit()

    return jsonify({"session": new_session.to_dict()}), 201

@session_bp.route("/<int:session_id>/start", methods=["POST"])
@jwt_required()
def start_session(session_id):

    session = Session.query.get(session_id)

    if not session or session.status != "scheduled":
        return jsonify({"message": "Cannot start session"}), 400

    # prevent multiple active sessions for same professor
    existing = (
        Session.query
        .join(Course, Session.course_id == Course.id)
        .filter(
            Course.professor_id == session.course.professor_id,
            Session.status.in_(["active", "paused"])
        )
        .first()
    )

    if existing:
        return jsonify({
            "message": "Another session is already running. Stop it first."
        }), 400

    session.status = "active"
    db.session.commit()

    session_controls[session_id] = {
        "paused": False,
        "stopped": False
    }

    emit_session_state(session_id, f"session_{session_id}")

    app = current_app._get_current_object()

    # start background timer loop
    socketio.start_background_task(
        run_session_timer,
        app,
        session_id
    )

    return jsonify({"message": "Session started"}), 200

@session_bp.route("/<int:session_id>/pause", methods=["POST"])
@jwt_required()
def pause_session(session_id):

    session = Session.query.get(session_id)

    if not session or session.status != "active":
        return jsonify({"message": "Cannot pause session"}), 400

    session.status = "paused"
    db.session.commit()

    session_controls.setdefault(session_id, {})
    session_controls[session_id]["paused"] = True  # set pause flag

    emit_session_state(session_id, f"session_{session_id}")

    return jsonify({"message": "Paused"}), 200

@session_bp.route("/<int:session_id>/resume", methods=["POST"])
@jwt_required()
def resume_session(session_id):

    session = Session.query.get(session_id)

    if not session or session.status != "paused":
        return jsonify({"message": "Cannot resume session"}), 400

    session.status = "active"
    db.session.commit()

    session_controls.setdefault(session_id, {})
    session_controls[session_id]["paused"] = False  # clear pause flag

    emit_session_state(session_id, f"session_{session_id}")

    return jsonify({"message": "Resumed"}), 200

@session_bp.route("/<int:session_id>/stop", methods=["POST"])
@jwt_required()
def stop_session(session_id):

    session = Session.query.get(session_id)

    if not session:
        return jsonify({"message": "Session not found"}), 404

    # reset session state
    session.status = "stopped"
    session.current_partition_index = None
    session.partition_start_time = None
    session.partition_end_time = None

    db.session.commit()

    session_controls.setdefault(session_id, {})
    session_controls[session_id]["stopped"] = True

    emit_session_state(session_id, f"session_{session_id}")

    return jsonify({"message": "Session stopped"}), 200

@socketio.on("join_session")
def handle_join_session(data):

    session_id = data.get("session_id") if isinstance(data, dict) else data

    if not session_id:
        return

    room = f"session_{session_id}"

    join_room(room)  # join socket room

    print(f"[SOCKET] Client joined room {room}")

    emit_session_state(session_id, request.sid)  # send current state

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

        room = f"session_{session_id}"

        for partition in partitions:

            duration_seconds = (partition.end_minute - partition.start_minute) * 60
            if duration_seconds <= 0:
                continue

            # ✅ check stopped before starting each partition too
            if session_controls.get(session_id, {}).get("stopped"):
                return

            session.current_partition_index = partition.partition_index
            db.session.commit()

            start_time = int(time.time())
            end_time = start_time + duration_seconds

            session.partition_start_time = start_time
            session.partition_end_time = end_time
            db.session.commit()

            emit_session_state(session_id, room)

            pause_start = None

            while True:
                ctrl = session_controls.get(session_id, {})

                # ✅ check in-memory flags FIRST — no DB query needed
                if ctrl.get("stopped"):
                    return

                if ctrl.get("paused"):
                    if pause_start is None:
                        pause_start = int(time.time())
                    socketio.sleep(0.2)  # ✅ reduced from 1s
                    continue

                # resume after pause
                if pause_start is not None:
                    pause_duration = int(time.time()) - pause_start
                    end_time += pause_duration
                    pause_start = None
                    session.partition_end_time = end_time
                    db.session.commit()
                    emit_session_state(session_id, room)

                now = int(time.time())
                if end_time - now <= 0:
                    break

                socketio.sleep(0.2)  # ✅ reduced from 1s

            # ✅ check again before doing post-partition work
            if session_controls.get(session_id, {}).get("stopped"):
                return

            socketio.emit(
                "partition_finished",
                {
                    "session_id": session_id,
                    "partition_index": partition.partition_index,
                    "partition_id": partition.id
                },
                room=room
            )

            finalize_partition_transcript(partition.id)

            session.status = "paused"
            db.session.commit()

            session_controls.setdefault(session_id, {})
            session_controls[session_id]["paused"] = True

            emit_session_state(session_id, room)

            # wait for resume — ✅ also check stopped here
            while session_controls.get(session_id, {}).get("paused"):
                if session_controls.get(session_id, {}).get("stopped"):
                    return
                socketio.sleep(0.2)  # ✅ reduced from 1s

        session.status = "completed"
        session.current_partition_index = None
        session.partition_start_time = None
        session.partition_end_time = None
        db.session.commit()

        emit_session_state(session_id, room)

@session_bp.route("/<int:session_id>", methods=["GET"])
@jwt_required()
def get_session(session_id):

    session = Session.query.get(session_id)

    if not session:
        return jsonify({"message": "Session not found"}), 404

    return jsonify({
        "id": session.id,
        "status": session.status,
        "current_partition_index": session.current_partition_index,
        "start_time": session.partition_start_time,
        "end_time": session.partition_end_time
    }), 200

@session_bp.route("/<int:session_id>/generate-quiz", methods=["POST"])
@jwt_required()
def generate_quiz(session_id):

    data = request.get_json() or {}
    partition_id = data.get("partition_id")

    if not partition_id:
        return jsonify({"message": "partition_id required"}), 400

    partition = SessionPartition.query.get(partition_id)

    if not partition:
        return jsonify({"message": "Partition not found"}), 404

    app = current_app._get_current_object()

    # run quiz generation asynchronously
    socketio.start_background_task(
        run_quiz_with_context,
        app,
        partition_id,
        session_id
    )

    return jsonify({"message": "Quiz generation started"}), 200

@session_bp.route("/<int:session_id>/notes", methods=["GET"])
@jwt_required()
def get_session_notes(session_id):

    notes = LectureNotes.query.filter_by(session_id=session_id).first()

    if not notes:
        return jsonify({"exists": False}), 200

    return jsonify({
        "exists": True,
        "summary_text": notes.summary_text
    }), 200

@session_bp.route("/<int:session_id>/notes", methods=["POST"])
@jwt_required()
def generate_session_notes(session_id):

    from app.models.transcript import Transcript
    from app.services.summary_service import clean_transcript, generate_summary

    claims = get_jwt()
    user_id = int(get_jwt_identity())

    if claims.get("role") != "professor":
        return jsonify({"message": "Unauthorized"}), 403

    session = Session.query.get(session_id)
    if not session:
        return jsonify({"message": "Session not found"}), 404

    if session.course.professor_id != user_id:
        return jsonify({"message": "Unauthorized"}), 403

    # fetch all transcripts for session
    transcripts = Transcript.query.join(
        SessionPartition,
        Transcript.partition_id == SessionPartition.id
    ).filter(
        SessionPartition.session_id == session_id
    ).all()

    if not transcripts:
        return jsonify({"message": "No transcript available"}), 400

    full_text = "\n".join([t.transcript_text for t in transcripts])

    cleaned = clean_transcript(full_text)  # remove noise
    summary = generate_summary(cleaned)  # AI summary

    if not summary:
        return jsonify({"message": "Failed to generate notes"}), 500

    notes = LectureNotes(
        session_id=session_id,
        summary_text=summary
    )

    try:
        db.session.add(notes)
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({"message": "Notes already generated"}), 400

    return jsonify({"message": "Notes generated"}), 201

@session_bp.route("/<int:session_id>/notes", methods=["PUT"])
@jwt_required()
def update_session_notes(session_id):

    claims = get_jwt()
    user_id = int(get_jwt_identity())

    if claims.get("role") != "professor":
        return jsonify({"message": "Unauthorized"}), 403

    session = Session.query.get(session_id)
    if not session:
        return jsonify({"message": "Session not found"}), 404

    if session.course.professor_id != user_id:
        return jsonify({"message": "Unauthorized"}), 403

    notes = LectureNotes.query.filter_by(session_id=session_id).first()
    if not notes:
        return jsonify({"message": "Notes not found"}), 404

    data = request.get_json() or {}

    notes.summary_text = data.get("summary_text", notes.summary_text)  # update text

    db.session.commit()

    return jsonify({"message": "Notes updated"}), 200