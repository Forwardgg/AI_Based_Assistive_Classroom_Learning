from app.services.ai_service import call_gemini


# =========================
# CLEAN TRANSCRIPT
# =========================
def clean_transcript(raw_text):
    """
    Takes raw Whisper transcript and cleans it using Gemini.
    Returns clean, structured text.
    """

    if not raw_text or not raw_text.strip():
        return ""

    prompt = f"""
You are given a raw lecture transcript.

Clean it by:
- Removing filler words (uh, um, you know, etc.)
- Fixing grammar
- Making sentences clear and readable
- Keeping ALL important concepts intact
- Do NOT summarize
- Do NOT shorten content significantly

Return ONLY the cleaned transcript as plain text.

Transcript:
{raw_text}
"""

    messages = [
        {"role": "system", "content": "You clean transcripts for clarity."},
        {"role": "user", "content": prompt}
    ]

    try:
        cleaned = call_gemini(messages)
        return cleaned.strip()
    except Exception as e:
        print("[CLEAN TRANSCRIPT ERROR]", e)
        return raw_text  # fallback


# =========================
# GENERATE SUMMARY
# =========================
def generate_summary(cleaned_text):
    """
    Generates 5–7 bullet point summary.
    """

    if not cleaned_text or not cleaned_text.strip():
        return ""

    prompt = f"""
Summarize the following lecture content into 5–7 clear bullet points.

- Keep it concise
- Focus on key concepts
- No extra explanation
- No paragraphs

Text:
{cleaned_text}
"""

    messages = [
        {"role": "system", "content": "You generate concise lecture summaries."},
        {"role": "user", "content": prompt}
    ]

    try:
        summary = call_gemini(messages)
        return summary.strip()
    except Exception as e:
        print("[SUMMARY ERROR]", e)
        return ""