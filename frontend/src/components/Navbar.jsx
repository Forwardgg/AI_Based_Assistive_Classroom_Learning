import { Link, useLocation } from "react-router-dom";
import { useContext, useState } from "react";
import { AuthContext } from "../features/auth/AuthContext";
import "./Navbar.css";

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  // Base path by role
  const basePath =
    user?.role === "professor"
      ? "/dashboard/professor"
      : "/dashboard/student";

  // Active route logic (exact for dashboard)
  const isActive = (path) => {
    if (path === basePath) return location.pathname === path;
    return (
      location.pathname === path ||
      location.pathname.startsWith(path + "/")
    );
  };

  // Navigation links
  const links =
    user?.role === "professor"
      ? ["Dashboard", "Courses", "Analytics"]
      : ["Dashboard", "My Courses", "Analytics"];

  // Safe first name extraction
  const getFirstName = () => {
    if (!user?.name) return "";
    return user.name.trim().split(" ")[0];
  };

  // Initials
  const getInitials = () => {
    if (!user?.name) return "U";
    return user.name.trim().charAt(0).toUpperCase();
  };

  // Route generator
  const getPath = (link) => {
    const slug = link.toLowerCase().replace(" ", "-");

    if (slug === "dashboard") return basePath;
    if (slug === "analytics") return `${basePath}/analytics`;
    if (slug === "courses" || slug === "my-courses")
      return `${basePath}/courses`;

    return `${basePath}/${slug}`;
  };

  return (
    <nav className="navbar">
      <div className="nav-container">

        {/* Brand (click → dashboard) */}
        <Link to={basePath} className="nav-left">
          <img src="/logo.png" alt="AIBACLS" className="nav-logo" />
          <span className="brand">AIBACLS</span>
        </Link>

        {/* Desktop nav */}
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

        {/* User dropdown */}
        <div className="nav-right desktop">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="user-btn"
          >
            <span className="avatar">{getInitials()}</span>
            <span className="user-name">
              {getFirstName() || "User"}
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

        {/* Mobile toggle */}
        <button
          className="mobile-menu"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          ☰
        </button>
      </div>

      {/* Mobile nav */}
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