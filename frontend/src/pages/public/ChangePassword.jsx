import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import API from "../../api/api";
import { useAuth } from "../../context/AuthContext";

function getDashboardPath(role) {
  if (role === "SUPER_ADMIN") return "/super-admin/dashboard";
  if (role === "CENTER_ADMIN") return "/center-admin/dashboard";
  return "/login";
}

function ChangePassword() {
  const navigate = useNavigate();
  const { user, authLoading, isAuthenticated, updateUser, logout } = useAuth();

  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    document.title = "Change Password | Study Center ERP";
  }, []);

  if (authLoading) {
    return <div className="full-page-loader">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!form.currentPassword || !form.newPassword || !form.confirmPassword) {
      setError("Please fill all password fields.");
      return;
    }

    if (form.newPassword.length < 8) {
      setError("New password must be at least 8 characters long.");
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      setError("New password and confirm password do not match.");
      return;
    }

    if (form.currentPassword === form.newPassword) {
      setError("New password must be different from current password.");
      return;
    }

    try {
      setLoading(true);

      const res = await API.put("/auth/change-password", {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
        confirmPassword: form.confirmPassword,
      });

      const updatedUser = res.data?.data?.user;

      if (updatedUser && updateUser) {
        updateUser(updatedUser);
      }

      setSuccess("Password changed successfully.");

      setTimeout(() => {
        navigate(getDashboardPath(updatedUser?.role || user?.role), {
          replace: true,
        });
      }, 700);
    } catch (err) {
      console.error("Change password failed:", err);

      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Failed to change password. Please try again.";

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="change-password-page">
      <div className="change-password-card">
        <div className="change-password-header">
          <div className="login-logo">ERP</div>

          <div>
            <h1>Change Password</h1>
            <p>
              For security, please set your own password before continuing to
              the ERP dashboard.
            </p>
          </div>
        </div>

        {user?.forcePasswordChange && (
          <div className="info-box">
            You are using a temporary password. Please change it to continue.
          </div>
        )}

        {error && <div className="error-box">{error}</div>}
        {success && <div className="success-box">{success}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Current Password</label>
            <input
              type="password"
              name="currentPassword"
              placeholder="Enter current password"
              value={form.currentPassword}
              onChange={handleChange}
              autoComplete="current-password"
              required
            />
          </div>

          <div className="form-group">
            <label>New Password</label>
            <input
              type="password"
              name="newPassword"
              placeholder="Enter new password"
              value={form.newPassword}
              onChange={handleChange}
              autoComplete="new-password"
              required
            />
          </div>

          <div className="form-group">
            <label>Confirm New Password</label>
            <input
              type="password"
              name="confirmPassword"
              placeholder="Confirm new password"
              value={form.confirmPassword}
              onChange={handleChange}
              autoComplete="new-password"
              required
            />
          </div>

          <button className="primary-btn change-password-btn" disabled={loading}>
            {loading ? "Updating Password..." : "Change Password"}
          </button>
        </form>

        <button
          type="button"
          className="ghost-btn change-password-logout"
          onClick={handleLogout}
        >
          Logout and go back
        </button>
      </div>
    </div>
  );
}

export default ChangePassword;