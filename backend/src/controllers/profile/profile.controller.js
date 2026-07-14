const multer = require('multer');
const cloudinary = require('../../config/cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const User = require('../../models/User');
const Application = require('../../models/Application');

// ============================================
// MULTER STORAGE CONFIGURATION (CLOUDINARY - IMAGES)
// ============================================
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: (req, file) => {
    return {
      folder: 'profile-pictures',
      resource_type: 'image',
      public_id: `${req.user._id}-${Date.now()}`,
      transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }]
    };
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPG, PNG, and WEBP images are allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 3 * 1024 * 1024 }
});

// ============================================
// UPLOAD PROFILE PICTURE
// ============================================
const uploadProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image uploaded'
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.profilePicture = req.file.path;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile picture updated',
      profilePicture: user.profilePicture
    });

  } catch (error) {
    console.error('❌ Profile picture upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Upload failed: ' + error.message
    });
  }
};

// ============================================
// BUILD PROFILE RESPONSE (shared by getMyProfile + updateProfile)
// Overrides (manually edited by the user) always win. Otherwise falls
// back to the latest Application, then the CV extraction.
// ============================================
const buildProfileResponse = async (user) => {
  const latestApplication = await Application.findOne({ user: user._id })
    .sort({ submittedAt: -1 });

  const overrides = user.profileOverrides || {};
  const cvInfo = user.cvData?.extractedInfo || {};

  return {
    fullName: user.fullName,
    email: user.email,
    profilePicture: user.profilePicture || '',
    phone: overrides.phone || latestApplication?.phone || cvInfo.phone || '',
    age: overrides.age || latestApplication?.age || cvInfo.age || null,
    skills: (overrides.skills && overrides.skills.length > 0) ? overrides.skills : (cvInfo.skills || []),
    education: overrides.education || cvInfo.education || '',
    experience: overrides.experience || cvInfo.experience || '',
    about: overrides.about || latestApplication?.about || '',
    interest: latestApplication?.interest || ''
  };
};

// ============================================
// GET MY PROFILE
// ============================================
const getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const profile = await buildProfileResponse(user);

    res.status(200).json({
      success: true,
      profile
    });

  } catch (error) {
    console.error('❌ Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile: ' + error.message
    });
  }
};

// ============================================
// UPDATE PROFILE (manual overrides)
// Accepts any subset of: phone, age, skills, education, experience, about
// ============================================
const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const { phone, age, skills, education, experience, about } = req.body;

    user.profileOverrides = user.profileOverrides || {};
    if (phone !== undefined) user.profileOverrides.phone = phone;
    if (age !== undefined) user.profileOverrides.age = age;
    if (skills !== undefined) user.profileOverrides.skills = skills;
    if (education !== undefined) user.profileOverrides.education = education;
    if (experience !== undefined) user.profileOverrides.experience = experience;
    if (about !== undefined) user.profileOverrides.about = about;

    await user.save();

    const profile = await buildProfileResponse(user);

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      profile
    });

  } catch (error) {
    console.error('❌ Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile: ' + error.message
    });
  }
};

// ============================================
// DASHBOARD STATS (real profile completion % + application count)
// ============================================
const getDashboardStats = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const profile = await buildProfileResponse(user);
    const applicationsCount = await Application.countDocuments({ user: req.user._id });

    const checks = [
      !!profile.profilePicture,
      !!profile.phone,
      !!profile.age,
      !!(profile.skills && profile.skills.length > 0),
      !!profile.education,
      !!profile.experience,
      !!profile.about,
    ];

    const filledCount = checks.filter(Boolean).length;
    const profileCompletion = Math.round((filledCount / checks.length) * 100);

    res.status(200).json({
      success: true,
      stats: {
        profileCompletion,
        applicationsCount
      }
    });

  } catch (error) {
    console.error('❌ Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stats: ' + error.message
    });
  }
};

module.exports = { upload, uploadProfilePicture, getMyProfile, updateProfile, getDashboardStats };