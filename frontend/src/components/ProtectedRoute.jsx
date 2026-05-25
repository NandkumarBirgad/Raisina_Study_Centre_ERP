import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function getRoleDashboard(role) {
  if (role === "SUPER_ADMIN") return "/super-admin/dashboard";
  if (role === "CENTER_ADMIN") return "/center-admin/dashboard";
  return "/login";
}

function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, authLoading, user } = useAuth();

  if (authLoading) {
    return (
      <div className="full-page-loader">
        <div className="loader-card">
          <div className="spinner"></div>
          <p>Checking session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to={getRoleDashboard(user?.role)} replace />;
  }

  return children;
}

export default ProtectedRoute;