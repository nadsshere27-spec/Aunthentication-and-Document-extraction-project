import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../../components/Card";
import { getMyProfile, uploadProfilePicture } from "../../services/api";
import { FaUserCircle, FaCamera } from "react-icons/fa";
import "./profile.css";

function Profile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
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
          <h3>About</h3>
          <p className="profile-text">
            {profile?.about || "No bio yet — this fills in automatically once you submit an application."}
          </p>
        </Card>

        <Card>
          <h3>Contact</h3>
          <p className="profile-text"><strong>Phone:</strong> {profile?.phone || "Not provided"}</p>
          <p className="profile-text"><strong>Age:</strong> {profile?.age || "Not provided"}</p>
        </Card>

        <Card>
          <h3>Skills</h3>
          {profile?.skills && profile.skills.length > 0 ? (
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