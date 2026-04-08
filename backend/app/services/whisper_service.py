# backend/app/services/whisper_service.py

import threading
from faster_whisper import WhisperModel

# Load Whisper model at startup (small model with int8 for faster inference)
print("Loading Whisper model (small, int8)...")

model = WhisperModel(
    "small",
    compute_type="int8"
)

print("Whisper model loaded")


# Lock to prevent multiple threads from accessing the model simultaneously
whisper_lock = threading.Lock()


def transcribe_audio(file_path):

    # Ensure only one transcription runs at a time
    with whisper_lock:

        # Run transcription on the audio file
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

        # Extract non-empty text segments
        for segment in segments:
            if segment.text.strip():
                texts.append(segment.text.strip())

        # Combine all segments into a single string
        return " ".join(texts)