// backend/src/routes/admin/admin.routes.js
const express = require('express');
const router = express.Router();
const { adminLogin } = require('../../controllers/admin/admin.controller');
const { verifyAdminToken } = require('../../middleware/adminAuth');
const {
  getAllApplications,
  getApplicationById,
  updateApplication
} = require('../../controllers/application/application.controller');

console.log('✅ admin.routes.js is being loaded!');

// Public — admin login check
router.post('/login', adminLogin);

// Protected — admin only
router.get('/applications', verifyAdminToken, getAllApplications);
router.get('/applications/:id', verifyAdminToken, getApplicationById);
router.put('/applications/:id', verifyAdminToken, updateApplication);

module.exports = router;