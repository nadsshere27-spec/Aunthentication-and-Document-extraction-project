const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth');
const {
  upload,
  uploadProfilePicture,
  getMyProfile,
  updateProfile,
  getDashboardStats
} = require('../../controllers/profile/profile.controller');

console.log('✅ profile.routes.js is being loaded!');

router.get('/', authenticate, getMyProfile);
router.put('/', authenticate, updateProfile);
router.get('/stats', authenticate, getDashboardStats);
router.post('/picture', authenticate, upload.single('profilePicture'), uploadProfilePicture);

module.exports = router;