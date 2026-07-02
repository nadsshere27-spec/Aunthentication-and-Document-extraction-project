// backend/src/controllers/application/application.controller.js
const Application = require('../../models/Application');

const submitApplication = async (req, res) => {
  try {
    const { fullName, email, phone, age, about, interest } = req.body;

    if (!fullName || !email) {
      return res.status(400).json({
        success: false,
        message: 'Full name and email are required'
      });
    }

    const application = new Application({
      user: req.user._id,
      fullName,
      email,
      phone,
      age,
      about,
      interest
    });

    await application.save();

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      application
    });

  } catch (error) {
    console.error('❌ Application submit error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit application: ' + error.message
    });
  }
};

module.exports = { submitApplication };