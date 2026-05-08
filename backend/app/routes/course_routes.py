# backend/app/routes/course_routes.py

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from app import db
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.user import User
from app.models.session import Session

import random
import string

course_bp = Blueprint("courses", __name__)  # course route group 

# generates unique 6-char class code for joining courses
def generate_class_code():
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))


@course_bp.route("", methods=["POST"])
@jwt_required()
def create_course():
    user_id = int(get_jwt_identity())  # get logged-in user id
    user = User.query.get(user_id)

    if not user or user.role != "professor":
        return jsonify({"error": "Only professors can create courses"}), 403  # role restriction

    data = request.get_json() or {}

    required_fields = ["course_name", "year", "semester"]
    if not all(field in data for field in required_fields):
        return jsonify({"error": "Missing required fields"}), 400  # validation

    if data["semester"] not in ["spring", "autumn"]:
        return jsonify({"error": "Invalid semester value"}), 400  # enum validation

    # ensure class_code is unique
    while True:
        class_code = generate_class_code()
        if not Course.query.filter_by(class_code=class_code).first():
            break

    course = Course(
        course_name=data["course_name"],
        year=data["year"],
        semester=data["semester"],
        class_code=class_code,
        professor_id=user_id
    )

    db.session.add(course)
    db.session.commit()  # persist course

    return jsonify(course.to_dict()), 201


@course_bp.route("/join", methods=["POST"])
@jwt_required()
def join_course():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)

    if not user or user.role != "student":
        return jsonify({"error": "Only students can join courses"}), 403  # role restriction

    data = request.get_json() or {}

    if "class_code" not in data or "roll_no" not in data:
        return jsonify({"error": "class_code and roll_no required"}), 400  # validation

    course = Course.query.filter_by(class_code=data["class_code"]).first()

    if not course:
        return jsonify({"error": "Invalid class code"}), 404  # invalid code

    # prevent duplicate enrollment
    existing = Enrollment.query.filter_by(
        student_id=user_id,
        course_id=course.id
    ).first()

    if existing:
        return jsonify({"error": "Already enrolled in this course"}), 400

    enrollment = Enrollment(
        student_id=user_id,
        course_id=course.id,
        roll_no=data["roll_no"]
    )

    db.session.add(enrollment)
    db.session.commit()

    return jsonify({"message": "Joined successfully"}), 200


@course_bp.route("", methods=["GET"])
@jwt_required()
def get_courses():
    from sqlalchemy import func

    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)

    if not user:
        return jsonify({"error": "User not found"}), 404

    # professor view with aggregated stats
    if user.role == "professor":
        courses = (
            db.session.query(
                Course,
                func.count(func.distinct(Enrollment.student_id)).label("students_count"),
                func.count(func.distinct(Session.id)).label("sessions_count"),
                func.max(Session.created_at).label("last_session"),
                func.bool_or(Session.status == "active").label("live"),  # any active session
            )
            .outerjoin(Enrollment, Enrollment.course_id == Course.id)
            .outerjoin(Session, Session.course_id == Course.id)
            .filter(Course.professor_id == user_id)
            .group_by(Course.id)
            .all()
        )

        result = []

        for c, students_count, sessions_count, last_session, live in courses:
            data = c.to_dict()

            data["students_count"] = students_count or 0
            data["sessions_count"] = sessions_count or 0
            data["last_session"] = (
                last_session.strftime("%d %b") if last_session else None
            )
            data["live"] = bool(live)

            result.append(data)

        return jsonify(result), 200

    # student view (courses enrolled in)
    else:
        enrollments = Enrollment.query.filter_by(student_id=user_id).all()
        courses = [e.course for e in enrollments]

        result = []
        for c in courses:
            data = c.to_dict()

            # simple stats for student view
            students_count = Enrollment.query.filter_by(course_id=c.id).count()
            sessions_count = Session.query.filter_by(course_id=c.id).count()
            last_session = (
                Session.query.filter_by(course_id=c.id)
                .order_by(Session.created_at.desc())
                .first()
            )

            data["students_count"] = students_count
            data["sessions_count"] = sessions_count
            data["last_session"] = (
                last_session.created_at.strftime("%d %b")
                if last_session else None
            )

            result.append(data)

        return jsonify(result), 200


@course_bp.route("/<int:course_id>/sessions", methods=["GET"])
@jwt_required()
def get_course_sessions(course_id):
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)

    if not user:
        return jsonify({"error": "User not found"}), 404

    course = Course.query.get(course_id)

    if not course:
        return jsonify({"error": "Course not found"}), 404

    # access control: professor owns or student enrolled
    if user.role == "professor":
        if course.professor_id != user_id:
            return jsonify({"error": "Unauthorized"}), 403
    else:
        enrolled = Enrollment.query.filter_by(
            student_id=user_id,
            course_id=course_id
        ).first()

        if not enrolled:
            return jsonify({"error": "Unauthorized"}), 403

    sessions = Session.query.filter_by(course_id=course_id)\
        .order_by(Session.id.desc()).all()  # latest first

    result = []

    # include partition details inside each session
    for s in sessions:
        result.append({
            "id": s.id,
            "status": s.status,
            "duration_minutes": s.duration_minutes,
            "partitions": [
                p.to_dict() for p in s.partitions
            ]
        })

    return jsonify(result), 200


# ─────────────────────────────────────────────
# DELETE /<course_id>
# ─────────────────────────────────────────────
@course_bp.route("/<int:course_id>", methods=["DELETE"])
@jwt_required()
def delete_course(course_id):

    user_id = int(get_jwt_identity())

    course = Course.query.get(course_id)

    if not course:
        return jsonify({
            "error": "Course not found"
        }), 404

    # =========================================
    # ONLY OWNER CAN DELETE
    # =========================================

    if course.professor_id != user_id:
        return jsonify({
            "error": "Unauthorized"
        }), 403

    # =========================================
    # STOP ACTIVE SESSIONS FIRST
    # =========================================

    active_sessions = (
        Session.query
        .filter_by(course_id=course_id)
        .filter(
            Session.status.in_(["active", "paused"])
        )
        .all()
    )

    for session in active_sessions:

        session.status = "stopped"

        session.current_partition_index = None
        session.partition_start_time = None
        session.partition_end_time = None

    db.session.commit()

    # =========================================
    # DELETE COURSE
    # =========================================

    db.session.delete(course)

    db.session.commit()

    return jsonify({
        "message": "Course deleted"
    }), 200