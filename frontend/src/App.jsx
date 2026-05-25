import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";

import Login from "./pages/public/Login";
import PublicExamRegistration from "./pages/public/PublicExamRegistration";
import ChangePassword from "./pages/public/ChangePassword";

import SuperAdminDashboard from "./pages/superadmin/Dashboard";
import Centers from "./pages/superadmin/Centers";
import Users from "./pages/superadmin/Users";
import ExamRegistrations from "./pages/superadmin/ExamRegistrations";
import MeritListPage from "./pages/superadmin/MeritListPage";

import CenterAdminDashboard from "./pages/centeradmin/Dashboard";
import Admission from "./pages/centeradmin/Admission";
import Students from "./pages/centeradmin/Students";
import Hostel from "./pages/centeradmin/Hostel";
import Mess from "./pages/centeradmin/Mess";
import Library from "./pages/centeradmin/Library";
import Accounts from "./pages/centeradmin/Accounts";

import ProtectedRoute from "./components/ProtectedRoute";
import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";

function DashboardLayout({ children }) {
  return (
    <div className="app-layout">
      <Sidebar />

      <main className="main-content">
        <Navbar />
        {children}
      </main>
    </div>
  );
}

function ProtectedPage({ children, allowedRoles }) {
  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <DashboardLayout>{children}</DashboardLayout>
    </ProtectedRoute>
  );
}

function RoleBasedRedirect() {
  const { user, authLoading, isAuthenticated } = useAuth();

  if (authLoading) {
    return <div className="full-page-loader">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role === "SUPER_ADMIN") {
    return <Navigate to="/super-admin/dashboard" replace />;
  }

  if (user?.role === "CENTER_ADMIN") {
    return <Navigate to="/center-admin/dashboard" replace />;
  }

  return <Navigate to="/login" replace />;
}

function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<PublicExamRegistration />} />
      <Route path="/register" element={<PublicExamRegistration />} />
      <Route path="/exam-registration" element={<PublicExamRegistration />} />
      <Route path="/login" element={<Login />} />
      <Route
        path="/change-password"
        element={
          <ProtectedRoute allowedRoles={["SUPER_ADMIN", "CENTER_ADMIN"]}>
            <ChangePassword />
          </ProtectedRoute>
        }
      />

      {/* Role Redirect */}
      <Route path="/dashboard" element={<RoleBasedRedirect />} />

      {/* Super Admin Routes */}
      <Route
        path="/super-admin/dashboard"
        element={
          <ProtectedPage allowedRoles={["SUPER_ADMIN"]}>
            <SuperAdminDashboard />
          </ProtectedPage>
        }
      />

      <Route
        path="/super-admin/centers"
        element={
          <ProtectedPage allowedRoles={["SUPER_ADMIN"]}>
            <Centers />
          </ProtectedPage>
        }
      />

      <Route
        path="/super-admin/users"
        element={
          <ProtectedPage allowedRoles={["SUPER_ADMIN"]}>
            <Users />
          </ProtectedPage>
        }
      />

      <Route
        path="/super-admin/exam-registrations"
        element={
          <ProtectedPage allowedRoles={["SUPER_ADMIN"]}>
            <ExamRegistrations />
          </ProtectedPage>
        }
      />

      <Route
        path="/super-admin/merit-list"
        element={
          <ProtectedPage allowedRoles={["SUPER_ADMIN"]}>
            <MeritListPage />
          </ProtectedPage>
        }
      />

      {/* Center Admin Routes */}
      <Route
        path="/center-admin/dashboard"
        element={
          <ProtectedPage allowedRoles={["CENTER_ADMIN"]}>
            <CenterAdminDashboard />
          </ProtectedPage>
        }
      />

      <Route
        path="/center-admin/admissions"
        element={
          <ProtectedPage allowedRoles={["CENTER_ADMIN"]}>
            <Admission />
          </ProtectedPage>
        }
      />

      <Route
        path="/center-admin/admit-student"
        element={<Navigate to="/center-admin/admissions" replace />}
      />

      <Route
        path="/center-admin/students"
        element={
          <ProtectedPage allowedRoles={["CENTER_ADMIN"]}>
            <Students />
          </ProtectedPage>
        }
      />

      <Route
        path="/center-admin/hostel"
        element={
          <ProtectedPage allowedRoles={["CENTER_ADMIN"]}>
            <Hostel />
          </ProtectedPage>
        }
      />

      <Route
        path="/center-admin/mess"
        element={
          <ProtectedPage allowedRoles={["CENTER_ADMIN"]}>
            <Mess />
          </ProtectedPage>
        }
      />

      <Route
        path="/center-admin/library"
        element={
          <ProtectedPage allowedRoles={["CENTER_ADMIN"]}>
            <Library />
          </ProtectedPage>
        }
      />

      <Route
        path="/center-admin/accounts"
        element={
          <ProtectedPage allowedRoles={["CENTER_ADMIN"]}>
            <Accounts />
          </ProtectedPage>
        }
      />

      {/* Old Route Redirects */}
      <Route
        path="/students"
        element={<Navigate to="/center-admin/students" replace />}
      />

      <Route
        path="/admissions"
        element={<Navigate to="/center-admin/admissions" replace />}
      />

      <Route
        path="/exam-registrations"
        element={<Navigate to="/super-admin/exam-registrations" replace />}
      />

      <Route
        path="/centers"
        element={<Navigate to="/super-admin/centers" replace />}
      />

      <Route
        path="/users"
        element={<Navigate to="/super-admin/users" replace />}
      />

      <Route
        path="/merit-list"
        element={<Navigate to="/super-admin/merit-list" replace />}
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
