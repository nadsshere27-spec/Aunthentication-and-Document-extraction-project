import { useState, useEffect } from "react";
import { getProfile, getDashboardStats } from "../../services/api";
import "./dashboard.css";

function Dashboard() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({ profileCompletion: 0, applicationsCount: 0 });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const fetchProfile = async () => {
      const result = await getProfile(token);
      if (result.success) {
        setUser(result.user);
      }
    };

    const fetchStats = async () => {
      const result = await getDashboardStats(token);
      if (result.success) {
        setStats(result.stats);
      }
      setLoadingStats(false);
    };

    fetchProfile();
    fetchStats();
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
            <p className="stat-value">{loadingStats ? "..." : `${stats.profileCompletion}%`}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Applications</p>
            <p className="stat-value">{loadingStats ? "..." : stats.applicationsCount}</p>
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