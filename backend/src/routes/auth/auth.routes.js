// backend/src/routes/auth/auth.routes.js
const express = require('express');
const router = express.Router();

const {
  register,
  login,
  forgotPassword,
  resetPassword,
  getProfile
} = require('../../controllers/auth/auth.controller');

const { authenticate } = require('../../middleware/auth');

// Public routes (no authentication required)
router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);

// Protected routes (authentication required)
router.get('/profile', authenticate, getProfile);

module.exports = router;