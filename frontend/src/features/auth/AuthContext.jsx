import { createContext, useState, useEffect, useRef } from "react";
import { jwtDecode } from "jwt-decode";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);   // 🔥 NEW
  const [loading, setLoading] = useState(true);
  const logoutTimer = useRef(null);

  const scheduleAutoLogout = (jwt) => {
    const decoded = jwtDecode(jwt);

    const expirationTime = decoded.exp * 1000;
    const currentTime = Date.now();
    const timeLeft = expirationTime - currentTime;

    if (timeLeft <= 0) {
      logout();
      return;
    }

    logoutTimer.current = setTimeout(() => {
      logout();
    }, timeLeft);
  };

  useEffect(() => {
    const storedToken = localStorage.getItem("token");

    if (storedToken) {
      try {
        const decoded = jwtDecode(storedToken);

        if (decoded.exp * 1000 > Date.now()) {
          setToken(storedToken);
          setUser(decoded);   // 🔥 STORE USER
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
      if (logoutTimer.current) {
        clearTimeout(logoutTimer.current);
      }
    };
  }, []);

  const login = (jwt) => {
    const decoded = jwtDecode(jwt);

    localStorage.setItem("token", jwt);
    setToken(jwt);
    setUser(decoded);  // 🔥 STORE USER
    scheduleAutoLogout(jwt);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);  // 🔥 CLEAR USER

    if (logoutTimer.current) {
      clearTimeout(logoutTimer.current);
    }

    window.location.href = "/";
  };

  return (
    <AuthContext.Provider value={{ token, user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};