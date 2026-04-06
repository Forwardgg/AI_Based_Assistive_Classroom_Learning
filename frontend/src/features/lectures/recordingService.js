
// frontend/src/features/lectures/recordingService.js

let mediaRecorder = null;
let stream = null;
let currentSessionId = null;
let chunkTimer = null;
let isRecording = false;

// track cleanup timeout
let cleanupTimeout = null;


// =========================
// START RECORDING
// =========================
async function startRecording(sessionId) {

    console.log("[REC START REQUEST]", {
        sessionId,
        time: Date.now()
    });

    // cancel pending cleanup
    if (cleanupTimeout) {
        clearTimeout(cleanupTimeout);
        cleanupTimeout = null;
        console.log("[CANCELLED OLD CLEANUP]");
    }

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

            const sessionId = currentSessionId;

            if (!sessionId) {
                console.warn("[REC DATA DROPPED - NO SESSION]");
                return;
            }

            if (event.data && event.data.size > 0) {

                console.log("[REC DATA AVAILABLE]", {
                    size: event.data.size,
                    time: Date.now()
                });

                uploadChunk(event.data, sessionId);

            } else {
                console.warn("[EMPTY AUDIO CHUNK]");
            }
        };

        mediaRecorder.onstop = () => {
            console.log("[REC STOP EVENT]");
        };

        mediaRecorder.start();
        console.log("[REC STARTED]");

        // =========================
        // CHUNK LOOP (UNCHANGED)
        // =========================
        chunkTimer = setInterval(() => {

            if (!isRecording) return;

            if (mediaRecorder && mediaRecorder.state === "recording") {

                console.log("[REC CHUNK TRIGGER]", Date.now());

                setTimeout(() => {

                    if (!isRecording) return;

                    try {
                        mediaRecorder.stop();
                        console.log("[REC STOP FOR CHUNK]");
                    } catch (err) {
                        console.warn("[REC STOP ERROR]", err);
                    }

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

        }, 8000);

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

            if (res.status === 400) {
                console.log("[IGNORE FINAL CHUNK AFTER SESSION END]");
                return;
            }

            stopRecording(true);
        }

    } catch (err) {
        console.error("[UPLOAD FAILED]", err);
    }
}


// =========================
// STOP RECORDING (FIXED CLEANUP)
// =========================
function stopRecording(force = false) {

    console.log("[REC STOP REQUEST]", {
        force,
        isRecording,
        time: Date.now()
    });

    isRecording = false;

    if (chunkTimer) {
        clearInterval(chunkTimer);
        chunkTimer = null;
        console.log("[REC INTERVAL CLEARED]");
    }

    if (mediaRecorder) {
        try {
            if (mediaRecorder.state !== "inactive") {
                mediaRecorder.stop();
                console.log("[RECORDER FORCE STOP]");
            }
        } catch (err) {
            console.warn("[RECORDER STOP ERROR]", err);
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

    mediaRecorder = null;

    // 🔥 FIXED CLEANUP (no race condition)
    cleanupTimeout = setTimeout(() => {
        if (!isRecording) {
            currentSessionId = null;
            console.log("[REC SESSION CLEARED]");
        } else {
            console.log("[CLEANUP SKIPPED - STILL RECORDING]");
        }
        cleanupTimeout = null;
    }, 500);

    console.log("[REC FULLY STOPPED]");
}


// =========================
// EXPORTS
// =========================
export { startRecording, stopRecording };