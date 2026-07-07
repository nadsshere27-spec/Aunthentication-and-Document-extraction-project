import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { adminLogin, getAllApplications } from "../../services/api";
import "./admin.css";

function Admin() {
  const navigate = useNavigate();
  const [loggedIn, setLoggedIn] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [applications, setApplications] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const loadApplications = async (token) => {
    const appsResult = await getAllApplications(token);
    if (appsResult.success) {
      setApplications(appsResult.applications);
      setLoggedIn(true);
    } else {
      sessionStorage.removeItem("adminToken");
      setLoggedIn(false);
    }
  };

  useEffect(() => {
    const existingToken = sessionStorage.getItem("adminToken");
    if (existingToken) {
      loadApplications(existingToken).finally(() => setCheckingSession(false));
    } else {
      setCheckingSession(false);
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await adminLogin(username, password);

    if (result.success) {
      sessionStorage.setItem("adminToken", result.token);
      await loadApplications(result.token);
    } else {
      setError(result.message || "Invalid admin credentials");
    }

    setLoading(false);
  };

  const handleAdminLogout = () => {
    sessionStorage.removeItem("adminToken");
    setLoggedIn(false);
    setApplications([]);
  };

  if (checkingSession) {
    return <p className="admin-loading-text">Loading...</p>;
  }

  if (!loggedIn) {
    return (
      <div className="admin-login-page">
        <div className="admin-login-card">
          <h2>Admin Login</h2>
          <form onSubmit={handleLogin}>
            <div className="admin-form-group">
              <label>Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="admin-form-group">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className="admin-error">{error}</p>}
            <button type="submit" disabled={loading} className="admin-btn">
              {loading ? "Checking..." : "Login"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-page-inner">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h2 style={{ marginBottom: 0 }}>All Applications</h2>
          <button className="edit-app-cancel-btn" onClick={handleAdminLogout}>
            Admin Logout
          </button>
        </div>
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Age</th>
                <th>Submitted</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {applications.length === 0 ? (
                <tr className="admin-empty-row">
                  <td colSpan="6">No applications yet.</td>
                </tr>
              ) : (
                applications.map((app) => (
                  <tr key={app._id}>
                    <td>{app.fullName}</td>
                    <td>{app.email}</td>
                    <td>{app.phone}</td>
                    <td>{app.age}</td>
                    <td>{new Date(app.submittedAt).toLocaleString()}</td>
                    <td>
                      <button
                        className="admin-edit-btn"
                        onClick={() => navigate(`/admin/applications/${app._id}/edit`)}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Admin;