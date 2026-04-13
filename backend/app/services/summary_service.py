from app.services.ai_service import call_gemini


# =========================
# SMART PREP (LIGHT CONTROL)
# =========================
def prepare_text(text, max_chars=12000):
    """
    Allows large input but prevents extreme overload.
    Keeps start + end for context if too large.
    """
    if len(text) <= max_chars:
        return text

    half = max_chars // 2
    return text[:half] + "\n...\n" + text[-half:]


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

    prepared = prepare_text(raw_text)

    print(f"[CLEAN INPUT SIZE] {len(prepared)} chars")

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
{prepared}
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

    prepared = prepare_text(cleaned_text)

    print(f"[SUMMARY INPUT SIZE] {len(prepared)} chars")

    prompt = f"""
Summarize the following lecture content into 5–7 clear bullet points.

- Keep it concise
- Focus on key concepts
- No extra explanation
- No paragraphs

Text:
{prepared}
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