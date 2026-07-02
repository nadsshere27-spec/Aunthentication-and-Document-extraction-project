// backend/src/services/aiService.js
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });

// Checks if the user's extracted CV data has enough real content to personalize with
const hasUsableCVData = (cvData) => {
  if (!cvData) return false;
  const skills = Array.isArray(cvData.skills) ? cvData.skills.length > 0 : false;
  const education = cvData.education && cvData.education.trim().length > 0;
  const experience = cvData.experience && cvData.experience.trim().length > 0;
  return skills || education || experience;
};

// Builds the prompt sent to Gemini, depending on which field and whether we have CV data
const buildPrompt = (fieldType, cvData) => {
  const usableData = hasUsableCVData(cvData);

  let cvContext = '';
  if (usableData) {
    const skills = Array.isArray(cvData.skills) && cvData.skills.length > 0
      ? cvData.skills.join(', ')
      : 'not specified';
    const education = cvData.education && cvData.education.trim().length > 0
      ? cvData.education
      : 'not specified';
    const experience = cvData.experience && cvData.experience.trim().length > 0
      ? cvData.experience
      : 'not specified';

    cvContext = `
Candidate background (from their CV):
- Skills: ${skills}
- Education: ${education}
- Experience: ${experience}
`;
  }

  if (fieldType === 'interest') {
    return usableData
      ? `Write a short, genuine, first-person paragraph (3-4 sentences) explaining why this candidate wants to do this internship, based on their background below. Keep it natural, specific, and not generic. Do not use headings or bullet points, just plain text.${cvContext}`
      : `Write a short, genuine, first-person paragraph (3-4 sentences) explaining why someone would want to do this internship. Keep it enthusiastic, professional, and not overly generic. Plain text only, no headings or bullet points.`;
  }

  if (fieldType === 'about') {
    return usableData
      ? `Write a short, warm, first-person "about me" paragraph (3-4 sentences) introducing this candidate, based on their background below. Keep it natural and professional, not a list. Plain text only, no headings or bullet points.${cvContext}`
      : `Write a short, warm, first-person "about me" paragraph (3-4 sentences) suitable for a general internship application. Keep it natural, professional, and friendly. Plain text only, no headings or bullet points.`;
  }

  throw new Error(`Unknown fieldType: ${fieldType}`);
};

// Main function: generates a paragraph answer for a given form field
const generateAnswer = async (fieldType, cvData) => {
  const prompt = buildPrompt(fieldType, cvData);

  const result = await model.generateContent(prompt);
  const response = result.response;
  return response.text().trim();
};

module.exports = { generateAnswer };

