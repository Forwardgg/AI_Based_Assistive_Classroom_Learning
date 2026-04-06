# backend/app/routes/analytics_routes.py

from flask import Blueprint, jsonify
from sqlalchemy import func, case
from app import db

from app.models.session_partition import SessionPartition
from app.models.quiz import Quiz
from app.models.question import Question
from app.models.student_answer import StudentAnswer
from app.models.user import User

from flask_jwt_extended import get_jwt_identity, jwt_required  # ✅ FIX

analytics_bp = Blueprint("analytics", __name__)


# =====================================================
# 1. SESSION SUMMARY
# =====================================================
@analytics_bp.route("/session/<int:session_id>/summary", methods=["GET"])
def get_session_summary(session_id):

    total_answers = db.session.query(func.count(StudentAnswer.id)).join(
        Question, StudentAnswer.question_id == Question.id
    ).join(
        Quiz, Question.quiz_id == Quiz.id
    ).join(
        SessionPartition, Quiz.partition_id == SessionPartition.id
    ).filter(
        SessionPartition.session_id == session_id
    ).scalar()

    correct_answers = db.session.query(func.count(StudentAnswer.id)).join(
        Question, StudentAnswer.question_id == Question.id
    ).join(
        Quiz, Question.quiz_id == Quiz.id
    ).join(
        SessionPartition, Quiz.partition_id == SessionPartition.id
    ).filter(
        SessionPartition.session_id == session_id,
        StudentAnswer.is_correct == True
    ).scalar()

    participants = db.session.query(
        func.count(func.distinct(StudentAnswer.student_id))
    ).join(
        Question, StudentAnswer.question_id == Question.id
    ).join(
        Quiz, Question.quiz_id == Quiz.id
    ).join(
        SessionPartition, Quiz.partition_id == SessionPartition.id
    ).filter(
        SessionPartition.session_id == session_id
    ).scalar()

    total_questions = db.session.query(func.count(Question.id)).join(
        Quiz, Question.quiz_id == Quiz.id
    ).join(
        SessionPartition, Quiz.partition_id == SessionPartition.id
    ).filter(
        SessionPartition.session_id == session_id
    ).scalar()

    accuracy = (correct_answers / total_answers) if total_answers else 0

    return jsonify({
        "accuracy": accuracy,
        "participants": participants or 0,
        "total_questions": total_questions or 0
    })


# =====================================================
# 2. STUDENT ANALYTICS (SESSION LEVEL)
# =====================================================
@analytics_bp.route("/session/<int:session_id>/students", methods=["GET"])
def get_student_analytics(session_id):

    results = db.session.query(
        StudentAnswer.student_id,
        User.name,
        func.count(StudentAnswer.id).label("attempted"),
        func.coalesce(
            func.sum(
                case((StudentAnswer.is_correct == True, 1), else_=0)
            ),
            0
        ).label("correct")
    ).join(
        User, User.id == StudentAnswer.student_id
    ).join(
        Question, StudentAnswer.question_id == Question.id
    ).join(
        Quiz, Question.quiz_id == Quiz.id
    ).join(
        SessionPartition, Quiz.partition_id == SessionPartition.id
    ).filter(
        SessionPartition.session_id == session_id
    ).group_by(StudentAnswer.student_id, User.name).all()

    data = []
    for r in results:
        attempted = r.attempted or 0
        correct = r.correct or 0
        accuracy = (correct / attempted) if attempted else 0

        data.append({
            "student_id": r.student_id,
            "name": r.name,
            "attempted": attempted,
            "correct": correct,
            "accuracy": accuracy
        })

    return jsonify(data)


# =====================================================
# 🔥 3. STUDENT PERSONAL RESULTS (MAIN FIX)
# =====================================================
@analytics_bp.route("/student/me", methods=["GET"])
@jwt_required()
def get_my_results():

    identity = get_jwt_identity()
    print("🔍 RAW JWT identity:", identity, type(identity))

    user_id = None

    # CASE 1: int
    if isinstance(identity, int):
        user_id = identity

    # CASE 2: string number → convert
    elif isinstance(identity, str) and identity.isdigit():
        user_id = int(identity)

    # CASE 3: email
    else:
        user = User.query.filter_by(email=identity).first()
        if user:
            user_id = user.id

    if not user_id:
        return jsonify({
            "error": "User not found",
            "identity": identity
        }), 404

    results = db.session.query(
        SessionPartition.session_id,
        func.count(StudentAnswer.id).label("attempted"),
        func.coalesce(
            func.sum(
                case((StudentAnswer.is_correct == True, 1), else_=0)
            ),
            0
        ).label("correct")
    ).join(
        Question, StudentAnswer.question_id == Question.id
    ).join(
        Quiz, Question.quiz_id == Quiz.id
    ).join(
        SessionPartition, Quiz.partition_id == SessionPartition.id
    ).filter(
        StudentAnswer.student_id == user_id
    ).group_by(SessionPartition.session_id).all()

    data = []

    for r in results:
        attempted = r.attempted or 0
        correct = r.correct or 0
        accuracy = (correct / attempted) if attempted else 0

        data.append({
            "session_id": r.session_id,
            "attempted": attempted,
            "correct": correct,
            "accuracy": accuracy
        })

    return jsonify(data)