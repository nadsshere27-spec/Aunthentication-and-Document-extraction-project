const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth');
const { askChatbot } = require('../../controllers/chatbot/chatbot.controller');

console.log('✅ chatbot.routes.js is being loaded!');

router.post('/ask', authenticate, askChatbot);

module.exports = router;