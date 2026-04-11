// frontend/src/features/analytics/analyticsAPI.js
import api from "../../services/api";

// =========================
// GENERIC HANDLER
// =========================
const handleRequest = async (request) => {
  try {
    const res = await request;
    return res.data; // ✅ always return data directly
  } catch (err) {
    console.error(
      "Analytics API error:",
      err.response?.data || err.message
    );
    throw err;
  }
};

// =====================================================
// 🔷 PROFESSOR ANALYTICS
// =====================================================

// =========================
// GET ALL SESSIONS (PROFESSOR)
// =========================
export const getProfessorSessions = () =>
  handleRequest(
    api.get("/analytics/sessions")
  );

// =========================
// FULL SESSION ANALYTICS (PROFESSOR)
// =========================
export const getProfessorSessionAnalytics = (sessionId) =>
  handleRequest(
    api.get(`/analytics/session/${sessionId}`)
  );

// =========================
// OPTIONAL GRANULAR (if needed later)
// =========================
export const getSessionSummary = (sessionId) =>
  handleRequest(
    api.get(`/analytics/session/${sessionId}/summary`)
  );

export const getPartitionAnalytics = (sessionId) =>
  handleRequest(
    api.get(`/analytics/session/${sessionId}/partitions`)
  );

export const getStudentAnalytics = (sessionId) =>
  handleRequest(
    api.get(`/analytics/session/${sessionId}/students`)
  );

export const getQuestionAnalytics = (sessionId) =>
  handleRequest(
    api.get(`/analytics/session/${sessionId}/questions`)
  );

// =====================================================
// 🔷 STUDENT ANALYTICS
// =====================================================

// =========================
// GET STUDENT SESSIONS (for dropdown)
// =========================
export const getStudentSessions = () =>
  handleRequest(
    api.get("/analytics/student/sessions")
  );

// =========================
// GET STUDENT SESSION ANALYTICS (MAIN)
// =========================
export const getStudentSessionAnalytics = (sessionId) =>
  handleRequest(
    api.get(`/analytics/student/session/${sessionId}`)
  );

// =====================================================
// 🔷 OPTIONAL FUTURE (COURSE LEVEL)
// =====================================================
export const getCourseTrend = (courseId) =>
  handleRequest(
    api.get(`/analytics/course/${courseId}/trend`)
  );