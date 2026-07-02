import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Card from "../../components/Card";
import InputField from "../../components/InputField";
import Button from "../../components/Button";
import { registerUser } from "../../services/api";
import "./register.css";

function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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

    const result = await registerUser(formData);

    if (result.success) {
      setSuccess("Account created successfully! Redirecting to login...");
      setTimeout(() => {
        navigate("/");
      }, 2000);
    } else {
      setError(result.message || "Registration failed. Please try again.");
    }

    setLoading(false);
  };

  return (
    <div className="register-page">
      <div className="register-content">
        <div className="register-heading">
          <h1>Create account</h1>
          <p>Get started by creating your account.</p>
        </div>

        <Card>
          <form className="register-form" onSubmit={handleSubmit}>
            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            <InputField
              label="Full Name"
              type="text"
              name="fullName"
              placeholder="Enter your full name"
              value={formData.fullName}
              onChange={handleChange}
            />

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
              placeholder="Create a password"
              value={formData.password}
              onChange={handleChange}
            />

            <div className="password-hint">
              <p>Must be at least 8 characters with uppercase, lowercase, number & special character</p>
            </div>

            <Button text={loading ? "Creating Account..." : "Create Account"} type="submit" disabled={loading} />
          </form>

          <div className="login-text">
            <span>Already have an account? </span>
            <Link to="/">Sign in</Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default Register;