import { useState } from "react";
import { Link } from "react-router-dom";
import Card from "../../components/Card";
import InputField from "../../components/InputField";
import Button from "../../components/Button";
import { forgotPassword } from "../../services/api";
import "./forgotpassword.css";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    const result = await forgotPassword(email);

    if (result.success) {
      setSuccess("Password reset link sent to your email address!");
    } else {
      setError(result.message || "Something went wrong. Please try again.");
    }

    setLoading(false);
  };

  return (
    <div className="forgot-page">
      <div className="forgot-content">
        <div className="forgot-heading">
          <h1>Reset password</h1>
          <p>We'll send you a link to reset your password.</p>
        </div>

        <Card>
          <form className="forgot-form" onSubmit={handleSubmit}>
            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            <InputField
              label="Email"
              type="email"
              name="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <Button text={loading ? "Sending..." : "Send Reset Link"} type="submit" disabled={loading} />
          </form>

          <div className="back-link">
            <Link to="/">← Back to sign in</Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default ForgotPassword;