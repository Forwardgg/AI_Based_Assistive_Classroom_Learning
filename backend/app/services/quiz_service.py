import json
import re

from app import db, socketio
from app.models.transcript import Transcript
from app.models.quiz import Quiz
from app.models.question import Question

from app.services.summary_service import clean_transcript
from app.services.ai_service import call_deepseek


# =========================
# SAFE JSON PARSER
# =========================
def extract_json(text):
    """
    Extract JSON array from LLM response safely
    """

    try:
        return json.loads(text)
    except:
        pass

    match = re.search(r"\[.*\]", text, re.DOTALL)

    if match:
        try:
            return json.loads(match.group())
        except:
            pass

    raise ValueError("Invalid JSON from LLM")


# =========================
# GENERATE QUIZ
# =========================
def generate_quiz_for_partition(partition_id, session_id):

    print(f"[QUIZ] Generating for partition {partition_id}")

    # =========================
    # 0. PREVENT DUPLICATES
    # =========================
    existing = Quiz.query.filter_by(partition_id=partition_id).first()
    if existing:
        print("[QUIZ] Already exists, skipping generation")

        # still notify students
        socketio.emit(
            "quiz_ready",
            {"partition_id": partition_id},
            room=f"session_{session_id}"
        )
        return

    # =========================
    # 1. GET TRANSCRIPT
    # =========================
    transcript = Transcript.query.filter_by(
        partition_id=partition_id
    ).first()

    if not transcript:
        print("[QUIZ ERROR] No transcript found")
        return

    raw_text = transcript.transcript_text

    if not raw_text or len(raw_text.strip()) < 20:
        print("[QUIZ ERROR] Transcript too short")
        return

    # =========================
    # 2. CLEAN TRANSCRIPT
    # =========================
    try:
        cleaned = clean_transcript(raw_text)
    except:
        cleaned = raw_text  # fallback

    # =========================
    # 3. GENERATE MCQs
    # =========================
    prompt = f"""
Generate 5 multiple choice questions from the following lecture content.

Rules:
- Questions must test understanding, not memorization
- Include a mix of conceptual and application questions
- Each question must have 4 options (A, B, C, D)
- Only ONE correct answer
- Keep questions clear and concise

Return STRICT JSON ONLY in this format:

[
  {{
    "question": "...",
    "options": {{
      "A": "...",
      "B": "...",
      "C": "...",
      "D": "..."
    }},
    "correct": "A"
  }}
]

Text:
{cleaned[:4000]}
"""

    messages = [
        {"role": "system", "content": "You generate high-quality MCQs in strict JSON."},
        {"role": "user", "content": prompt}
    ]

    try:
        response = call_deepseek(messages)
        questions_data = extract_json(response)
    except Exception as e:
        print("[QUIZ ERROR] LLM failed:", e)
        return

    if not isinstance(questions_data, list):
        print("[QUIZ ERROR] Invalid format")
        return

    # =========================
    # 4. STORE QUIZ
    # =========================
    quiz = Quiz(
        partition_id=partition_id,
        source="AI"
    )

    db.session.add(quiz)
    db.session.flush()

    for q in questions_data:

        try:
            question = Question(
                quiz_id=quiz.id,
                question_text=q["question"],
                option_a=q["options"]["A"],
                option_b=q["options"]["B"],
                option_c=q["options"]["C"],
                option_d=q["options"]["D"],
                correct_option=q["correct"]
            )

            db.session.add(question)

        except Exception as e:
            print("[QUESTION SKIP]", e)
            continue

    db.session.commit()

    print("[QUIZ] Stored successfully")

    # =========================
    # 5. EMIT TO STUDENTS
    # =========================
    socketio.emit(
        "quiz_ready",
        {
            "partition_id": partition_id
        },
        room=f"session_{session_id}"
    )