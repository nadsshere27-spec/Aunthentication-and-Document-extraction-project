import { useState, useEffect } from "react";
import { getProfile } from "../../services/api";
import "./dashboard.css";

function Dashboard() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const fetchProfile = async () => {
      const result = await getProfile(token);
      if (result.success) {
        setUser(result.user);
      }
    };

    fetchProfile();
  }, []);

  return (
    <div className="dashboard-page">
      <div className="dashboard-container">
        <div className="dashboard-welcome">
          <h1>Welcome back, {user?.fullName || "there"}</h1>
          <p>Manage your resume and applications from one place.</p>
        </div>

        <div className="dashboard-stats">
          <div className="stat-card">
            <p className="stat-label">Profile completion</p>
            <p className="stat-value">80%</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Applications</p>
            <p className="stat-value">1</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Resume score</p>
            <p className="stat-value stat-value-muted">Coming soon</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;