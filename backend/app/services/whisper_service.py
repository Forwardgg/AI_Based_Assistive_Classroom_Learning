# backend/app/services/whisper_service.py

import threading
from faster_whisper import WhisperModel

print("Loading Whisper model (small, int8)...")

model = WhisperModel(
    "small",
    compute_type="int8"
)

print("Whisper model loaded")


# Thread lock to avoid concurrent transcription issues
whisper_lock = threading.Lock()


def transcribe_audio(file_path):

    with whisper_lock:

        segments, info = model.transcribe(
            file_path,
            language="en",
            task="transcribe",
            beam_size=2,
            temperature=0.0,
            condition_on_previous_text=False,
            vad_filter=True
        )

        texts = []

        for segment in segments:
            if segment.text.strip():
                texts.append(segment.text.strip())

        return " ".join(texts)