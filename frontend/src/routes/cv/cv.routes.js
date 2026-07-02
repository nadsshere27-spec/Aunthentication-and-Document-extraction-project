const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth');
const {
  upload,
  uploadCV,
  extractCVData,
  getCVData
} = require('../../controllers/cv/cv.controller');

// Upload CV (single file)
router.post('/upload', authenticate, upload.single('cvFile'), uploadCV);

// Extract CV data
router.post('/extract', authenticate, extractCVData);

// Get CV data
router.get('/data', authenticate, getCVData);

module.exports = router;