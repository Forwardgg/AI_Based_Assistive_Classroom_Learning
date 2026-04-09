// frontend/src/components/Navbar.jsx
import { Link, useLocation } from "react-router-dom";
import { useContext, useState } from "react";
import { AuthContext } from "../features/auth/AuthContext";
import "./Navbar.css";

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  // =========================
  // BASE PATH
  // =========================
  const basePath =
    user?.role === "professor"
      ? "/dashboard/professor"
      : "/dashboard/student";

  // =========================
  // ACTIVE CHECK
  // =========================
  const isActive = (path) => {
    return (
      location.pathname === path ||
      location.pathname.startsWith(path + "/")
    );
  };

  // =========================
  // NAV LINKS
  // =========================
  const links =
    user?.role === "professor"
      ? ["Dashboard", "Courses", "Analytics"]
      : ["Dashboard", "My Courses", "Results"];

  // =========================
  // INITIALS
  // =========================
  const getInitials = () => {
    if (!user?.name) return "U";
    return user.name.charAt(0).toUpperCase();
  };

  // =========================
  // ROUTE GENERATOR
  // =========================
  const getPath = (link) => {
    const slug = link.toLowerCase().replace(" ", "-");

    // Dashboard
    if (slug === "dashboard") return basePath;

    // Professor Analytics
    if (slug === "analytics") {
      return `${basePath}/analytics`;
    }

    // Courses (Professor + Student)
    if (slug === "courses" || slug === "my-courses") {
      return `${basePath}/courses`;
    }

    // Results (Student only)
    if (slug === "results") {
      return `${basePath}/results`;
    }

    return `${basePath}/${slug}`;
  };

  return (
    <nav className="navbar">
      <div className="nav-container">

        {/* LEFT */}
        <div className="nav-left">
          <img src="/logo.png" alt="AIBACLS" className="nav-logo" />
          <span className="brand">AIBACLS</span>
        </div>

        {/* =========================
            DESKTOP NAV
        ========================= */}
        <div className="nav-center desktop">
          {links.map((link) => {
            const path = getPath(link);
            return (
              <Link
                key={link}
                to={path}
                className={isActive(path) ? "active" : ""}
              >
                {link}
              </Link>
            );
          })}
        </div>

        {/* =========================
            USER DROPDOWN
        ========================= */}
        <div className="nav-right desktop">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="user-btn"
          >
            <span className="avatar">{getInitials()}</span>
            <span className="user-name">
              {user?.name?.split(" ")[0] || "User"}
            </span>
            <span className="caret">{menuOpen ? "▲" : "▼"}</span>
          </button>

          {menuOpen && (
            <div className="dropdown">
              <div className="user-info">
                <div className="user-fullname">
                  {user?.name || "User"}
                </div>
                <div className="user-email">
                  {user?.email || "email@example.com"}
                </div>
                <span className={`role-badge ${user?.role}`}>
                  {user?.role || "student"}
                </span>
              </div>

              <Link to="/profile" onClick={() => setMenuOpen(false)}>
                Profile
              </Link>

              <button onClick={logout} className="logout-btn">
                Logout
              </button>
            </div>
          )}
        </div>

        {/* =========================
            MOBILE MENU BUTTON
        ========================= */}
        <button
          className="mobile-menu"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          ☰
        </button>
      </div>

      {/* =========================
          MOBILE NAV
      ========================= */}
      {menuOpen && (
        <div className="mobile-nav">
          {links.map((link) => {
            const path = getPath(link);
            return (
              <Link
                key={link}
                to={path}
                onClick={() => setMenuOpen(false)}
              >
                {link}
              </Link>
            );
          })}

          <hr />

          <div className="mobile-user">
            <div>{user?.name || "User"}</div>
            <div className="mobile-email">
              {user?.email || "email@example.com"}
            </div>
          </div>

          <Link to="/profile" onClick={() => setMenuOpen(false)}>
            Profile
          </Link>

          <button onClick={logout} className="mobile-logout-btn">
            Logout
          </button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;