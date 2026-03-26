// frontend/src/services/socket.js

import { io } from "socket.io-client";

const socket = io("http://localhost:5000", {
  transports: ["websocket"],
  autoConnect: true,
});

// =========================
// CONNECTION DEBUG
// =========================
socket.on("connect", () => {
  console.log("[SOCKET CONNECTED]", {
    id: socket.id,
    time: Date.now()
  });
});

socket.on("disconnect", (reason) => {
  console.log("[SOCKET DISCONNECTED]", {
    reason,
    time: Date.now()
  });
});

socket.on("connect_error", (err) => {
  console.error("[SOCKET CONNECT ERROR]", err.message);
});

socket.on("reconnect_attempt", (attempt) => {
  console.log("[SOCKET RECONNECT ATTEMPT]", attempt);
});

socket.on("reconnect", (attempt) => {
  console.log("[SOCKET RECONNECTED]", {
    attempt,
    time: Date.now()
  });
});

// =========================
// 🔥 GLOBAL EVENT DEBUGGER
// =========================
socket.onAny((event, ...args) => {
  console.log("[SOCKET EVENT]", {
    event,
    data: args,
    time: Date.now()
  });
});

export default socket;