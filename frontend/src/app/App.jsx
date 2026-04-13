import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext, AuthProvider } from "../features/auth/AuthContext";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import PrivateRoute from "../components/PrivateRoute";

import Login from "../features/auth/pages/Login";
import Signup from "../features/auth/pages/Signup";

import ProfessorDashboard from "../features/dashboard/pages/ProfessorDashboard";
import StudentDashboard from "../features/dashboard/pages/StudentDashboard";
import DashboardLayout from "../components/DashboardLayout";

// Courses
import ProfessorCourses from "../features/courses/pages/ProfessorCourses";
import StudentCourses from "../features/courses/pages/StudentCourses";
import CourseDetails from "../features/courses/pages/CourseDetails";

// Analytics
import ProfessorAnalytics from "../features/analytics/pages/ProfessorAnalytics";
import StudentAnalytics from "../features/analytics/pages/StudentAnalytics";

// Redirect logged-in users away from public pages
function PublicRoute({ children }) {
  const { token, user, loading } = useContext(AuthContext);

  if (loading) return null;

  if (token) {
    return user?.role === "professor"
      ? <Navigate to="/dashboard/professor" replace />
      : <Navigate to="/dashboard/student" replace />;
  }

  return children;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>

          {/* Public routes */}
          <Route path="/" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/signup" element={<Signup />} />

          {/* Professor dashboard */}
          <Route
            path="/dashboard/professor"
            element={
              <PrivateRoute allowedRoles={["professor"]}>
                <DashboardLayout><ProfessorDashboard /></DashboardLayout>
              </PrivateRoute>
            }
          />

          {/* Student dashboard */}
          <Route
            path="/dashboard/student"
            element={
              <PrivateRoute allowedRoles={["student"]}>
                <DashboardLayout><StudentDashboard /></DashboardLayout>
              </PrivateRoute>
            }
          />

          {/* Professor courses */}
          <Route
            path="/dashboard/professor/courses"
            element={
              <PrivateRoute allowedRoles={["professor"]}>
                <DashboardLayout><ProfessorCourses /></DashboardLayout>
              </PrivateRoute>
            }
          />

          {/* Student courses */}
          <Route
            path="/dashboard/student/courses"
            element={
              <PrivateRoute allowedRoles={["student"]}>
                <DashboardLayout><StudentCourses /></DashboardLayout>
              </PrivateRoute>
            }
          />

          {/* Course details (professor) */}
          <Route
            path="/dashboard/professor/courses/:courseId"
            element={
              <PrivateRoute allowedRoles={["professor"]}>
                <DashboardLayout><CourseDetails /></DashboardLayout>
              </PrivateRoute>
            }
          />

          {/* Course details (student) */}
          <Route
            path="/dashboard/student/courses/:courseId"
            element={
              <PrivateRoute allowedRoles={["student"]}>
                <DashboardLayout><CourseDetails /></DashboardLayout>
              </PrivateRoute>
            }
          />

          {/* Professor analytics */}
          <Route
            path="/dashboard/professor/analytics"
            element={
              <PrivateRoute allowedRoles={["professor"]}>
                <DashboardLayout><ProfessorAnalytics /></DashboardLayout>
              </PrivateRoute>
            }
          />

          <Route
            path="/dashboard/professor/analytics/:courseId"
            element={
              <PrivateRoute allowedRoles={["professor"]}>
                <DashboardLayout><ProfessorAnalytics /></DashboardLayout>
              </PrivateRoute>
            }
          />

          {/* Student analytics */}
          <Route
            path="/dashboard/student/analytics"
            element={
              <PrivateRoute allowedRoles={["student"]}>
                <DashboardLayout><StudentAnalytics /></DashboardLayout>
              </PrivateRoute>
            }
          />

        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;