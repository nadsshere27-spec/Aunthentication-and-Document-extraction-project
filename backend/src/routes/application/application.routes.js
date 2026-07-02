// backend/src/routes/application/application.routes.js
const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth');
const { submitApplication } = require('../../controllers/application/application.controller');

console.log('✅ application.routes.js is being loaded!');

router.post('/submit', authenticate, submitApplication);

module.exports = router;