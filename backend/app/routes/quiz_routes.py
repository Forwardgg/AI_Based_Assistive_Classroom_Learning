from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity

from app import db
from app.models.quiz import Quiz
from app.models.question import Question
from app.models.student_answer import StudentAnswer

quiz_bp = Blueprint("quiz_bp", __name__)  # quiz route group


# GET QUIZ FOR PARTITION
@quiz_bp.route("/partition/<int:partition_id>", methods=["GET"])
@jwt_required()
def get_quiz(partition_id):

    quiz = Quiz.query.filter_by(partition_id=partition_id).first()  # fetch quiz for this partition

    if not quiz:
        return jsonify({"message": "Quiz not found"}), 404

    questions = Question.query.filter_by(quiz_id=quiz.id).all()  # fetch all questions

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
                "correct": q.correct_option  # correct answer included
            }
            for q in questions
        ]
    })


# SUBMIT ANSWERS
@quiz_bp.route("/submit", methods=["POST"])
@jwt_required()
def submit_answers():

    data = request.get_json()
    answers = data.get("answers", [])  # list of submitted answers

    user_id = int(get_jwt_identity())  # current student id

    results = []

    for ans in answers:

        question = Question.query.get(ans["question_id"])  # fetch question

        if not question:
            continue  # skip invalid question

        is_correct = question.correct_option == ans["selected_option"]  # evaluate answer

        results.append(is_correct)

        db.session.add(StudentAnswer(
            question_id=question.id,
            student_id=user_id,
            selected_option=ans["selected_option"],
            is_correct=is_correct
        ))  # store student response

    db.session.commit()  # save all answers

    score = sum(results)  # count correct answers

    return jsonify({
        "score": score,
        "total": len(results)
    })


# FULL SESSION QUIZ
@quiz_bp.route("/session/<int:session_id>", methods=["GET"])
@jwt_required()
def get_full_session_quiz(session_id):

    quizzes = (
        Quiz.query
        .join(
            Question,
            Question.quiz_id == Quiz.id
        )
        .join(
            SessionPartition,
            Quiz.partition_id == SessionPartition.id
        )
        .filter(
            SessionPartition.session_id == session_id
        )
        .all()
    )

    if not quizzes:
        return jsonify({
            "message": "No quizzes found"
        }), 404

    questions = []

    for quiz in quizzes:

        quiz_questions = (
            Question.query
            .filter_by(quiz_id=quiz.id)
            .all()
        )

        for q in quiz_questions:

            questions.append({
                "id": q.id,
                "question_text": q.question_text,
                "options": {
                    "A": q.option_a,
                    "B": q.option_b,
                    "C": q.option_c,
                    "D": q.option_d
                },
                "correct": q.correct_option
            })

    return jsonify({
        "session_id": session_id,
        "questions": questions
    }), 200