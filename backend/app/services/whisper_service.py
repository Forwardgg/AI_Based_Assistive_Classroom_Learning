# backend/app/services/whisper_service.py

import threading
from faster_whisper import WhisperModel

# load Whisper model once at startup
print("Loading Whisper model (small, int8)...")

model = WhisperModel(
    "small",
    compute_type="int8"
)

print("Whisper model loaded")

# lock to prevent concurrent access (Whisper not thread-safe)
whisper_lock = threading.Lock()

def transcribe_audio(file_path):

    # ensure only one transcription runs at a time
    with whisper_lock:

        # run speech-to-text on audio file
        segments, info = model.transcribe(
            file_path,
            language="en",
            task="transcribe",
            beam_size=2,  # faster decoding
            temperature=0.0,  # deterministic output
            condition_on_previous_text=False,  # avoid context drift
            vad_filter=True  # remove silence segments
        )

        texts = []

        # collect non-empty text segments
        for segment in segments:
            if segment.text.strip():
                texts.append(segment.text.strip())

        return " ".join(texts)  # return full transcript