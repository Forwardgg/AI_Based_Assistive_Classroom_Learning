import api from "../../services/api";

// =========================
// GENERIC HANDLER (optional but recommended)
// =========================
const handleRequest = async (request) => {
  try {
    const res = await request;
    return res;
  } catch (err) {
    console.error("Analytics API error:", err.response?.data || err.message);
    throw err;
  }
};

// =========================
// SESSION SUMMARY
// =========================
export const getSessionSummary = (sessionId) =>
  handleRequest(
    api.get(`/analytics/session/${sessionId}/summary`)
  );

// =========================
// PARTITION ANALYTICS
// =========================
export const getPartitionAnalytics = (sessionId) =>
  handleRequest(
    api.get(`/analytics/session/${sessionId}/partitions`)
  );

// =========================
// STUDENT ANALYTICS
// =========================
export const getStudentAnalytics = (sessionId) =>
  handleRequest(
    api.get(`/analytics/session/${sessionId}/students`)
  );

// =========================
// QUESTION ANALYTICS
// =========================
export const getQuestionAnalytics = (sessionId) =>
  handleRequest(
    api.get(`/analytics/session/${sessionId}/questions`)
  );

// =========================
// (OPTIONAL FUTURE)
// COURSE-LEVEL ANALYTICS
// =========================
export const getCourseTrend = (courseId) =>
  handleRequest(
    api.get(`/analytics/course/${courseId}/trend`)
  );

// =========================
// (OPTIONAL FUTURE)
// STUDENT PERSONAL ANALYTICS
// =========================
export const getStudentSessionAnalytics = (sessionId) =>
  handleRequest(
    api.get(`/analytics/student/${sessionId}`)
  );