// frontend/src/features/lectures/sessionApi.js

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

export const generateNotes = (sessionId) =>
  api.post(`/sessions/${sessionId}/notes`);

export const getNotes = (sessionId) =>
  api.get(`/sessions/${sessionId}/notes`);

export const updateNotes = (sessionId, data) =>
  api.put(`/sessions/${sessionId}/notes`, data);