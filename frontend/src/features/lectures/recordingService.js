// frontend/src/features/lectures/recordingService.js

let mediaRecorder = null
let stream = null
let currentSessionId = null

export async function startRecording(sessionId) {

    console.log("Starting recording for session:", sessionId)

    currentSessionId = sessionId

    stream = await navigator.mediaDevices.getUserMedia({ audio: true })

    mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm"
    })

    mediaRecorder.ondataavailable = async (event) => {

        if (!currentSessionId) return

        if (event.data && event.data.size > 0) {

            console.log("Uploading chunk size:", event.data.size)

            uploadChunk(event.data, currentSessionId)

        }

    }

    // emit chunk every 10 seconds
    mediaRecorder.start(10000)

}

async function uploadChunk(blob, sessionId) {

    const formData = new FormData()

    formData.append("session_id", sessionId)
    formData.append("audio", blob, "chunk.webm")

    try {

        const res = await fetch("http://localhost:5000/api/transcripts/upload", {
            method: "POST",
            body: formData
        })

        const data = await res.json()

        if (data.text) {
            console.log("TRANSCRIPT:", data.text)
        }

    } catch (err) {

        console.error("Upload failed:", err)

    }

}

export function stopRecording() {

    console.log("Stopping recording")

    currentSessionId = null

    if (mediaRecorder && mediaRecorder.state !== "inactive") {
        mediaRecorder.stop()
    }

    if (stream) {
        stream.getTracks().forEach(track => track.stop())
        stream = null
    }

}