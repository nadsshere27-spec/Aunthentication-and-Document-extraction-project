import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import Card from "../../components/Card";
import InputField from "../../components/InputField";
import Button from "../../components/Button";
import { registerUser, googleLogin } from "../../services/api";
import "./register.css";

const PASSWORD_RULES = [
  { key: "length", label: "At least 8 characters", test: (pw) => pw.length >= 8 },
  { key: "uppercase", label: "1 uppercase letter", test: (pw) => /[A-Z]/.test(pw) },
  { key: "lowercase", label: "1 lowercase letter", test: (pw) => /[a-z]/.test(pw) },
  { key: "number", label: "1 number", test: (pw) => /[0-9]/.test(pw) },
  { key: "special", label: "1 special character (!@#$%^&*()_+-=[]{};:'\"|,.<>/?)", test: (pw) => /[!@#$%^&*()_+\-=[\]{};:'"|,.<>/?]/.test(pw) },
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

  const unmetRules = PASSWORD_RULES.filter((rule) => !rule.test(formData.password));
  const isPasswordValid = formData.password.length > 0 && unmetRules.length === 0;
  const isNameValid = formData.fullName.trim().length > 0;
  const isEmailValid = EMAIL_REGEX.test(formData.email.trim());
  const isFormValid = isNameValid && isEmailValid && isPasswordValid;

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

  // Google sign-up doubles as sign-in: the backend creates the account on
  // the first successful Google token it sees for a new email, then logs
  // straight in — no separate "register with Google" step needed.
  const handleGoogleSuccess = async (credentialResponse) => {
    setError("");
    setSuccess("");

    if (!credentialResponse.credential) {
      setError("Google didn't return a valid credential. Please try again.");
      return;
    }

    const result = await googleLogin(credentialResponse.credential);

    if (result.success) {
      localStorage.setItem("token", result.token);
      localStorage.setItem("user", JSON.stringify(result.user));
      setSuccess("Account ready! Redirecting...");
      setTimeout(() => {
        navigate("/dashboard");
      }, 1200);
    } else {
      setError(result.message || "Google sign-up failed. Please try again.");
    }
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

            {formData.email.length > 0 && !isEmailValid && (
              <div className="password-hint">
                <p style={{ color: "#c0392b", fontSize: "0.85rem", margin: 0 }}>
                  Enter a valid email address (e.g. name@example.com)
                </p>
              </div>
            )}

            <InputField
              label="Password"
              type="password"
              name="password"
              placeholder="Create a password"
              value={formData.password}
              onChange={handleChange}
            />

            {formData.password.length > 0 && unmetRules.length > 0 && (
              <div className="password-hint">
                <p style={{ marginBottom: "4px", fontWeight: 600 }}>Still needed:</p>
                <ul style={{ margin: 0, paddingLeft: "20px" }}>
                  {unmetRules.map((rule) => (
                    <li key={rule.key} style={{ color: "#c0392b", fontSize: "0.85rem" }}>
                      {rule.label}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {formData.password.length > 0 && unmetRules.length === 0 && (
              <div className="password-hint">
                <p style={{ color: "#27ae60", fontSize: "0.85rem", margin: 0 }}>
                  ✓ Password meets all requirements
                </p>
              </div>
            )}

            {formData.password.length === 0 && (
              <div className="password-hint">
                <p>Must be at least 8 characters with uppercase, lowercase, number & special character</p>
              </div>
            )}

            <Button
              text={loading ? "Creating Account..." : "Create Account"}
              type="submit"
              disabled={loading || !isFormValid}
            />
          </form>

          <div className="login-divider">
            <span>or</span>
          </div>

          <div className="google-login-wrapper">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError("Google sign-up failed. Please try again.")}
              width="100%"
              text="signup_with"
            />
          </div>

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