import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Card from "../../components/Card";
import InputField from "../../components/InputField";
import Button from "../../components/Button";
import { registerUser } from "../../services/api";
import "./register.css";

const PASSWORD_RULES = [
  { key: "length", label: "At least 8 characters", test: (pw) => pw.length >= 8 },
  { key: "uppercase", label: "1 uppercase letter", test: (pw) => /[A-Z]/.test(pw) },
  { key: "lowercase", label: "1 lowercase letter", test: (pw) => /[a-z]/.test(pw) },
  { key: "number", label: "1 number", test: (pw) => /[0-9]/.test(pw) },
  { key: "special", label: "1 special character (!@#$%^&*()_+-=[]{};:'\"|,.<>/?)", test: (pw) => /[!@#$%^&*()_+\-=[\]{};:'"|,.<>/?]/.test(pw) },
];

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