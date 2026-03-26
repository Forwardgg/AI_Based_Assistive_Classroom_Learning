// frontend/src/features/lectures/recordingService.js

let mediaRecorder = null;
let stream = null;
let currentSessionId = null;
let chunkTimer = null;
let isRecording = false;


// =========================
// START RECORDING
// =========================
export async function startRecording(sessionId) {

    console.log("[REC START REQUEST]", {
        sessionId,
        time: Date.now()
    });

    // 🔥 Prevent duplicate recorder
    if (isRecording) {
        console.log("[REC SKIP] Already recording");
        return;
    }

    currentSessionId = sessionId;
    isRecording = true;

    try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        console.log("[REC STREAM ACQUIRED]");

        mediaRecorder = new MediaRecorder(stream, {
            mimeType: "audio/webm"
        });

        mediaRecorder.ondataavailable = async (event) => {

            if (!currentSessionId) {
                console.warn("[REC DATA DROPPED] No session");
                return;
            }

            if (event.data && event.data.size > 0) {

                console.log("[REC DATA AVAILABLE]", {
                    size: event.data.size,
                    time: Date.now()
                });

                uploadChunk(event.data, currentSessionId);
            }
        };

        mediaRecorder.onstop = () => {
            console.log("[REC ORDERED STOP EVENT]");
        };

        mediaRecorder.start();

        console.log("[REC STARTED]");

        // ✅ Safe chunk cycling
        chunkTimer = setInterval(() => {

            if (!isRecording) {
                console.log("[REC INTERVAL STOPPED]");
                return;
            }

            if (mediaRecorder && mediaRecorder.state === "recording") {

                console.log("[REC CHUNK TRIGGER]", Date.now());

                try {
                    mediaRecorder.stop();
                } catch (err) {
                    console.warn("[REC STOP ERROR]", err);
                }

                // 🔥 restart safely AFTER delay
                setTimeout(() => {

                    if (!isRecording) return;

                    if (mediaRecorder && mediaRecorder.state === "inactive") {
                        try {
                            mediaRecorder.start();
                            console.log("[REC RESTART SUCCESS]");
                        } catch (err) {
                            console.warn("[REC RESTART FAILED]", err);
                        }
                    }

                }, 150);
            }

        }, 10000); // 🔥 reduced from 15000 → more reliable

    } catch (err) {
        console.error("[REC MIC ERROR]", err);
        isRecording = false;
    }
}


// =========================
// UPLOAD CHUNK
// =========================
async function uploadChunk(blob, sessionId) {

    console.log("[UPLOAD START]", {
        sessionId,
        size: blob.size,
        time: Date.now()
    });

    const formData = new FormData();

    formData.append("session_id", sessionId);
    formData.append("audio", blob, "chunk.webm");

    try {

        const res = await fetch("http://localhost:5000/api/transcripts/upload", {
            method: "POST",
            body: formData
        });

        console.log("[UPLOAD RESPONSE]", res.status);

        // 🔥 STOP if backend rejects (session ended)
        if (!res.ok) {
            console.warn("[UPLOAD REJECTED → STOP RECORDING]");
            stopRecording();
        }

    } catch (err) {
        console.error("[UPLOAD FAILED]", err);
    }
}


// =========================
// STOP RECORDING
// =========================
export function stopRecording() {

    console.log("[REC STOP REQUEST]", Date.now());

    if (!isRecording) {
        console.log("[REC STOP SKIP] Not recording");
        return;
    }

    isRecording = false;

    // stop interval first
    if (chunkTimer) {
        clearInterval(chunkTimer);
        chunkTimer = null;
        console.log("[REC INTERVAL CLEARED]");
    }

    // 🔥 trigger final chunk
    if (mediaRecorder && mediaRecorder.state === "recording") {
        try {
            mediaRecorder.stop();
            console.log("[REC FINAL STOP TRIGGERED]");
        } catch (err) {
            console.warn("[REC FINAL STOP ERROR]", err);
        }
    }

    // 🔥 release mic safely
    if (stream) {
        stream.getTracks().forEach(track => {
            try {
                track.stop();
            } catch (err) {
                console.warn("[TRACK STOP ERROR]", err);
            }
        });
        stream = null;
        console.log("[REC STREAM RELEASED]");
    }

    // allow last upload to finish
    setTimeout(() => {
        console.log("[REC SESSION CLEARED]");
        currentSessionId = null;
    }, 500);
}