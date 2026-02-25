import { Link, useLocation } from "react-router-dom";
import { useContext, useState } from "react";
import { AuthContext } from "../features/auth/AuthContext";
import "./Navbar.css";

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (path) => location.pathname === path;

  const links = user?.role === "professor" 
    ? ["Dashboard", "Courses", "Analytics"]
    : ["Dashboard", "My Courses", "Results"];

  // Get initials from name
  const getInitials = () => {
    if (!user?.name) return "U";
    return user.name.charAt(0).toUpperCase();
  };

  return (
    <nav className="navbar">
      <div className="nav-container">
        <div className="nav-left">
          <img src="/logo.png" alt="AIBACLS" className="nav-logo" />
          <span className="brand">AIBACLS</span>
        </div>

        <div className="nav-center desktop">
          {links.map(link => (
            <Link 
              key={link} 
              to={`/${link.toLowerCase().replace(' ', '-')}`}
              className={isActive(`/${link.toLowerCase().replace(' ', '-')}`) ? "active" : ""}
            >
              {link}
            </Link>
          ))}
        </div>

        <div className="nav-right desktop">
          <button onClick={() => setMenuOpen(!menuOpen)} className="user-btn">
            <span className="avatar">{getInitials()}</span>
            <span className="user-name">{user?.name?.split(' ')[0] || "User"}</span>
            <span className="caret">{menuOpen ? "▲" : "▼"}</span>
          </button>
          
          {menuOpen && (
            <div className="dropdown">
              <div className="user-info">
                <div className="user-fullname">{user?.name || "User"}</div>
                <div className="user-email">{user?.email || "email@example.com"}</div>
                <span className={`role-badge ${user?.role}`}>{user?.role || "student"}</span>
              </div>
              <Link to="/profile" onClick={() => setMenuOpen(false)}>Profile</Link>
              <button onClick={logout} className="logout-btn">Logout</button>
            </div>
          )}
        </div>

        <button className="mobile-menu" onClick={() => setMenuOpen(!menuOpen)}>
          ☰
        </button>
      </div>

      {menuOpen && (
        <div className="mobile-nav">
          {links.map(link => (
            <Link key={link} to="/" onClick={() => setMenuOpen(false)}>
              {link}
            </Link>
          ))}
          <hr />
          <div className="mobile-user">
            <div>{user?.name || "User"}</div>
            <div className="mobile-email">{user?.email || "email@example.com"}</div>
          </div>
          <Link to="/profile" onClick={() => setMenuOpen(false)}>Profile</Link>
          <button onClick={logout} className="mobile-logout-btn">Logout</button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;