// frontend/src/features/lectures/recordingService.js

let mediaRecorder = null; // MediaRecorder instance for audio recording
let stream = null; // Audio stream from microphone
let currentSessionId = null; // Active session ID for uploads
let chunkTimer = null; // Interval timer for chunking audio
let isRecording = false; // Recording state flag

// Timeout reference for delayed cleanup
let cleanupTimeout = null;


// Starts recording audio and sends chunks periodically
async function startRecording(sessionId) {

    console.log("[REC START REQUEST]", {
        sessionId,
        time: Date.now()
    });

    // Cancel any pending cleanup from previous session
    if (cleanupTimeout) {
        clearTimeout(cleanupTimeout);
        cleanupTimeout = null;
        console.log("[CANCELLED OLD CLEANUP]");
    }

    // Prevent duplicate recording sessions
    if (isRecording) {
        console.log("[REC SKIP] Already recording");
        return;
    }

    currentSessionId = sessionId;
    isRecording = true;

    try {
        // Request microphone access
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        console.log("[REC STREAM ACQUIRED]");

        // Initialize MediaRecorder with WebM format
        mediaRecorder = new MediaRecorder(stream, {
            mimeType: "audio/webm"
        });

        // Triggered when audio data is available
        mediaRecorder.ondataavailable = async (event) => {

            const sessionId = currentSessionId;

            // Drop chunk if session is not valid
            if (!sessionId) {
                console.warn("[REC DATA DROPPED - NO SESSION]");
                return;
            }

            // Upload chunk if valid
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

        // Triggered when recorder stops
        mediaRecorder.onstop = () => {
            console.log("[REC STOP EVENT]");
        };

        // Start recording
        mediaRecorder.start();
        console.log("[REC STARTED]");

        // Periodically stop and restart recorder to generate chunks
        chunkTimer = setInterval(() => {

            if (!isRecording) return;

            if (mediaRecorder && mediaRecorder.state === "recording") {

                console.log("[REC CHUNK TRIGGER]", Date.now());

                setTimeout(() => {

                    if (!isRecording) return;

                    try {
                        mediaRecorder.stop(); // Stop to trigger data event
                        console.log("[REC STOP FOR CHUNK]");
                    } catch (err) {
                        console.warn("[REC STOP ERROR]", err);
                    }

                    setTimeout(() => {

                        if (!isRecording) return;

                        try {
                            mediaRecorder.start(); // Restart recording
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


// Uploads recorded audio chunk to backend
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
        // Send chunk to backend API
        const res = await fetch("http://localhost:5000/api/transcripts/upload", {
            method: "POST",
            body: formData
        });

        console.log("[UPLOAD RESPONSE]", res.status);

        if (!res.ok) {

            console.warn("[UPLOAD REJECTED]", res.status);

            // Ignore final chunk after session ends
            if (res.status === 400) {
                console.log("[IGNORE FINAL CHUNK AFTER SESSION END]");
                return;
            }

            // Stop recording on serious errors
            stopRecording(true);
        }

    } catch (err) {
        console.error("[UPLOAD FAILED]", err);
    }
}


// Stops recording and releases all resources
function stopRecording(force = false) {

    console.log("[REC STOP REQUEST]", {
        force,
        isRecording,
        time: Date.now()
    });

    isRecording = false;

    // Clear chunk interval
    if (chunkTimer) {
        clearInterval(chunkTimer);
        chunkTimer = null;
        console.log("[REC INTERVAL CLEARED]");
    }

    if (mediaRecorder) {
        try {
            if (mediaRecorder.state === "recording") {

                console.log("[FINAL CHUNK FLUSH]");

                // Force last chunk to be emitted
                mediaRecorder.requestData();

                // Stop recorder after data is flushed
                setTimeout(() => {
                    try {
                        mediaRecorder.stop();
                        console.log("[RECORDER FORCE STOP]");
                    } catch (err) {
                        console.warn("[RECORDER STOP ERROR]", err);
                    }
                }, 200);

            }
        } catch (err) {
            console.warn("[RECORDER STOP ERROR]", err);
        }
    }

    // Stop all audio tracks
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

    // Delayed cleanup of session ID
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


// Export recording functions
export { startRecording, stopRecording };