import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { getApplicationById, updateApplication } from "../../services/api";
import "./admin.css";

function EditApplication() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const adminToken = location.state?.adminToken;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    age: "",
    about: "",
    interest: ""
  });

  useEffect(() => {
    if (!adminToken) {
      navigate("/admin");
      return;
    }

    const fetchApp = async () => {
      const result = await getApplicationById(adminToken, id);
      if (result.success) {
        const app = result.application;
        setFormData({
          fullName: app.fullName || "",
          email: app.email || "",
          phone: app.phone || "",
          age: app.age || "",
          about: app.about || "",
          interest: app.interest || ""
        });
      } else {
        alert(result.message || "Failed to load application");
        navigate("/admin");
      }
      setLoading(false);
    };

    fetchApp();
  }, [id, adminToken, navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);

    const result = await updateApplication(adminToken, id, formData);

    setSaving(false);

    if (result.success) {
      alert("Application updated successfully!");
      navigate("/admin");
    } else {
      alert(result.message || "Failed to update application");
    }
  };

  if (loading) return <p className="admin-loading-text">Loading...</p>;

  return (
    <div className="edit-app-page">
      <div className="edit-app-inner">
        <h2>Edit Application</h2>
        <form onSubmit={handleSave}>
          <div className="admin-form-group">
            <label>Full Name</label>
            <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} />
          </div>
          <div className="admin-form-group">
            <label>Email</label>
            <input type="email" name="email" value={formData.email} onChange={handleChange} />
          </div>
          <div className="admin-form-group">
            <label>Phone</label>
            <input type="text" name="phone" value={formData.phone} onChange={handleChange} />
          </div>
          <div className="admin-form-group">
            <label>Age</label>
            <input type="number" name="age" value={formData.age} onChange={handleChange} />
          </div>
          <div className="admin-form-group">
            <label>About</label>
            <textarea name="about" rows="4" value={formData.about} onChange={handleChange}></textarea>
          </div>
          <div className="admin-form-group">
            <label>Interest</label>
            <textarea name="interest" rows="4" value={formData.interest} onChange={handleChange}></textarea>
          </div>
          <div className="edit-app-actions">
            <button type="submit" disabled={saving} className="admin-btn">
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <button type="button" onClick={() => navigate("/admin")} className="edit-app-cancel-btn">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditApplication;