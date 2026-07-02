const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth');
const {
  upload,
  uploadCV,
  extractCVData,
  getCVData
} = require('../../controllers/cv/cv.controller');

console.log('📌 cv.routes.js starting...');
console.log('📌 Router created successfully');

console.log('✅ cv.routes.js is being loaded!');

// ============================================
// TEST ROUTE - NO AUTH REQUIRED
// ============================================
router.get('/pingtest', (req, res) => {
  console.log('🎯 PINGTEST HIT!');
  res.json({ 
    ok: true, 
    time: new Date().toISOString(),
    message: 'CV routes are working!'
  });
});

// ============================================
// TEST ROUTE - WITH AUTH
// ============================================
router.get('/test', authenticate, (req, res) => {
  res.json({ 
    success: true, 
    message: 'CV route is working!',
    user: req.user.email 
  });
});

// ============================================
// ACTUAL ROUTES
// ============================================

// Upload CV
router.post('/upload', authenticate, upload.single('cvFile'), uploadCV);

// Extract CV data
router.post('/extract', authenticate, (req, res, next) => {
  console.log('✅ EXTRACT ROUTE HIT!');
  next();
}, extractCVData);

// Get CV data
router.get('/data', authenticate, getCVData);

console.log('✅ CV Routes exported successfully!');

console.log('🔍 Checking cvRoutes export...');
console.log('🔍 router type:', typeof router);
console.log('🔍 router has routes:', !!router);

module.exports = router;
console.log('✅ cvRoutes exported successfully!');