import api from "../../services/api";

export const startSession = (sessionId) =>
  api.post(`/sessions/${sessionId}/start`);

export const pauseSession = (sessionId) =>
  api.post(`/sessions/${sessionId}/pause`);

export const resumeSession = (sessionId) =>
  api.post(`/sessions/${sessionId}/resume`);

export const stopSession = (sessionId) =>
  api.post(`/sessions/${sessionId}/stop`);

export const getSession = (sessionId) =>
  api.get(`/sessions/${sessionId}`);