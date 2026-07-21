import { useState, useRef, useEffect } from "react";
import { askChatbot } from "../../services/api";
import "./chatbot.css";

// Ensures we NEVER try to render a raw object/Error into JSX.
const toDisplayText = (value, fallback) => {
  if (typeof value === "string" && value.trim()) return value;
  if (value instanceof Error) return value.message;
  if (value && typeof value === "object") {
    if (typeof value.message === "string") return value.message;
    try {
      return JSON.stringify(value);
    } catch {
      return fallback;
    }
  }
  return fallback;
};

function Chatbot() {
  const [messages, setMessages] = useState([
    { from: "bot", text: "Hi! Ask me anything about invoices, customers, payments, products, or sales." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const question = input.trim();
    setMessages((prev) => [...prev, { from: "user", text: question }]);
    setInput("");
    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      const result = await askChatbot(token, question);

      const text = result?.success
        ? toDisplayText(result.answer, "I couldn't generate an answer for that.")
        : toDisplayText(result?.message, "Something went wrong.");

      setMessages((prev) => [...prev, { from: "bot", text }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { from: "bot", text: toDisplayText(err, "Something went wrong. Please try again.") }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSend();
  };

  return (
    <div className="chatbot-page">
      <div className="chatbot-header">
        <h1>Invoice Assistant</h1>
        <p>Ask questions about the invoice data.</p>
      </div>

      <div className="chatbot-window">
        <div className="chatbot-messages">
          {messages.map((msg, i) => (
            <div key={i} className={`chatbot-bubble chatbot-bubble-${msg.from}`}>
              {msg.text}
            </div>
          ))}
          {loading && <div className="chatbot-bubble chatbot-bubble-bot">Thinking...</div>}
          <div ref={endRef} />
        </div>

        <div className="chatbot-input-row">
          <input
            type="text"
            placeholder="Ask a question..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button onClick={handleSend} disabled={loading}>Send</button>
        </div>
      </div>
    </div>
  );
}

export default Chatbot;