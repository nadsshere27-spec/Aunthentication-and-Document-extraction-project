import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../../components/Card";
import Loader from "../../components/Loader";
import { compareDocuments } from "../../services/api";
import { FaChevronUp, FaChevronDown } from "react-icons/fa";
import "./compare.css";
import { Link } from "react-router-dom";
// Groups raw diff parts into logical changes: an adjacent
// removed+added pair becomes one "replaced" change, otherwise
// each removed/added chunk stands alone.
function buildChanges(parts) {
  const changes = [];
  let i = 0;
  while (i < parts.length) {
    const part = parts[i];
    if (part.removed) {
      const next = parts[i + 1];
      if (next && next.added) {
        changes.push({ type: "replaced", before: part.value, after: next.value, indices: [i, i + 1] });
        i += 2;
        continue;
      }
      changes.push({ type: "removed", value: part.value, indices: [i] });
      i += 1;
      continue;
    }
    if (part.added) {
      changes.push({ type: "added", value: part.value, indices: [i] });
      i += 1;
      continue;
    }
    i += 1;
  }
  return changes;
}

function Compare() {
  const navigate = useNavigate();
  const [fileOne, setFileOne] = useState(null);
  const [fileTwo, setFileTwo] = useState(null);
  const [comparing, setComparing] = useState(false);
  const [result, setResult] = useState(null);
  const [changes, setChanges] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [error, setError] = useState("");

  const leftRefs = useRef({});
  const rightRefs = useRef({});

  const handleCompare = async () => {
    if (!fileOne || !fileTwo) {
      setError("Please choose both documents first");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/");
      return;
    }

    setError("");
    setComparing(true);
    setResult(null);
    setChanges([]);
    setActiveIndex(0);

    const formData = new FormData();
    formData.append("fileOne", fileOne);
    formData.append("fileTwo", fileTwo);

    const res = await compareDocuments(token, formData);

    if (res.success) {
      setResult(res);
      setChanges(buildChanges(res.diff));
    } else {
      setError(res.message || "Comparison failed");
    }

    setComparing(false);
  };

  const scrollToChange = (idx) => {
    const change = changes[idx];
    if (!change) return;

    const firstIndex = change.indices[0];
    const leftEl = leftRefs.current[firstIndex];
    const rightEl = rightRefs.current[firstIndex];

    if (leftEl) leftEl.scrollIntoView({ behavior: "smooth", block: "center" });
    if (rightEl) rightEl.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const goToChange = (idx) => {
    if (idx < 0 || idx >= changes.length) return;
    setActiveIndex(idx);
    scrollToChange(idx);
  };

  const isActive = (partIndex) => {
    const change = changes[activeIndex];
    return change && change.indices.includes(partIndex);
  };

  return (
    <div className="compare-page">
      <div className="compare-header">
        <Link to="/dashboard" className="compare-back-link">← Back to Dashboard</Link>
        <h1>Compare documents</h1>
        <p>Upload two versions of your resume (or any document) to see what changed.</p>
      </div>
      <div className="compare-dropzones">
        <Card>
          <div className="compare-dropzone">
            <div className="compare-dropzone-icon">📄</div>
            <h3>{fileOne ? fileOne.name : "Drop document one"}</h3>
            <p>PDF, DOC, DOCX</p>
            <input
              type="file"
              id="fileOne"
              accept=".pdf,.doc,.docx"
              style={{ display: "none" }}
              onChange={(e) => setFileOne(e.target.files[0])}
            />
            <button className="compare-browse-btn" onClick={() => document.getElementById("fileOne").click()}>
              Browse
            </button>
          </div>
        </Card>

        <Card>
          <div className="compare-dropzone">
            <div className="compare-dropzone-icon">📄</div>
            <h3>{fileTwo ? fileTwo.name : "Drop document two"}</h3>
            <p>PDF, DOC, DOCX</p>
            <input
              type="file"
              id="fileTwo"
              accept=".pdf,.doc,.docx"
              style={{ display: "none" }}
              onChange={(e) => setFileTwo(e.target.files[0])}
            />
            <button className="compare-browse-btn" onClick={() => document.getElementById("fileTwo").click()}>
              Browse
            </button>
          </div>
        </Card>
      </div>

      {error && <div className="compare-error">{error}</div>}

      <div className="compare-action">
        <button
          className="compare-find-btn"
          onClick={handleCompare}
          disabled={comparing || !fileOne || !fileTwo}
        >
          {comparing ? "Comparing..." : "Find difference"}
        </button>
      </div>

      {comparing && <Loader fullPage={false} />}

      {result && (
        <div className="compare-results">
          <div className="compare-results-col">
            <h4>{result.fileNames.fileOne}</h4>
            <div className="compare-text-block">
              {result.diff.map((part, i) => {
                if (part.added) return null;
                const classes = part.removed
                  ? `diff-removed${isActive(i) ? " diff-active" : ""}`
                  : "";
                return (
                  <span key={i} ref={(el) => (leftRefs.current[i] = el)} className={classes}>
                    {part.value}
                  </span>
                );
              })}
            </div>
          </div>

          <div className="compare-results-col">
            <h4>{result.fileNames.fileTwo}</h4>
            <div className="compare-text-block">
              {result.diff.map((part, i) => {
                if (part.removed) return null;
                const classes = part.added
                  ? `diff-added${isActive(i) ? " diff-active" : ""}`
                  : "";
                return (
                  <span key={i} ref={(el) => (rightRefs.current[i] = el)} className={classes}>
                    {part.value}
                  </span>
                );
              })}
            </div>
          </div>

          <div className="compare-changes-panel">
            <div className="compare-changes-header">
              <span>Changes</span>
              <div className="compare-changes-nav">
                <button onClick={() => goToChange(activeIndex - 1)} disabled={activeIndex <= 0} aria-label="Previous change">
                  <FaChevronUp size={12} />
                </button>
                <span className="compare-changes-count">
                  {changes.length > 0 ? `${activeIndex + 1} of ${changes.length}` : "0 of 0"}
                </span>
                <button onClick={() => goToChange(activeIndex + 1)} disabled={activeIndex >= changes.length - 1} aria-label="Next change">
                  <FaChevronDown size={12} />
                </button>
              </div>
            </div>

            <div className="compare-changes-list">
              {changes.map((change, idx) => (
                <div
                  key={idx}
                  className={`compare-change-card ${idx === activeIndex ? "compare-change-card-active" : ""}`}
                  onClick={() => goToChange(idx)}
                >
                  <span className={`compare-change-badge compare-change-badge-${change.type}`}>
                    {change.type === "replaced" ? "Replaced" : change.type === "added" ? "Added" : "Removed"}
                  </span>

                  {change.type === "replaced" ? (
                    <>
                      <p className="compare-change-label">Before</p>
                      <p className="compare-change-text compare-change-before">{change.before.trim()}</p>
                      <p className="compare-change-label">After</p>
                      <p className="compare-change-text compare-change-after">{change.after.trim()}</p>
                    </>
                  ) : (
                    <p className={`compare-change-text ${change.type === "added" ? "compare-change-after" : "compare-change-before"}`}>
                      {change.value.trim()}
                    </p>
                  )}
                </div>
              ))}

              {changes.length === 0 && (
                <p className="compare-changes-empty">No differences found.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Compare;