import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Card from "../../components/Card";
import Button from "../../components/Button";
import { getProfile } from "../../services/api";
import "./dashboard.css";

function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/");
      return;
    }

    const fetchProfile = async () => {
      const result = await getProfile(token);
      if (result.success) {
        setUser(result.user);
        localStorage.setItem("user", JSON.stringify(result.user));
      } else {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/");
      }
      setLoading(false);
    };

    fetchProfile();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  };

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-container">
          <div className="dashboard-header">
            <h1>Loading...</h1>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-container">
        <div className="dashboard-header">
          <div className="header-row">
            <div>
              <h1>Dashboard</h1>
              <p>Welcome back, {user?.fullName || "User"}!</p>
            </div>
            <button className="logout-btn" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>

        <div className="dashboard-grid">
          <Card>
            <div className="dashboard-card">
              <div className="card-icon">📄</div>
              <h3>Upload CV</h3>
              <p>Upload your CV to auto-fill forms.</p>
              <Link to="/upload-cv">
                <Button text="Upload CV" />
              </Link>
            </div>
          </Card>

          <Card>
            <div className="dashboard-card">
              <div className="card-icon">📝</div>
              <h3>Application Form</h3>
              <p>Fill your application form.</p>
              <Link to="/application-form">
                <Button text="Open Form" />
              </Link>
            </div>
          </Card>

          <Card>
            <div className="dashboard-card">
              <div className="card-icon">👤</div>
              <h3>My Profile</h3>
              <p>View and update your profile.</p>
              <Button text="View Profile" />
            </div>
          </Card>

          <Card>
            <div className="dashboard-card">
              <div className="card-icon">🔐</div>
              <h3>Admin Panel</h3>
              <p>View and edit all submitted applications.</p>
              <Link to="/admin">
                <Button text="Open Admin Panel" />
              </Link>
            </div>
          </Card>

          <Card>
            <div className="dashboard-card">
              <div className="card-icon">💻</div>
              <h3>Code Editor</h3>
              <p>Write code with AI-powered syntax error fixing.</p>
              <Link to="/code-editor">
                <Button text="Open Editor" />
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;