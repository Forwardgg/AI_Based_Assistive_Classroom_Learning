// frontend/src/components/PrivateRoute.jsx
import { useContext } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { AuthContext } from "../features/auth/AuthContext";

/**
 * PrivateRoute
 * Protects routes based on:
 * - Authentication (token)
 * - Optional role-based access
 *
 * Usage:
 * <PrivateRoute>
 *    <Component />
 * </PrivateRoute>
 *
 * With roles:
 * <PrivateRoute allowedRoles={["professor"]}>
 *    <ProfessorDashboard />
 * </PrivateRoute>
 */

const PrivateRoute = ({ children, allowedRoles = null }) => {
  const { token, user, loading } = useContext(AuthContext);
  const location = useLocation();

  // While checking authentication (e.g., on refresh)
  if (loading) {
    return <div>Checking authentication...</div>;
  }

  // If not logged in
  if (!token) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // If roles are defined, check user role
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default PrivateRoute;