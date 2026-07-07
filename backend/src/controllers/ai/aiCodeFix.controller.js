// src/controllers/ai/aiCodeFix.controller.js
const axios = require("axios");

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

exports.fixSyntax = async (req, res) => {
  try {
    const { code, errorMessage, line } = req.body;

    if (!code || !errorMessage) {
      return res.status(400).json({ message: "code and errorMessage are required" });
    }

    const prompt = `You are a code-fixing assistant. The following code has a SYNTAX error near line ${line}: "${errorMessage}".
Fix ONLY the syntax error (e.g. missing bracket, missing comma, unclosed string/parenthesis).
Do NOT change variable names, logic, or formatting beyond what's needed to fix the syntax.
Return ONLY the corrected full code. No explanations. No markdown code fences.

CODE:
${code}`;

    const response = await axios.post(
      GROQ_API_URL,
      {
        model: "llama-3.3-70b-versatile", // free on Groq's free tier
        messages: [{ role: "user", content: prompt }],
        temperature: 0,
        max_tokens: 2048,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    let fixedCode = response.data.choices[0].message.content.trim();

    // Safety net: strip markdown fences if the model adds them anyway
    fixedCode = fixedCode
      .replace(/^```[a-zA-Z]*\n?/, "")
      .replace(/```$/, "")
      .trim();

    res.json({ fixedCode });
  } catch (err) {
    console.error("AI fix error:", err.response?.data || err.message);
    res.status(500).json({ message: "Failed to get AI suggestion" });
  }
};