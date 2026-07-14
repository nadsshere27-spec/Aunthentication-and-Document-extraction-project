import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import Sidebar from "./Sidebar";
import { getProfile } from "../services/api";
import { FaUserCircle } from "react-icons/fa";
import "./Layout.css";

function Layout({ title, children, hideSidebar = false }) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const cachedUser = localStorage.getItem("user");
    if (cachedUser) {
      const parsed = JSON.parse(cachedUser);
      setAvatarUrl(parsed.profilePicture || null);
    }

    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/");
      return;
    }

    const fetchProfile = async () => {
      const result = await getProfile(token);
      if (result.success) {
        localStorage.setItem("user", JSON.stringify(result.user));
        setAvatarUrl(result.user.profilePicture || null);
      } else {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/");
      }
    };

    fetchProfile();
  }, [navigate]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  };

  return (
    <div className="app-layout">
      {!hideSidebar && <Sidebar />}
      <div className="app-main">
        <div className="app-topbar">
          <span className="app-topbar-title">{title}</span>

          <div className="profile-menu" ref={menuRef}>
            <button
              className="profile-icon-btn"
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-label="Profile menu"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="Profile" className="profile-avatar-img" />
              ) : (
                <FaUserCircle size={30} />
              )}
            </button>

            {menuOpen && (
              <div className="profile-dropdown">
                <Link
                  to="/profile"
                  className="dropdown-item"
                  onClick={() => setMenuOpen(false)}
                >
                  My Profile
                </Link>
                <Link
                  to="/admin"
                  className="dropdown-item"
                  onClick={() => setMenuOpen(false)}
                >
                  Admin
                </Link>
                <button className="dropdown-item dropdown-item-danger" onClick={handleLogout}>
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="app-content">{children}</div>
      </div>
    </div>
  );
}

export default Layout;