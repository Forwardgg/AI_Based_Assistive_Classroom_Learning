import { createContext, useState, useEffect, useRef } from "react";
import { jwtDecode } from "jwt-decode";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const logoutTimer = useRef(null);

  // Auto logout
  const scheduleAutoLogout = (jwt) => {
    const decoded = jwtDecode(jwt);
    const timeLeft = decoded.exp * 1000 - Date.now();

    if (timeLeft <= 0) return logout();

    logoutTimer.current = setTimeout(logout, timeLeft);
  };

  // Init auth
  useEffect(() => {
    const storedToken = localStorage.getItem("token");

    if (storedToken) {
      try {
        const decoded = jwtDecode(storedToken);

        if (decoded.exp * 1000 > Date.now()) {
          setToken(storedToken);
          setUser(decoded); // keep simple
          scheduleAutoLogout(storedToken);
        } else {
          localStorage.removeItem("token");
        }
      } catch {
        localStorage.removeItem("token");
      }
    }

    setLoading(false);

    return () => {
      if (logoutTimer.current) clearTimeout(logoutTimer.current);
    };
  }, []);

  // Login (SYNC again)
  const login = (jwt) => {
    const decoded = jwtDecode(jwt);

    localStorage.setItem("token", jwt);
    setToken(jwt);
    setUser(decoded); // simple
    scheduleAutoLogout(jwt);
  };

  // Logout
  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);

    if (logoutTimer.current) clearTimeout(logoutTimer.current);

    window.location.href = "/";
  };

  return (
    <AuthContext.Provider value={{ token, user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};