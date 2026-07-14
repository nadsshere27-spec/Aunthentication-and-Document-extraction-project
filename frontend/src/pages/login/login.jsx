import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Card from "../../components/Card";
import InputField from "../../components/InputField";
import Button from "../../components/Button";
import Navbar from "../../components/Navbar";
import { loginUser } from "../../services/api";
import "./login.css";

function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const savedEmail = localStorage.getItem("rememberedEmail");
    const savedPassword = localStorage.getItem("rememberedPassword");

    if (savedEmail && savedPassword) {
      setFormData({
        email: savedEmail,
        password: savedPassword,
      });
      setRememberMe(true);
    }
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    const result = await loginUser(formData);

    if (result.success) {
      setSuccess("Login successful! Redirecting...");
      localStorage.setItem("token", result.token);
      localStorage.setItem("user", JSON.stringify(result.user));

      if (rememberMe) {
        localStorage.setItem("rememberedEmail", formData.email);
        localStorage.setItem("rememberedPassword", formData.password);
      } else {
        localStorage.removeItem("rememberedEmail");
        localStorage.removeItem("rememberedPassword");
      }

      setTimeout(() => {
        navigate("/dashboard");
      }, 1500);
    } else {
      setError(result.message || "Login failed. Please try again.");
    }

    setLoading(false);
  };

  return (
    <div className="login-page">
      <Navbar />
      <div className="login-body">
        <div className="login-content">
          <div className="login-heading">
            <h1>Sign in</h1>
            <p>Continue to your account.</p>
          </div>

          <Card>
            <form className="login-form" onSubmit={handleSubmit}>
              {error && <div className="error-message">{error}</div>}
              {success && <div className="success-message">{success}</div>}

              <InputField
                label="Email"
                type="email"
                name="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
              />

              <InputField
                label="Password"
                type="password"
                name="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
              />

              <div style={{ display: "flex", alignItems: "center", gap: "8px", margin: "8px 0" }}>
                <input
                  type="checkbox"
                  id="rememberMe"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{ width: "auto" }}
                />
                <label htmlFor="rememberMe" style={{ fontSize: "0.9rem", cursor: "pointer" }}>
                  Remember me
                </label>
              </div>

              <div className="forgot-link">
                <Link to="/forgot-password">Forgot password?</Link>
              </div>

              <Button text={loading ? "Signing in..." : "Sign In"} type="submit" disabled={loading} />
            </form>

            <div className="register-text">
              <span>Don't have an account? </span>
              <Link to="/register">Create one</Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default Login;