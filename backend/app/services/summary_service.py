from app.services.ai_service import call_gemini


# SMART PREP (LIGHT CONTROL)
def prepare_text(text, max_chars=12000):
    """
    Allows large input but prevents extreme overload.
    Keeps start + end for context if too large.
    """
    if len(text) <= max_chars:
        return text

    half = max_chars // 2
    return text[:half] + "\n...\n" + text[-half:]  # preserve context from both ends


# CLEAN TRANSCRIPT
def clean_transcript(raw_text):
    """
    Cleans raw Whisper transcript using Gemini (no summarization).
    """

    if not raw_text or not raw_text.strip():
        return ""

    prepared = prepare_text(raw_text)  # limit size for LLM

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
        cleaned = call_gemini(messages)  # call Gemini for text cleaning
        return cleaned.strip()
    except Exception as e:
        print("[CLEAN TRANSCRIPT ERROR]", e)
        return raw_text  # fallback to original text


# GENERATE SUMMARY
def generate_summary(cleaned_text):
    """
    Generates 5–7 bullet point summary from cleaned transcript.
    """

    if not cleaned_text or not cleaned_text.strip():
        return ""

    prepared = prepare_text(cleaned_text)  # limit input size

    print(f"[SUMMARY INPUT SIZE] {len(prepared)} chars")

    prompt = f"""
Summarize the following lecture content into clear bullet points.

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
        summary = call_gemini(messages)  # call Gemini for summarization
        return summary.strip()
    except Exception as e:
        print("[SUMMARY ERROR]", e)
        return ""  # return empty if failed