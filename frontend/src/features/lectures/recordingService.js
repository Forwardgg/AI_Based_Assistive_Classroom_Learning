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
                console.warn("[REC DATA DROPPED]");
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
            console.log("[REC STOP EVENT]");
        };

        mediaRecorder.start();

        console.log("[REC STARTED]");

        // =========================
        // CHUNK LOOP (WITH OVERLAP)
        // =========================
        chunkTimer = setInterval(() => {

            if (!isRecording) return;

            if (mediaRecorder && mediaRecorder.state === "recording") {

                console.log("[REC CHUNK TRIGGER]", Date.now());

                // 🔥 overlap buffer
                setTimeout(() => {

                    if (!isRecording) return;

                    try {
                        mediaRecorder.stop();
                        console.log("[REC STOP FOR CHUNK]");
                    } catch (err) {
                        console.warn("[REC STOP ERROR]", err);
                    }

                    // 🔥 restart after small delay
                    setTimeout(() => {

                        if (!isRecording) return;

                        try {
                            mediaRecorder.start();
                            console.log("[REC RESTARTED]");
                        } catch (err) {
                            console.warn("[REC RESTART ERROR]", err);
                        }

                    }, 200);

                }, 200);

            }

        }, 8000); // 8s sweet spot

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

        if (!res.ok) {

            console.warn("[UPLOAD REJECTED]", res.status);

            // 🔥 FIX: ignore final chunk after session ends
            if (res.status === 400) {
                console.log("[IGNORE FINAL CHUNK AFTER SESSION END]");
                return;
            }

            // only stop for real errors
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
        console.log("[REC STOP SKIP]");
        return;
    }

    isRecording = false;

    if (chunkTimer) {
        clearInterval(chunkTimer);
        chunkTimer = null;
        console.log("[REC INTERVAL CLEARED]");
    }

    // 🔥 final chunk flush
    if (mediaRecorder && mediaRecorder.state === "recording") {

        console.log("[FINAL CHUNK FLUSH]");

        try {
            mediaRecorder.stop();
        } catch (err) {
            console.warn("[FINAL STOP ERROR]", err);
        }
    }

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

    setTimeout(() => {
        currentSessionId = null;
        console.log("[REC SESSION CLEARED]");
    }, 500);
}