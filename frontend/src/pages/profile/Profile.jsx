import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../../components/Card";
import { getMyProfile, uploadProfilePicture, updateProfile } from "../../services/api";
import { FaUserCircle, FaCamera, FaPen } from "react-icons/fa";
import "./profile.css";

function Profile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editingCard, setEditingCard] = useState(null); // "about" | "contact" | "skills" | null
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({});
  const fileInputRef = useRef(null);

  const loadProfile = async (token) => {
    const result = await getMyProfile(token);
    if (result.success) {
      setProfile(result.profile);
    }
    setLoading(false);
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/");
      return;
    }
    loadProfile(token);
  }, [navigate]);

  const handlePictureChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const token = localStorage.getItem("token");
    setUploading(true);

    const formData = new FormData();
    formData.append("profilePicture", file);

    const result = await uploadProfilePicture(token, formData);

    if (result.success) {
      setProfile((prev) => ({ ...prev, profilePicture: result.profilePicture }));
    } else {
      alert(result.message || "Failed to upload picture");
    }

    setUploading(false);
  };

  const startEdit = (card) => {
    if (card === "about") {
      setDraft({ about: profile.about || "" });
    } else if (card === "contact") {
      setDraft({ phone: profile.phone || "", age: profile.age || "" });
    } else if (card === "skills") {
      setDraft({ skills: (profile.skills || []).join(", ") });
    }
    setEditingCard(card);
  };

  const cancelEdit = () => {
    setEditingCard(null);
    setDraft({});
  };

  const saveEdit = async () => {
    const token = localStorage.getItem("token");
    setSaving(true);

    let payload = {};
    if (editingCard === "about") {
      payload = { about: draft.about };
    } else if (editingCard === "contact") {
      payload = { phone: draft.phone, age: draft.age ? Number(draft.age) : null };
    } else if (editingCard === "skills") {
      payload = {
        skills: draft.skills
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s.length > 0)
      };
    }

    const result = await updateProfile(token, payload);

    if (result.success) {
      setProfile(result.profile);
      setEditingCard(null);
      setDraft({});
    } else {
      alert(result.message || "Failed to update profile");
    }

    setSaving(false);
  };

  if (loading) {
    return (
      <div className="profile-page">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-hero">
        <div className="profile-avatar-wrap">
          {profile?.profilePicture ? (
            <img src={profile.profilePicture} alt="Profile" className="profile-avatar" />
          ) : (
            <FaUserCircle size={110} color="#B8C7BA" />
          )}
          <button
            className="profile-avatar-edit"
            onClick={() => fileInputRef.current.click()}
            disabled={uploading}
            aria-label="Change photo"
          >
            <FaCamera size={14} />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            accept="image/png, image/jpeg, image/webp"
            style={{ display: "none" }}
            onChange={handlePictureChange}
          />
        </div>
        <h1>{profile?.fullName || "User"}</h1>
        <p className="profile-email">{profile?.email}</p>
        {uploading && <p className="profile-uploading-text">Uploading photo...</p>}
      </div>

      <div className="profile-grid">
        <Card>
          <div className="profile-card-header">
            <h3>About</h3>
            {editingCard !== "about" && (
              <button className="profile-edit-btn" onClick={() => startEdit("about")} aria-label="Edit About">
                <FaPen size={12} />
              </button>
            )}
          </div>

          {editingCard === "about" ? (
            <div className="profile-edit-form">
              <textarea
                rows="5"
                value={draft.about}
                onChange={(e) => setDraft({ ...draft, about: e.target.value })}
              />
              <div className="profile-edit-actions">
                <button className="profile-save-btn" onClick={saveEdit} disabled={saving}>
                  {saving ? "Saving..." : "Save"}
                </button>
                <button className="profile-cancel-btn" onClick={cancelEdit} disabled={saving}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p className="profile-text">
              {profile?.about || "No bio yet — this fills in automatically once you submit an application."}
            </p>
          )}
        </Card>

        <Card>
          <div className="profile-card-header">
            <h3>Contact</h3>
            {editingCard !== "contact" && (
              <button className="profile-edit-btn" onClick={() => startEdit("contact")} aria-label="Edit Contact">
                <FaPen size={12} />
              </button>
            )}
          </div>

          {editingCard === "contact" ? (
            <div className="profile-edit-form">
              <label>Phone</label>
              <input
                type="text"
                value={draft.phone}
                onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
              />
              <label>Age</label>
              <input
                type="number"
                value={draft.age}
                onChange={(e) => setDraft({ ...draft, age: e.target.value })}
              />
              <div className="profile-edit-actions">
                <button className="profile-save-btn" onClick={saveEdit} disabled={saving}>
                  {saving ? "Saving..." : "Save"}
                </button>
                <button className="profile-cancel-btn" onClick={cancelEdit} disabled={saving}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="profile-text"><strong>Phone:</strong> {profile?.phone || "Not provided"}</p>
              <p className="profile-text"><strong>Age:</strong> {profile?.age || "Not provided"}</p>
            </>
          )}
        </Card>

        <Card>
          <div className="profile-card-header">
            <h3>Skills</h3>
            {editingCard !== "skills" && (
              <button className="profile-edit-btn" onClick={() => startEdit("skills")} aria-label="Edit Skills">
                <FaPen size={12} />
              </button>
            )}
          </div>

          {editingCard === "skills" ? (
            <div className="profile-edit-form">
              <label>Skills (comma-separated)</label>
              <input
                type="text"
                value={draft.skills}
                onChange={(e) => setDraft({ ...draft, skills: e.target.value })}
                placeholder="React, Node.js, MongoDB"
              />
              <div className="profile-edit-actions">
                <button className="profile-save-btn" onClick={saveEdit} disabled={saving}>
                  {saving ? "Saving..." : "Save"}
                </button>
                <button className="profile-cancel-btn" onClick={cancelEdit} disabled={saving}>
                  Cancel
                </button>
              </div>
            </div>
          ) : profile?.skills && profile.skills.length > 0 ? (
            <div className="profile-skills">
              {profile.skills.map((skill) => (
                <span className="profile-skill-chip" key={skill}>{skill}</span>
              ))}
            </div>
          ) : (
            <p className="profile-text">No skills detected yet — upload a CV to auto-fill this.</p>
          )}
        </Card>
      </div>
    </div>
  );
}

export default Profile;