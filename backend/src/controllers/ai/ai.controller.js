// backend/src/controllers/ai/ai.controller.js
const User = require('../../models/User');
const { generateAnswer } = require('../../services/aiService');

// Generate an AI answer for a specific open-ended form field
const generateFieldAnswer = async (req, res) => {
  console.log('🤖 GENERATE ANSWER FUNCTION CALLED');

  try {
    const { fieldType } = req.body;

    if (!fieldType || !['about', 'interest'].includes(fieldType)) {
      return res.status(400).json({
        success: false,
        message: 'fieldType must be either "about" or "interest"'
      });
    }

    const userId = req.user._id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const cvData = user.cvData?.extractedInfo || {};

    const answer = await generateAnswer(fieldType, cvData);

    res.status(200).json({
      success: true,
      answer
    });

  } catch (error) {
    console.error('❌ AI generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate answer: ' + error.message
    });
  }
};

module.exports = { generateFieldAnswer };