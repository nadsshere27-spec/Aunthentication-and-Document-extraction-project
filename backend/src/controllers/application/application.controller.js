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

// ============================================
// ADMIN-ONLY FUNCTIONS
// ============================================

const getAllApplications = async (req, res) => {
  try {
    const applications = await Application.find().sort({ submittedAt: -1 });

    res.status(200).json({
      success: true,
      applications
    });

  } catch (error) {
    console.error('❌ Get all applications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch applications: ' + error.message
    });
  }
};

const getApplicationById = async (req, res) => {
  try {
    const { id } = req.params;

    const application = await Application.findById(id);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    res.status(200).json({
      success: true,
      application
    });

  } catch (error) {
    console.error('❌ Get application by id error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch application: ' + error.message
    });
  }
};

const updateApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, email, phone, age, about, interest } = req.body;

    const application = await Application.findById(id);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    if (fullName !== undefined) application.fullName = fullName;
    if (email !== undefined) application.email = email;
    if (phone !== undefined) application.phone = phone;
    if (age !== undefined) application.age = age;
    if (about !== undefined) application.about = about;
    if (interest !== undefined) application.interest = interest;

    await application.save();

    res.status(200).json({
      success: true,
      message: 'Application updated successfully',
      application
    });

  } catch (error) {
    console.error('❌ Update application error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update application: ' + error.message
    });
  }
};

module.exports = {
  submitApplication,
  getAllApplications,
  getApplicationById,
  updateApplication
};