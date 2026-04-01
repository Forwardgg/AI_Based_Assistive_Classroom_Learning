from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity

from app import db
from app.models.quiz import Quiz
from app.models.question import Question
from app.models.student_answer import StudentAnswer

quiz_bp = Blueprint("quiz_bp", __name__)


# =========================
# GET QUIZ FOR PARTITION
# =========================
@quiz_bp.route("/partition/<int:partition_id>", methods=["GET"])
@jwt_required()
def get_quiz(partition_id):

    quiz = Quiz.query.filter_by(partition_id=partition_id).first()

    if not quiz:
        return jsonify({"message": "Quiz not found"}), 404

    questions = Question.query.filter_by(quiz_id=quiz.id).all()

    return jsonify({
        "quiz_id": quiz.id,
        "questions": [
            {
                "id": q.id,
                "question_text": q.question_text,
                "options": {
                    "A": q.option_a,
                    "B": q.option_b,
                    "C": q.option_c,
                    "D": q.option_d
                },
                "correct": q.correct_option
            }
            for q in questions
        ]
    })


# =========================
# SUBMIT ANSWERS
# =========================
@quiz_bp.route("/submit", methods=["POST"])
@jwt_required()
def submit_answers():

    data = request.get_json()
    answers = data.get("answers", [])

    user_id = int(get_jwt_identity())

    results = []

    for ans in answers:

        question = Question.query.get(ans["question_id"])

        if not question:
            continue

        is_correct = question.correct_option == ans["selected_option"]

        results.append(is_correct)

        db.session.add(StudentAnswer(
            question_id=question.id,
            student_id=user_id,
            selected_option=ans["selected_option"],
            is_correct=is_correct
        ))

    db.session.commit()

    score = sum(results)

    return jsonify({
        "score": score,
        "total": len(results)
    })