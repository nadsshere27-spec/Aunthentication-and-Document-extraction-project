import React, { useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import axios from "axios";

// Change this if your backend runs on a different port/host
const API_BASE = "http://localhost:5000/api";

export default function CodeEditor() {
  const editorRef = useRef(null);
  const [language, setLanguage] = useState("javascript");
  const [status, setStatus] = useState("Ready");

  // Registers VS Code's native lightbulb 💡 quick-fix menu on red-underlined errors
  const handleEditorWillMount = (monaco) => {
    monaco.languages.registerCodeActionProvider("javascript", {
      provideCodeActions: async (model, range, context) => {
        const syntaxMarkers = context.markers.filter(
          (m) => m.severity === monaco.MarkerSeverity.Error
        );
        if (syntaxMarkers.length === 0) {
          return { actions: [], dispose: () => {} };
        }

        const actions = [];

        for (const marker of syntaxMarkers) {
          const fullCode = model.getValue();
          let fixedCode;

          try {
            setStatus("Asking AI for a fix...");
           const res = await axios.post(`${API_BASE}/ai-tools/fix-syntax`, {
              code: fullCode,
              errorMessage: marker.message,
              line: marker.startLineNumber,
            });
            fixedCode = res.data.fixedCode;
            setStatus("Ready");
          } catch (err) {
            setStatus("AI suggestion failed — check backend/API key");
            continue;
          }

          if (fixedCode && fixedCode !== fullCode) {
            actions.push({
              title: `💡 Fix: ${marker.message}`,
              diagnostics: [marker],
              kind: "quickfix",
              edit: {
                edits: [
                  {
                    resource: model.uri,
                    textEdit: {
                      range: model.getFullModelRange(),
                      text: fixedCode,
                    },
                    versionId: model.getVersionId(),
                  },
                ],
              },
            });
          }
        }

        return { actions, dispose: () => {} };
      },
    });
  };

  const handleEditorDidMount = (editor) => {
    editorRef.current = editor;
  };

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "#1e1e1e",
      }}
    >
      <div
        style={{
          height: 42,
          background: "#252526",
          color: "#cccccc",
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          fontFamily: "'Segoe UI', sans-serif",
          fontSize: 13,
          borderBottom: "1px solid #333",
        }}
      >
        <span style={{ marginRight: 16, fontWeight: 600 }}>💻 Code Editor</span>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          style={{
            background: "#3c3c3c",
            color: "#fff",
            border: "1px solid #555",
            borderRadius: 4,
            padding: "3px 8px",
          }}
        >
          <option value="javascript">JavaScript</option>
          <option value="typescript">TypeScript</option>
          <option value="python">Python</option>
          <option value="json">JSON</option>
        </select>
        <span style={{ marginLeft: "auto", opacity: 0.75, fontStyle: "italic" }}>
          {status}
        </span>
      </div>

      <Editor
        height="calc(100vh - 42px)"
        theme="vs-dark"
        language={language}
        defaultValue={`function greet(name) {\n  console.log("Hello, " + name)\n}`}
        beforeMount={handleEditorWillMount}
        onMount={handleEditorDidMount}
        options={{
          fontSize: 14,
          fontFamily: "Consolas, 'Courier New', monospace",
          minimap: { enabled: true },
          automaticLayout: true,
          quickSuggestions: true,
          lightbulb: { enabled: "on" },
          scrollBeyondLastLine: false,
        }}
      />
    </div>
  );
}