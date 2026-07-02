import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Card from "../../components/Card";
import InputField from "../../components/InputField";
import Button from "../../components/Button";
import { getCVData, generateAIAnswer, submitApplication } from "../../services/api";
import "./applicationform.css";

function ApplicationForm() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState({ about: false, interest: false });
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    age: "",
    about: "",
    interest: ""
  });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/");
      return;
    }

    const fetchCVData = async () => {
      const result = await getCVData(token);
      if (result.success && result.data.extractedInfo) {
        const info = result.data.extractedInfo;
        setFormData({
          fullName: info.name || "",
          email: info.email || "",
          phone: info.phone || "",
          age: info.age || "",
          about: "",
          interest: ""
        });
      }
      setLoading(false);
    };

    fetchCVData();
  }, [navigate]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleGenerate = async (fieldType) => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/");
      return;
    }

    setGenerating((prev) => ({ ...prev, [fieldType]: true }));

    const result = await generateAIAnswer(token, fieldType);

    if (result.success && result.answer) {
      setFormData((prev) => ({
        ...prev,
        [fieldType]: result.answer
      }));
    } else {
      alert(result.message || "Failed to generate answer. Please try again.");
    }

    setGenerating((prev) => ({ ...prev, [fieldType]: false }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/");
      return;
    }

    setSubmitting(true);

    const result = await submitApplication(token, formData);

    setSubmitting(false);

    if (result.success) {
      alert("Form submitted successfully!");
      navigate("/dashboard");
    } else {
      alert(result.message || "Failed to submit application. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="form-page">
        <div className="form-container">
          <div className="form-header">
            <h1>Loading...</h1>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="form-page">
      <div className="form-container">
        <div className="form-header">
          <h1>Application Form</h1>
          <p>Fill in your details below. Fields auto-filled from CV.</p>
        </div>

        <Card>
          <form className="application-form" onSubmit={handleSubmit}>
            <div className="form-row">
              <InputField
                label="Full Name"
                type="text"
                name="fullName"
                placeholder="Enter your full name"
                value={formData.fullName}
                onChange={handleChange}
              />
            </div>

            <div className="form-row">
              <InputField
                label="Email"
                type="email"
                name="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            <div className="form-row">
              <InputField
                label="Phone Number"
                type="tel"
                name="phone"
                placeholder="Enter your phone number"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>

            <div className="form-row">
              <InputField
                label="Age"
                type="number"
                name="age"
                placeholder="Enter your age"
                value={formData.age}
                onChange={handleChange}
              />
            </div>

            <div className="form-row">
              <div className="input-group">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label>Tell us about yourself</label>
                  <button
                    type="button"
                    onClick={() => handleGenerate("about")}
                    disabled={generating.about}
                    style={{
                      fontSize: "0.85rem",
                      padding: "4px 10px",
                      cursor: generating.about ? "not-allowed" : "pointer",
                      opacity: generating.about ? 0.6 : 1
                    }}
                  >
                    {generating.about ? "Generating..." : "✨ Generate with AI"}
                  </button>
                </div>
                <textarea
                  name="about"
                  placeholder="Write a brief introduction..."
                  rows="4"
                  value={formData.about}
                  onChange={handleChange}
                ></textarea>
              </div>
            </div>

            <div className="form-row">
              <div className="input-group">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label>Why are you interested in this internship?</label>
                  <button
                    type="button"
                    onClick={() => handleGenerate("interest")}
                    disabled={generating.interest}
                    style={{
                      fontSize: "0.85rem",
                      padding: "4px 10px",
                      cursor: generating.interest ? "not-allowed" : "pointer",
                      opacity: generating.interest ? 0.6 : 1
                    }}
                  >
                    {generating.interest ? "Generating..." : "✨ Generate with AI"}
                  </button>
                </div>
                <textarea
                  name="interest"
                  placeholder="Explain your interest..."
                  rows="4"
                  value={formData.interest}
                  onChange={handleChange}
                ></textarea>
              </div>
            </div>

            <Button
              text={submitting ? "Submitting..." : "Submit Application"}
              type="submit"
              disabled={submitting}
            />
          </form>

          <div className="back-link">
            <Link to="/dashboard">← Back to Dashboard</Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default ApplicationForm;