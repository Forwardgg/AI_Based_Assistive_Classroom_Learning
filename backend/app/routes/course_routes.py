from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.user import User
import random
import string

course_bp = Blueprint("courses", __name__)


# 🔹 Generate random class code
def generate_class_code():
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))


# 🔹 Professor creates course
@course_bp.route("", methods=["POST"])
@jwt_required()
def create_course():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)

    if not user or user.role != "professor":
        return jsonify({"error": "Only professors can create courses"}), 403

    data = request.get_json() or {}

    required_fields = ["course_name", "year", "semester"]
    if not all(field in data for field in required_fields):
        return jsonify({"error": "Missing required fields"}), 400

    # Prevent invalid semester value
    if data["semester"] not in ["spring", "autumn"]:
        return jsonify({"error": "Invalid semester value"}), 400

    # Generate unique class code (collision-safe)
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
    db.session.commit()

    return jsonify(course.to_dict()), 201


# 🔹 Student joins course
@course_bp.route("/join", methods=["POST"])
@jwt_required()
def join_course():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)

    if not user or user.role != "student":
        return jsonify({"error": "Only students can join courses"}), 403

    data = request.get_json() or {}

    if "class_code" not in data or "roll_no" not in data:
        return jsonify({"error": "class_code and roll_no required"}), 400

    course = Course.query.filter_by(class_code=data["class_code"]).first()

    if not course:
        return jsonify({"error": "Invalid class code"}), 404

    # Prevent duplicate enrollment
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


# 🔹 Get courses for logged user
@course_bp.route("", methods=["GET"])
@jwt_required()
def get_courses():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)

    if not user:
        return jsonify({"error": "User not found"}), 404

    if user.role == "professor":
        courses = Course.query.filter_by(professor_id=user_id).all()
    else:
        enrollments = Enrollment.query.filter_by(student_id=user_id).all()
        courses = [e.course for e in enrollments]

    return jsonify([c.to_dict() for c in courses]), 200