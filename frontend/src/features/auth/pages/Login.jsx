import { useState, useContext } from "react";
import { loginUser } from "../authAPI";
import { AuthContext } from "../AuthContext";
import { useNavigate, Link } from "react-router-dom";
import "./Login.css";

const Login = () => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      setError("Email and password are required");
      return;
    }

    setLoading(true);
    try {
      const response = await loginUser(formData);
      login(response.data.access_token);
      
      const role = JSON.parse(atob(response.data.access_token.split('.')[1])).role;
      navigate(role === "professor" ? "/dashboard/professor" : "/dashboard/student");
    } catch (error) {
      setError(error.response?.data?.msg || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-left">
        <img src="/full_logo.png" alt="AIBACLS" className="full-logo" />
      </div>
      
      <div className="login-right">
        <div className="login-card">
          <div className="login-header">
            <img src="/logo.png" alt="AIBACLS" className="small-logo" />
            <h1 className="brand-title">AIBACLS</h1>
            <p className="welcome-text">Welcome Back</p>
          </div>

          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                name="email"
                placeholder="e.g. rollno@tezu.ac.in"
                value={formData.email}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                name="password"
                placeholder="8 character minimum"
                value={formData.password}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="login-footer">
            <Link to="/forgot-password">Forgot Password?</Link>
            <span className="divider">•</span>
            <Link to="/signup">Create Account</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;