import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../features/auth/AuthContext";
import PrivateRoute from "../components/PrivateRoute";
import Login from "../features/auth/pages/Login";
import Signup from "../features/auth/pages/Signup";

import ProfessorDashboard from "../features/dashboard/pages/ProfessorDashboard";
import StudentDashboard from "../features/dashboard/pages/StudentDashboard";
import DashboardLayout from "../components/DashboardLayout";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Login />} />
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
          {/* Professor Dashboard */}
          <Route
            path="/dashboard/professor"
            element={
              <PrivateRoute allowedRoles={["professor"]}>
                <ProfessorDashboard />
              </PrivateRoute>
            }
          />

          {/* Student Dashboard */}
          <Route
            path="/dashboard/student"
            element={
              <PrivateRoute allowedRoles={["student"]}>
                <StudentDashboard />
              </PrivateRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;