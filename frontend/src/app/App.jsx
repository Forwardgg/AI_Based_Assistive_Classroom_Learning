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
          <Route
  path="/"
  element={
    <PublicRoute>
      <Login />
    </PublicRoute>
  }
/>
          <Route path="/signup" element={<Signup />} />
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
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;