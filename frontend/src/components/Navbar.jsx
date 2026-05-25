import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";

const PAGE_META = {
  // Super Admin
  "/super-admin/dashboard": {
    title: "Super Admin Dashboard",
    subtitle: "Overall ERP summary and control panel",
  },
  "/super-admin/centers": {
    title: "Centers",
    subtitle: "Manage study center information",
  },
  "/super-admin/users": {
    title: "Center Admins",
    subtitle: "Manage admin users and access roles",
  },
  "/super-admin/exam-registrations": {
    title: "Exam Registrations",
    subtitle: "Review scholarship exam applications",
  },
  "/super-admin/merit-list": {
    title: "Merit List",
    subtitle: "Upload and manage center-wise merit lists",
  },

  // Center Admin
  "/center-admin/dashboard": {
    title: "Center Dashboard",
    subtitle: "Center-level ERP overview",
  },
  "/center-admin/admissions": {
    title: "Admissions",
    subtitle: "Create admission records and generate RSC numbers",
  },
  "/center-admin/admit-student": {
    title: "Admit Student",
    subtitle: "Admit scholarship or non-scholarship students",
  },
  "/center-admin/students": {
    title: "Students",
    subtitle: "View and manage student records",
  },
  "/center-admin/hostel": {
    title: "Hostel",
    subtitle: "Manage hostel rooms and occupancy",
  },
  "/center-admin/mess": {
    title: "Mess",
    subtitle: "Manage mess plans and student facility records",
  },
  "/center-admin/library": {
    title: "Library",
    subtitle: "Manage library records and issued books",
  },
  "/center-admin/accounts": {
    title: "Accounts",
    subtitle: "Manage fees, receipts, donations and expenses",
  },
};

function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const currentPage = PAGE_META[location.pathname] || {
    title: "Study Center ERP",
    subtitle: "Manage your ERP modules",
  };

  const handleLogout = () => {
    if (logout) {
      logout();
    } else {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }

    navigate("/login", { replace: true });
  };

  return (
    <header className="top-navbar">
      <div>
        <h1>{currentPage.title}</h1>
        <p>
          {currentPage.subtitle}
          {user?.name ? `, ${user.name}` : ""}
        </p>
      </div>

      <div className="navbar-actions">
        <span className="role-pill">{formatRole(user?.role)}</span>

        <button className="logout-btn" onClick={handleLogout}>
          Logout
        </button>

        {user && (
          <Link to="/change-password" className="secondary-btn">
            Change Password
          </Link>
        )}
      </div>
    </header>
  );
}

function formatRole(role) {
  if (!role) return "ADMIN";

  return role
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default Navbar;
