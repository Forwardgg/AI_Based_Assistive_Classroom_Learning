# backend/app/routes/analytics_routes.py

from flask import Blueprint, jsonify
from sqlalchemy import func, case
from app import db

from app.models.session_partition import SessionPartition
from app.models.quiz import Quiz
from app.models.question import Question
from app.models.student_answer import StudentAnswer
from app.models.user import User

from flask_jwt_extended import get_jwt_identity, jwt_required

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
    ).scalar() or 0

    correct_answers = db.session.query(func.count(StudentAnswer.id)).join(
        Question, StudentAnswer.question_id == Question.id
    ).join(
        Quiz, Question.quiz_id == Quiz.id
    ).join(
        SessionPartition, Quiz.partition_id == SessionPartition.id
    ).filter(
        SessionPartition.session_id == session_id,
        StudentAnswer.is_correct.is_(True)
    ).scalar() or 0

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
    ).scalar() or 0

    total_questions = db.session.query(func.count(Question.id)).join(
        Quiz, Question.quiz_id == Quiz.id
    ).join(
        SessionPartition, Quiz.partition_id == SessionPartition.id
    ).filter(
        SessionPartition.session_id == session_id
    ).scalar() or 0

    accuracy = (correct_answers / total_answers) if total_answers else 0

    return jsonify({
        "accuracy": accuracy,
        "participants": participants,
        "total_questions": total_questions
    })


# =====================================================
# 2. PARTITION ANALYTICS (RESTORED 🔥)
# =====================================================
@analytics_bp.route("/session/<int:session_id>/partitions", methods=["GET"])
def get_partition_analytics(session_id):

    results = db.session.query(
        SessionPartition.partition_index,
        func.count(StudentAnswer.id).label("total"),
        func.coalesce(
            func.sum(
                case((StudentAnswer.is_correct.is_(True), 1), else_=0)
            ),
            0
        ).label("correct")
    ).join(
        Quiz, Quiz.partition_id == SessionPartition.id
    ).join(
        Question, Question.quiz_id == Quiz.id
    ).join(
        StudentAnswer, StudentAnswer.question_id == Question.id
    ).filter(
        SessionPartition.session_id == session_id
    ).group_by(SessionPartition.partition_index).all()

    data = []
    for r in results:
        total = r.total or 0
        correct = r.correct or 0
        accuracy = (correct / total) if total else 0

        data.append({
            "partition_index": r.partition_index,
            "accuracy": accuracy,
            "total_answers": total
        })

    return jsonify(data)


# =====================================================
# 3. STUDENT ANALYTICS (SESSION LEVEL)
# =====================================================
@analytics_bp.route("/session/<int:session_id>/students", methods=["GET"])
def get_student_analytics(session_id):

    results = db.session.query(
        StudentAnswer.student_id,
        User.name,
        func.count(StudentAnswer.id).label("attempted"),
        func.coalesce(
            func.sum(
                case((StudentAnswer.is_correct.is_(True), 1), else_=0)
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
# 4. QUESTION ANALYTICS (RESTORED 🔥)
# =====================================================
@analytics_bp.route("/session/<int:session_id>/questions", methods=["GET"])
def get_question_analytics(session_id):

    results = db.session.query(
        Question.id,
        Question.question_text,
        func.count(StudentAnswer.id).label("total"),
        func.coalesce(
            func.sum(
                case((StudentAnswer.is_correct.is_(True), 1), else_=0)
            ),
            0
        ).label("correct")
    ).join(
        Quiz, Question.quiz_id == Quiz.id
    ).join(
        SessionPartition, Quiz.partition_id == SessionPartition.id
    ).join(
        StudentAnswer, StudentAnswer.question_id == Question.id
    ).filter(
        SessionPartition.session_id == session_id
    ).group_by(Question.id).all()

    data = []

    for r in results:
        total = r.total or 0
        correct = r.correct or 0
        correct_rate = (correct / total) if total else 0

        option_counts = db.session.query(
            StudentAnswer.selected_option,
            func.count(StudentAnswer.id)
        ).filter(
            StudentAnswer.question_id == r.id
        ).group_by(StudentAnswer.selected_option).all()

        most_selected = None
        if option_counts:
            most_selected = max(option_counts, key=lambda x: x[1])[0]

        data.append({
            "question_id": r.id,
            "question_text": r.question_text,
            "correct_rate": correct_rate,
            "most_selected_option": most_selected
        })

    return jsonify(data)


# =====================================================
# 5. STUDENT PERSONAL RESULTS (WORKING ✅)
# =====================================================
@analytics_bp.route("/student/me", methods=["GET"])
@jwt_required()
def get_my_results():

    identity = get_jwt_identity()
    print("🔍 RAW JWT identity:", identity, type(identity))

    user_id = None

    if isinstance(identity, int):
        user_id = identity
    elif isinstance(identity, str) and identity.isdigit():
        user_id = int(identity)
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
                case((StudentAnswer.is_correct.is_(True), 1), else_=0)
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