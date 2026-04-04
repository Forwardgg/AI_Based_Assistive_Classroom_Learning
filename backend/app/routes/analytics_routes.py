# backend/app/routes/analytics_routes.py
from flask import Blueprint, jsonify
from sqlalchemy import func, case
from app import db

from app.models.session_partition import SessionPartition
from app.models.quiz import Quiz
from app.models.question import Question
from app.models.student_answer import StudentAnswer
from app.models.user import User

analytics_bp = Blueprint("analytics", __name__)


# =====================================================
# 1. SESSION SUMMARY
# =====================================================
@analytics_bp.route("/session/<int:session_id>/summary", methods=["GET"])
def get_session_summary(session_id):

    # total answers
    total_answers = db.session.query(func.count(StudentAnswer.id)).join(
        Question, StudentAnswer.question_id == Question.id
    ).join(
        Quiz, Question.quiz_id == Quiz.id
    ).join(
        SessionPartition, Quiz.partition_id == SessionPartition.id
    ).filter(
        SessionPartition.session_id == session_id
    ).scalar()

    # correct answers
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

    # participants
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

    # total questions
    total_questions = db.session.query(func.count(Question.id)).join(
        Quiz, Question.quiz_id == Quiz.id
    ).join(
        SessionPartition, Quiz.partition_id == SessionPartition.id
    ).filter(
        SessionPartition.session_id == session_id
    ).scalar()

    # partition accuracies (for weak detection)
    partition_stats = db.session.query(
        SessionPartition.id,
        func.count(StudentAnswer.id).label("total"),
        func.sum(
            case((StudentAnswer.is_correct == True, 1), else_=0)
        ).label("correct")
    ).join(
        Quiz, Quiz.partition_id == SessionPartition.id
    ).join(
        Question, Question.quiz_id == Quiz.id
    ).join(
        StudentAnswer, StudentAnswer.question_id == Question.id
    ).filter(
        SessionPartition.session_id == session_id
    ).group_by(SessionPartition.id).all()

    weak_partitions = 0
    for p in partition_stats:
        if p.total and (p.correct / p.total) < 0.4:
            weak_partitions += 1

    accuracy = (correct_answers / total_answers) if total_answers else 0

    return jsonify({
        "accuracy": accuracy,
        "participants": participants or 0,
        "total_questions": total_questions or 0,
        "weak_partitions": weak_partitions
    })


# =====================================================
# 2. PARTITION ANALYTICS
# =====================================================
@analytics_bp.route("/session/<int:session_id>/partitions", methods=["GET"])
def get_partition_analytics(session_id):

    results = db.session.query(
        SessionPartition.partition_index,
        func.count(StudentAnswer.id).label("total"),
        func.sum(
            case((StudentAnswer.is_correct == True, 1), else_=0)
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
        accuracy = (r.correct / r.total) if r.total else 0
        data.append({
            "partition_index": r.partition_index,
            "accuracy": accuracy,
            "total_answers": r.total
        })

    return jsonify(data)


# =====================================================
# 3. STUDENT ANALYTICS
# =====================================================
@analytics_bp.route("/session/<int:session_id>/students", methods=["GET"])
def get_student_analytics(session_id):

    results = db.session.query(
        StudentAnswer.student_id,
        User.name,
        func.count(StudentAnswer.id).label("attempted"),
        func.sum(
            case((StudentAnswer.is_correct == True, 1), else_=0)
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
        accuracy = (r.correct / r.attempted) if r.attempted else 0
        data.append({
            "student_id": r.student_id,
            "name": r.name,
            "attempted": r.attempted,
            "correct": r.correct,
            "accuracy": accuracy
        })

    return jsonify(data)


# =====================================================
# 4. QUESTION ANALYTICS
# =====================================================
@analytics_bp.route("/session/<int:session_id>/questions", methods=["GET"])
def get_question_analytics(session_id):

    results = db.session.query(
        Question.id,
        Question.question_text,
        func.count(StudentAnswer.id).label("total"),
        func.sum(
            case((StudentAnswer.is_correct == True, 1), else_=0)
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
        correct_rate = (r.correct / r.total) if r.total else 0

        # most selected option
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