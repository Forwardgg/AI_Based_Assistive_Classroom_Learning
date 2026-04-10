#  backend/app/routes/analytics_routes.py
from flask import Blueprint, jsonify
from sqlalchemy import func
from collections import defaultdict

from flask_jwt_extended import jwt_required, get_jwt_identity

from app import db
from app.models.session import Session
from app.models.course import Course
from app.models.session_partition import SessionPartition
from app.models.quiz import Quiz
from app.models.question import Question
from app.models.student_answer import StudentAnswer
from app.models.user import User
from app.models.enrollment import Enrollment


analytics_bp = Blueprint("analytics", __name__)


# =========================
# HELPER: USER RESOLUTION
# =========================
def resolve_user(identity):
    if isinstance(identity, int):
        return User.query.get(identity)
    if isinstance(identity, str) and identity.isdigit():
        return User.query.get(int(identity))
    return User.query.filter_by(email=identity).first()


# =====================================================
# 🔹 NEW: GET ALL SESSIONS (FOR DROPDOWN)
# =====================================================
@analytics_bp.route("/sessions", methods=["GET"])
@jwt_required()
def get_sessions():

    identity = get_jwt_identity()
    user = resolve_user(identity)

    if not user or user.role != "professor":
        return jsonify({"error": "Access denied"}), 403

    sessions = (
        db.session.query(Session)
        .join(Course)
        .filter(Course.professor_id == user.id)
        .order_by(Session.created_at.desc())
        .all()
    )

    return jsonify([
        {
            "id": s.id,
            "course_name": s.course.course_name,
            "date": s.created_at.isoformat()
        }
        for s in sessions
    ])


# =====================================================
# 🔹 MAIN ANALYTICS ROUTE
# =====================================================
@analytics_bp.route("/session/<int:session_id>", methods=["GET"])
@jwt_required()
def get_professor_session_analytics(session_id):

    # ===== AUTH =====
    identity = get_jwt_identity()
    user = resolve_user(identity)

    if not user:
        return jsonify({"error": "User not found"}), 404

    if user.role != "professor":
        return jsonify({"error": "Access denied"}), 403

    # =========================
    # SESSION (AUTO-FALLBACK)
    # =========================
    session = Session.query.get(session_id)

    if not session:
        session = Session.query.order_by(Session.created_at.desc()).first()

        if not session:
            return jsonify({"error": "No sessions available"}), 404

    session_id = session.id  # update

    course = Course.query.get(session.course_id)

    if course.professor_id != user.id:
        return jsonify({"error": "Not your course"}), 403

    # =========================
    # 🔥 BASE QUERY
    # =========================
    rows = db.session.query(
        SessionPartition.partition_index,
        Question.id.label("question_id"),
        Question.question_text,
        StudentAnswer.student_id,
        StudentAnswer.is_correct
    ).join(
        Quiz, Quiz.partition_id == SessionPartition.id
    ).join(
        Question, Question.quiz_id == Quiz.id
    ).join(
        StudentAnswer, StudentAnswer.question_id == Question.id
    ).filter(
        SessionPartition.session_id == session_id
    ).all()

    # =========================
    # AGGREGATION
    # =========================
    total_answers = 0
    total_correct = 0

    students = defaultdict(lambda: {"attempts": 0, "correct": 0})
    partitions = defaultdict(lambda: {"total": 0, "correct": 0})
    questions = defaultdict(lambda: {"text": "", "total": 0, "correct": 0})

    for r in rows:
        total_answers += 1
        if r.is_correct:
            total_correct += 1

        students[r.student_id]["attempts"] += 1
        if r.is_correct:
            students[r.student_id]["correct"] += 1

        partitions[r.partition_index]["total"] += 1
        if r.is_correct:
            partitions[r.partition_index]["correct"] += 1

        questions[r.question_id]["text"] = r.question_text
        questions[r.question_id]["total"] += 1
        if r.is_correct:
            questions[r.question_id]["correct"] += 1

    # =========================
    # STATS
    # =========================
    students_participated = len(students)

    avg_accuracy = (total_correct / total_answers * 100) if total_answers else 0
    avg_attempts = (total_answers / students_participated) if students_participated else 0

    # =========================
    # TREND + WEAK TOPICS
    # =========================
    trend = []
    weak_topics = []

    for p, data in sorted(partitions.items()):
        acc = (data["correct"] / data["total"] * 100) if data["total"] else 0

        trend.append({
            "partition": p,
            "accuracy": round(acc, 2)
        })

        status = "strong" if acc >= 70 else "medium" if acc >= 40 else "weak"

        weak_topics.append({
            "topic": f"Partition {p}",
            "partition": p,
            "accuracy": round(acc, 2),
            "status": status
        })

    # =========================
    # QUESTIONS
    # =========================
    question_list = []

    for _, data in questions.items():
        acc = (data["correct"] / data["total"] * 100) if data["total"] else 0

        if acc >= 75:
            diff = "easy"
        elif acc >= 40:
            diff = "medium"
        else:
            diff = "hard"

        question_list.append({
            "question": data["text"],
            "accuracy": round(acc, 2),
            "difficulty": diff
        })

    # =========================
    # STUDENTS
    # =========================
    student_list = []

    for sid, data in students.items():
        acc = (data["correct"] / data["attempts"] * 100) if data["attempts"] else 0
        user_obj = User.query.get(sid)

        student_list.append({
            "name": user_obj.name if user_obj else "Unknown",
            "attempts": data["attempts"],
            "accuracy": round(acc, 2)
        })

    # =========================
    # PARTICIPATION
    # =========================
    total_students = db.session.query(func.count(Enrollment.id))\
        .filter(Enrollment.course_id == course.id)\
        .scalar() or 0

    participation_rate = (
        (students_participated / total_students) * 100
        if total_students else 0
    )

    # =========================
    # RESPONSE
    # =========================
    return jsonify({
        "header": {
            "course_name": course.course_name,
            "session_date": session.created_at.isoformat()
        },
        "stats": {
            "avg_accuracy": round(avg_accuracy, 2),
            "students_participated": students_participated,
            "questions_attempted": total_answers,
            "avg_attempts_per_student": round(avg_attempts, 2)
        },
        "trend": trend,
        "weak_topics": weak_topics,
        "questions": question_list,
        "students": student_list,
        "participation": {
            "rate": round(participation_rate, 2),
            "participated": students_participated,
            "not_participated": max(total_students - students_participated, 0)
        }
    })