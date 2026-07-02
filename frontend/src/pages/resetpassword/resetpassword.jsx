import { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import Card from "../../components/Card";
import InputField from "../../components/InputField";
import Button from "../../components/Button";
import { resetPassword } from "../../services/api";
import "./resetpassword.css";

function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
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

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    const result = await resetPassword(token, formData.password);

    if (result.success) {
      setSuccess("Password reset successfully! Redirecting to login...");
      setTimeout(() => {
        navigate("/");
      }, 2000);
    } else {
      setError(result.message || "Something went wrong. Please try again.");
    }

    setLoading(false);
  };

  return (
    <div className="reset-page">
      <div className="reset-content">
        <div className="reset-heading">
          <h1>Set new password</h1>
          <p>Create a new password for your account.</p>
        </div>

        <Card>
          <form className="reset-form" onSubmit={handleSubmit}>
            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            <InputField
              label="New Password"
              type="password"
              name="password"
              placeholder="Enter new password"
              value={formData.password}
              onChange={handleChange}
            />

            <InputField
              label="Confirm Password"
              type="password"
              name="confirmPassword"
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChange={handleChange}
            />

            <div className="password-hint">
              <p>Must be at least 8 characters with uppercase, lowercase, number & special character</p>
            </div>

            <Button text={loading ? "Resetting..." : "Reset Password"} type="submit" disabled={loading} />
          </form>

          <div className="back-link">
            <Link to="/">← Back to sign in</Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default ResetPassword;