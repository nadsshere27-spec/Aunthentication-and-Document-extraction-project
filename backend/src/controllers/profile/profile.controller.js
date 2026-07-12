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
// GET MY PROFILE (combines account + CV data + latest application)
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

    const latestApplication = await Application.findOne({ user: req.user._id })
      .sort({ submittedAt: -1 });

    res.status(200).json({
      success: true,
      profile: {
        fullName: user.fullName,
        email: user.email,
        profilePicture: user.profilePicture || '',
        phone: latestApplication?.phone || user.cvData?.extractedInfo?.phone || '',
        age: latestApplication?.age || user.cvData?.extractedInfo?.age || null,
        skills: user.cvData?.extractedInfo?.skills || [],
        education: user.cvData?.extractedInfo?.education || '',
        experience: user.cvData?.extractedInfo?.experience || '',
        about: latestApplication?.about || '',
        interest: latestApplication?.interest || ''
      }
    });

  } catch (error) {
    console.error('❌ Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile: ' + error.message
    });
  }
};

module.exports = { upload, uploadProfilePicture, getMyProfile };