const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth');
const { upload, uploadProfilePicture, getMyProfile } = require('../../controllers/profile/profile.controller');

console.log('✅ profile.routes.js is being loaded!');

router.get('/', authenticate, getMyProfile);
router.post('/picture', authenticate, upload.single('profilePicture'), uploadProfilePicture);

module.exports = router;