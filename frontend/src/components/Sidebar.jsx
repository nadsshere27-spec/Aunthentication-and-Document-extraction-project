import { Link, useLocation } from "react-router-dom";
import { FaTachometerAlt, FaFileUpload, FaFileAlt, FaCode } from "react-icons/fa";
import Logo from "./Logo";
import "./Sidebar.css";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: FaTachometerAlt },
  { to: "/upload-cv", label: "Upload CV", icon: FaFileUpload },
  { to: "/application-form", label: "Application", icon: FaFileAlt },
  { to: "/code-editor", label: "Code Editor", icon: FaCode },
];

function Sidebar() {
  const location = useLocation();

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <Logo size={30} />
      </div>
      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`sidebar-link ${isActive ? "sidebar-link-active" : ""}`}
            >
              <Icon size={16} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

export default Sidebar;