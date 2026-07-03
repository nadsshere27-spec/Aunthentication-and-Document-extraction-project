import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminLogin, getAllApplications } from "../../services/api";
import "./admin.css";

function Admin() {
  const navigate = useNavigate();
  const [loggedIn, setLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [adminToken, setAdminToken] = useState("");
  const [applications, setApplications] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await adminLogin(username, password);

    if (result.success) {
      setAdminToken(result.token);
      const appsResult = await getAllApplications(result.token);
      if (appsResult.success) {
        setApplications(appsResult.applications);
        setLoggedIn(true);
      } else {
        setError(appsResult.message || "Failed to load applications");
      }
    } else {
      setError(result.message || "Invalid admin credentials");
    }

    setLoading(false);
  };

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
        <h2>All Applications</h2>
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
                        onClick={() =>
                          navigate(`/admin/applications/${app._id}/edit`, {
                            state: { adminToken },
                          })
                        }
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