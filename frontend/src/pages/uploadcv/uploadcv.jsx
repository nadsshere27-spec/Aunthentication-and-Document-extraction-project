import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Card from "../../components/Card";
import { uploadCV, extractCVData } from "../../services/api";
import "./uploadcv.css";

function UploadCV() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [fileName, setFileName] = useState("No file selected");

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setFileName(selectedFile.name);
      setError("");
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a file first");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/");
      return;
    }

    const formData = new FormData();
    formData.append("cvFile", file);

    const result = await uploadCV(token, formData);

    if (result.success) {
      setSuccess("CV uploaded successfully! Extracting data...");
      
      const extractResult = await extractCVData(token);
      if (extractResult.success) {
        setSuccess("CV uploaded and data extracted successfully!");
        setTimeout(() => {
          navigate("/application-form");
        }, 2000);
      } else {
        setError("CV uploaded but extraction failed: " + extractResult.message);
      }
    } else {
      setError(result.message || "Upload failed");
    }

    setLoading(false);
  };

  return (
    <div className="upload-page">
      <div className="upload-container">
        <div className="upload-header">
          <h1>Upload CV</h1>
          <p>Upload your CV to auto-fill application forms.</p>
        </div>

        <Card>
          <div className="upload-area">
            <div className="upload-icon">📄</div>
            <h3>Upload your CV</h3>
            <p>Supported formats: PDF, DOC, DOCX (Max 5MB)</p>
            
            <input
              type="file"
              id="cvFile"
              accept=".pdf,.doc,.docx"
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
            
            <div className="upload-actions">
              <button 
                className="file-btn"
                onClick={() => document.getElementById("cvFile").click()}
              >
                Choose File
              </button>
              <span className="file-name">{fileName}</span>
            </div>

            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            <button
              className="upload-btn"
              onClick={handleUpload}
              disabled={loading || !file}
            >
              {loading ? "Uploading..." : "Upload CV"}
            </button>
          </div>

          <div className="upload-info">
            <p>✓ Your CV will be processed securely</p>
            <p>✓ Extracted data will auto-fill your forms</p>
          </div>

          <div className="back-link">
            <Link to="/dashboard">← Back to Dashboard</Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default UploadCV;