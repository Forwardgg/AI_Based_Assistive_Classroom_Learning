import { Link } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../features/auth/AuthContext";
import "./Navbar.css";

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);

  return (
    <nav className="navbar">
      {/* LEFT */}
      <div className="navbar-left">
        <img src="/logo.png" alt="Logo" className="logo" />
        <span className="app-name">Lecture AI</span>
      </div>

      {/* CENTER LINKS */}
      <div className="navbar-links">
        {user?.role === "professor" && (
          <>
            <Link to="/dashboard/professor">Dashboard</Link>
            <Link to="#">Courses</Link>
            <Link to="#">Analytics</Link>
          </>
        )}

        {user?.role === "student" && (
          <>
            <Link to="/dashboard/student">Dashboard</Link>
            <Link to="#">My Courses</Link>
            <Link to="#">Results</Link>
          </>
        )}
      </div>

      {/* RIGHT */}
      <div className="navbar-right">
        <button onClick={logout} className="logout-btn">
          Logout
        </button>
      </div>
    </nav>
  );
};

export default Navbar;