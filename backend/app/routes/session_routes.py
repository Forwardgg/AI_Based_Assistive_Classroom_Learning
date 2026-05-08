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

from datetime import datetime
import time

session_bp = Blueprint("session_bp", __name__)

session_controls = {}  # runtime flags for pause/stop state


def run_quiz_with_context(app, partition_id, session_id):
    with app.app_context():
        generate_quiz_for_partition(partition_id, session_id)


def emit_session_state(session_id, room):
    session = Session.query.get(session_id)

    if not session:
        return

    socketio.emit(
        "session_state",
        {
            "session_id": session_id,
            "status": session.status,
            "mode": session.mode,
            "current_partition_index": session.current_partition_index,
            "start_time": session.partition_start_time,
            "end_time": session.partition_end_time,
            "server_time": int(time.time())
        },
        room=room
    )


# ─────────────────────────────────────────────
# GET /course/<course_id>/active
# ─────────────────────────────────────────────
@session_bp.route("/course/<int:course_id>/active", methods=["GET"])
@jwt_required()
def get_active_session(course_id):

    session = (
        Session.query
        .filter_by(course_id=course_id)
        .filter(Session.status.in_(["active", "paused"]))
        .order_by(Session.id.desc())
        .first()
    )

    if not session:
        return jsonify({"exists": False}), 200

    # =========================================
    # OLD RECOVERY LOGIC ONLY FOR
    # PARTITIONED MODE
    # =========================================

    if (
        session.mode == "partitioned" and
        session.status == "paused" and
        session.partition_end_time is None
    ):

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

# ─────────────────────────────────────────────
# GET /course/<course_id>/scheduled
# Returns all sessions with status="scheduled" for a course,
# ordered by scheduled_at (nulls last), then created_at.
# ─────────────────────────────────────────────
@session_bp.route("/course/<int:course_id>/scheduled", methods=["GET"])
@jwt_required()
def get_scheduled_sessions(course_id):

    claims = get_jwt()
    current_user_id = int(get_jwt_identity())

    course = Course.query.get(course_id)
    if not course:
        return jsonify({"message": "Course not found"}), 404

    if claims.get("role") == "professor" and course.professor_id != current_user_id:
        return jsonify({"message": "Unauthorized"}), 403

    sessions = (
        Session.query
        .filter_by(course_id=course_id, status="scheduled")
        .order_by(
            Session.scheduled_at.asc().nullslast(),
            Session.created_at.asc()
        )
        .all()
    )

    result = []
    for s in sessions:
        data = s.to_dict()
        data["partitions"] = [p.to_dict() for p in s.partitions]
        result.append(data)

    return jsonify({"sessions": result}), 200


# ─────────────────────────────────────────────
# POST /
# Create a new scheduled session
# ─────────────────────────────────────────────
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
    partitions = data.get("partitions", [])
    name = data.get("name")
    scheduled_at = data.get("scheduled_at")
    mode = data.get("mode", "partitioned")

    if not course_id or not duration_minutes:
        return jsonify({"message": "Missing required fields"}), 400

    if mode not in ["partitioned", "fluid"]:
        return jsonify({"message": "Invalid mode"}), 400

    if mode == "partitioned" and not partitions:
        return jsonify({"message": "Partitions required for partitioned mode"}), 400

    course = Course.query.get(course_id)
    if not course:
        return jsonify({"message": "Course not found"}), 404

    if course.professor_id != current_user_id:
        return jsonify({"message": "Unauthorized"}), 403

    parsed_scheduled_at = None

    if scheduled_at:
        try:
            parsed_scheduled_at = datetime.fromisoformat(scheduled_at)
        except ValueError:
            return jsonify({
                "message": "Invalid scheduled_at format. Use ISO 8601."
            }), 400

    new_session = Session(
        course_id=course_id,
        duration_minutes=duration_minutes,
        status="scheduled",
        mode=mode,
        name=name or None,
        scheduled_at=parsed_scheduled_at
    )

    db.session.add(new_session)
    db.session.flush()

    if mode == "partitioned":

        for index, p in enumerate(partitions, start=1):
            partition = SessionPartition(
                session_id=new_session.id,
                partition_index=index,
                start_minute=p["start_minute"],
                end_minute=p["end_minute"],
                name=p.get("name") or None
            )
            db.session.add(partition)

    db.session.commit()

    result = new_session.to_dict()
    result["partitions"] = [p.to_dict() for p in new_session.partitions]

    return jsonify({"session": result}), 201


# ─────────────────────────────────────────────
# POST /<session_id>/start
# ─────────────────────────────────────────────
@session_bp.route("/<int:session_id>/start", methods=["POST"])
@jwt_required()
def start_session(session_id):

    session = Session.query.get(session_id)

    if not session or session.status != "scheduled":
        return jsonify({"message": "Cannot start session"}), 400

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

    if session.mode == "fluid":

        first_partition = SessionPartition(
            session_id=session.id,
            partition_index=1,
            start_minute=0,
            end_minute=1,
            name="Segment 1"
        )

        db.session.add(first_partition)

        session.current_partition_index = 1

    db.session.commit()

    session_controls[session_id] = {
        "paused": False,
        "stopped": False,
        "transitioning": False
    }

    emit_session_state(session_id, f"session_{session_id}")

    app = current_app._get_current_object()

    socketio.start_background_task(run_session_timer, app, session_id)

    return jsonify({"message": "Session started"}), 200


# ─────────────────────────────────────────────
# POST /<session_id>/pause
# ─────────────────────────────────────────────
@session_bp.route("/<int:session_id>/pause", methods=["POST"])
@jwt_required()
def pause_session(session_id):

    session = Session.query.get(session_id)

    if not session or session.status != "active":
        return jsonify({"message": "Cannot pause session"}), 400

    session.status = "paused"
    db.session.commit()

    session_controls.setdefault(session_id, {})
    session_controls[session_id]["paused"] = True

    emit_session_state(session_id, f"session_{session_id}")

    return jsonify({"message": "Paused"}), 200


# ─────────────────────────────────────────────
# POST /<session_id>/resume
# ─────────────────────────────────────────────
# ─────────────────────────────────────────────
# POST /<session_id>/resume
# ─────────────────────────────────────────────
@session_bp.route("/<int:session_id>/resume", methods=["POST"])
@jwt_required()
def resume_session(session_id):

    session = Session.query.get(session_id)

    if not session or session.status != "paused":
        return jsonify({
            "message": "Cannot resume session"
        }), 400

    # =========================================
    # FLUID MODE
    # =========================================

    if session.mode == "fluid":

        previous_partition = (
            SessionPartition.query
            .filter_by(
                session_id=session_id,
                partition_index=session.current_partition_index
            )
            .first()
        )

        if previous_partition:

            next_start = previous_partition.end_minute

            # =====================================
            # SESSION COMPLETED
            # =====================================

            if next_start >= session.duration_minutes:

                session.status = "completed"

                session.current_partition_index = None
                session.partition_start_time = None
                session.partition_end_time = None

                db.session.commit()

                emit_session_state(
                    session_id,
                    f"session_{session_id}"
                )

                return jsonify({
                    "message": "Session completed"
                }), 200

            # =====================================
            # CREATE NEXT SEGMENT
            # =====================================

            next_partition = SessionPartition(
                session_id=session.id,

                partition_index=(
                    previous_partition.partition_index + 1
                ),

                start_minute=next_start,

                # temporary valid value
                # updated later in end_segment()
                end_minute=next_start + 1,

                name=(
                    f"Segment "
                    f"{previous_partition.partition_index + 1}"
                )
            )

            db.session.add(next_partition)

            session.current_partition_index = (
                next_partition.partition_index
            )

            session.partition_start_time = int(time.time())

    # =========================================
    # RESUME SESSION
    # =========================================

    session.status = "active"

    db.session.commit()

    session_controls.setdefault(session_id, {})
    session_controls[session_id]["paused"] = False

    emit_session_state(
        session_id,
        f"session_{session_id}"
    )

    return jsonify({
        "message": "Resumed"
    }), 200


@session_bp.route("/<int:session_id>/end-segment", methods=["POST"])
@jwt_required()
def end_segment(session_id):

    session = Session.query.get(session_id)

    if not session:
        return jsonify({
            "message": "Session not found"
        }), 404

    if session.mode != "fluid":
        return jsonify({
            "message": "Only fluid sessions support this"
        }), 400

    if session.status != "active":
        return jsonify({
            "message": "Session not active"
        }), 400

    ctrl = session_controls.setdefault(session_id, {})

    if ctrl.get("transitioning"):
        return jsonify({
            "message": "Transition already running"
        }), 400

    ctrl["transitioning"] = True

    try:

        current_partition = (
            SessionPartition.query
            .filter_by(
                session_id=session_id,
                partition_index=session.current_partition_index
            )
            .first()
        )

        if not current_partition:

            ctrl["transitioning"] = False

            return jsonify({
                "message": "Partition not found"
            }), 404

        now = int(time.time())

        elapsed_minutes = max(
            current_partition.start_minute + 1,
            int(
                (
                    now -
                    session.partition_start_time
                ) / 60
            )
        )

        # =====================================
        # FINALIZE CURRENT PARTITION
        # =====================================

        current_partition.end_minute = elapsed_minutes

        finalize_partition_transcript(
            current_partition.id
        )

        # =====================================
        # PAUSE SESSION
        # =====================================

        session.status = "paused"

        db.session.commit()

        session_controls[session_id]["paused"] = True

        # =====================================
        # EMIT FINISHED
        # =====================================

        socketio.emit(
            "partition_finished",
            {
                "session_id": session_id,
                "partition_index": current_partition.partition_index,
                "partition_id": current_partition.id
            },
            room=f"session_{session_id}"
        )

        emit_session_state(
            session_id,
            f"session_{session_id}"
        )

        return jsonify({
            "message": "Segment ended",
            "partition_id": current_partition.id
        }), 200

    finally:

        ctrl["transitioning"] = False

# ─────────────────────────────────────────────
# POST /<session_id>/stop
# ─────────────────────────────────────────────
@session_bp.route("/<int:session_id>/stop", methods=["POST"])
@jwt_required()
def stop_session(session_id):

    session = Session.query.get(session_id)

    if not session:
        return jsonify({"message": "Session not found"}), 404

    # =========================================
    # FINALIZE LAST FLUID PARTITION
    # =========================================

    if session.mode == "fluid" and session.current_partition_index:

        current_partition = (
            SessionPartition.query
            .filter_by(
                session_id=session_id,
                partition_index=session.current_partition_index
            )
            .first()
        )

        if current_partition:

            elapsed_minutes = max(
                current_partition.start_minute + 1,
                int(
                    (
                        int(time.time()) -
                        session.partition_start_time
                    ) / 60
                )
            )

            current_partition.end_minute = elapsed_minutes

            db.session.commit()

            finalize_partition_transcript(
                current_partition.id
            )

            socketio.emit(
                "partition_finished",
                {
                    "session_id": session_id,
                    "partition_index": current_partition.partition_index,
                    "partition_id": current_partition.id
                },
                room=f"session_{session_id}"
            )

    session.status = "stopped"

    session.current_partition_index = None
    session.partition_start_time = None
    session.partition_end_time = None

    db.session.commit()

    session_controls.setdefault(session_id, {})
    session_controls[session_id]["stopped"] = True

    emit_session_state(
        session_id,
        f"session_{session_id}"
    )

    return jsonify({
        "message": "Session stopped"
    }), 200


# ─────────────────────────────────────────────
# Socket: join_session
# ─────────────────────────────────────────────
@socketio.on("join_session")
def handle_join_session(data):

    session_id = data.get("session_id") if isinstance(data, dict) else data

    if not session_id:
        return

    room = f"session_{session_id}"
    join_room(room)

    print(f"[SOCKET] Client joined room {room}")

    emit_session_state(session_id, request.sid)


# ─────────────────────────────────────────────
# Background timer loop
# ─────────────────────────────────────────────
def run_session_timer(app, session_id):

    with app.app_context():

        session = Session.query.get(session_id)

        if not session:
            return

        room = f"session_{session_id}"

        # =====================================================
        # PARTITIONED MODE
        # =====================================================

        if session.mode == "partitioned":

            partitions = (
                SessionPartition.query
                .filter_by(session_id=session_id)
                .order_by(SessionPartition.partition_index)
                .all()
            )

            for partition in partitions:

                duration_seconds = (
                    partition.end_minute -
                    partition.start_minute
                ) * 60

                if duration_seconds <= 0:
                    continue

                if session_controls.get(session_id, {}).get("stopped"):
                    return

                session.current_partition_index = (
                    partition.partition_index
                )

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

                    if ctrl.get("stopped"):
                        return

                    if ctrl.get("paused"):

                        if pause_start is None:
                            pause_start = int(time.time())

                        socketio.sleep(0.2)
                        continue

                    if pause_start is not None:

                        pause_duration = (
                            int(time.time()) - pause_start
                        )

                        end_time += pause_duration

                        pause_start = None

                        session.partition_end_time = end_time

                        db.session.commit()

                        emit_session_state(session_id, room)

                    now = int(time.time())

                    if end_time - now <= 0:
                        break

                    socketio.sleep(0.2)

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

                while session_controls.get(session_id, {}).get("paused"):

                    if session_controls.get(session_id, {}).get("stopped"):
                        return

                    socketio.sleep(0.2)

            session.status = "completed"

            session.current_partition_index = None
            session.partition_start_time = None
            session.partition_end_time = None

            db.session.commit()

            emit_session_state(session_id, room)

            return

        # =====================================================
        # FLUID MODE
        # =====================================================

        start_time = int(time.time())

        session.partition_start_time = start_time
        session.partition_end_time = None

        db.session.commit()

        emit_session_state(session_id, room)

        pause_start = None

        while True:

            ctrl = session_controls.get(session_id, {})

            if ctrl.get("stopped"):
                return

            if ctrl.get("paused"):

                if pause_start is None:
                    pause_start = int(time.time())

                socketio.sleep(0.2)
                continue

            if pause_start is not None:

                pause_duration = (
                    int(time.time()) - pause_start
                )

                start_time += pause_duration

                session.partition_start_time = start_time

                db.session.commit()

                emit_session_state(session_id, room)

                pause_start = None

            socketio.sleep(0.2)

# ─────────────────────────────────────────────
# GET /<session_id>
# ─────────────────────────────────────────────
@session_bp.route("/<int:session_id>", methods=["GET"])
@jwt_required()
def get_session(session_id):

    session = Session.query.get(session_id)

    if not session:
        return jsonify({"message": "Session not found"}), 404

    return jsonify({
        "id": session.id,
        "name": session.name,
        "scheduled_at": session.scheduled_at.isoformat() if session.scheduled_at else None,
        "status": session.status,
        "mode": session.mode,
        "current_partition_index": session.current_partition_index,
        "start_time": session.partition_start_time,
        "end_time": session.partition_end_time
    }), 200


# ─────────────────────────────────────────────
# POST /<session_id>/generate-quiz
# ─────────────────────────────────────────────
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

    socketio.start_background_task(
        run_quiz_with_context,
        app,
        partition_id,
        session_id
    )

    return jsonify({"message": "Quiz generation started"}), 200


# ─────────────────────────────────────────────
# GET /<session_id>/notes
# ─────────────────────────────────────────────
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


# ─────────────────────────────────────────────
# POST /<session_id>/notes
# ─────────────────────────────────────────────
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

    transcripts = Transcript.query.join(
        SessionPartition,
        Transcript.partition_id == SessionPartition.id
    ).filter(
        SessionPartition.session_id == session_id
    ).all()

    if not transcripts:
        return jsonify({"message": "No transcript available"}), 400

    full_text = "\n".join([t.transcript_text for t in transcripts])

    cleaned = clean_transcript(full_text)
    summary = generate_summary(cleaned)

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


# ─────────────────────────────────────────────
# PUT /<session_id>/notes
# ─────────────────────────────────────────────
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
    notes.summary_text = data.get("summary_text", notes.summary_text)

    db.session.commit()

    return jsonify({"message": "Notes updated"}), 200


# ─────────────────────────────────────────────
# DELETE /<session_id>
# ─────────────────────────────────────────────
@session_bp.route("/<int:session_id>", methods=["DELETE"])
@jwt_required()
def delete_session(session_id):

    session = Session.query.get(session_id)

    if not session:
        return jsonify({
            "message": "Session not found"
        }), 404

    # =========================================
    # STOP ACTIVE SESSION
    # =========================================

    if session.status in ["active", "paused"]:

        session_controls.setdefault(session_id, {})
        session_controls[session_id]["stopped"] = True

    db.session.delete(session)

    db.session.commit()

    return jsonify({
        "message": "Session deleted"
    }), 200


# ─────────────────────────────────────────────
# DELETE PARTITION
# ─────────────────────────────────────────────
@session_bp.route("/partition/<int:partition_id>", methods=["DELETE"])
@jwt_required()
def delete_partition(partition_id):

    partition = SessionPartition.query.get(partition_id)

    if not partition:
        return jsonify({
            "message": "Partition not found"
        }), 404

    session = Session.query.get(partition.session_id)

    # =========================================
    # PREVENT DELETING ACTIVE PARTITION
    # =========================================

    if (
        session.status in ["active", "paused"] and
        session.current_partition_index ==
        partition.partition_index
    ):
        return jsonify({
            "message": "Cannot delete active partition"
        }), 400

    db.session.delete(partition)

    db.session.commit()

    return jsonify({
        "message": "Partition deleted"
    }), 200