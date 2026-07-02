// backend/src/routes/ai/ai.routes.js
const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth');
const { generateFieldAnswer } = require('../../controllers/ai/ai.controller');

console.log('✅ ai.routes.js is being loaded!');

// Generate AI answer for a form field
router.post('/generate-answer', authenticate, generateFieldAnswer);

module.exports = router;