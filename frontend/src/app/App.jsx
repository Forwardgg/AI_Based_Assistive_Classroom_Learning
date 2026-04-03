// frontend/src/app/App.jsx
import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../features/auth/AuthContext";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../features/auth/AuthContext";
import PrivateRoute from "../components/PrivateRoute";

import Login from "../features/auth/pages/Login";
import Signup from "../features/auth/pages/Signup";

import ProfessorDashboard from "../features/dashboard/pages/ProfessorDashboard";
import StudentDashboard from "../features/dashboard/pages/StudentDashboard";
import DashboardLayout from "../components/DashboardLayout";

// ✅ NEW IMPORTS
import ProfessorCourses from "../features/courses/pages/ProfessorCourses";
import CourseDetails from "../features/courses/pages/CourseDetails";

function PublicRoute({ children }) {
  const { token, user, loading } = useContext(AuthContext);

  if (loading) return null;

  if (token) {
    if (user?.role === "professor") {
      return <Navigate to="/dashboard/professor" replace />;
    } else {
      return <Navigate to="/dashboard/student" replace />;
    }
  }

  return children;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>

          {/* PUBLIC ROUTES */}
          <Route
            path="/"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />
          <Route path="/signup" element={<Signup />} />

          {/* PROFESSOR DASHBOARD */}
          <Route
            path="/dashboard/professor"
            element={
              <PrivateRoute allowedRoles={["professor"]}>
                <DashboardLayout>
                  <ProfessorDashboard />
                </DashboardLayout>
              </PrivateRoute>
            }
          />

          {/* STUDENT DASHBOARD */}
          <Route
            path="/dashboard/student"
            element={
              <PrivateRoute allowedRoles={["student"]}>
                <DashboardLayout>
                  <StudentDashboard />
                </DashboardLayout>
              </PrivateRoute>
            }
          />

          {/* ✅ PROFESSOR COURSES */}
          <Route
            path="/dashboard/professor/courses"
            element={
              <PrivateRoute allowedRoles={["professor"]}>
                <DashboardLayout>
                  <ProfessorCourses />
                </DashboardLayout>
              </PrivateRoute>
            }
          />

          {/* ✅ COURSE DETAILS */}
          <Route
            path="/dashboard/professor/courses/:courseId"
            element={
              <PrivateRoute allowedRoles={["professor"]}>
                <DashboardLayout>
                  <CourseDetails />
                </DashboardLayout>
              </PrivateRoute>
            }
          />

        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;