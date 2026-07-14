const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth');
const { upload, compareDocuments } = require('../../controllers/compare/compare.controller');

console.log('✅ compare.routes.js is being loaded!');

router.post(
  '/',
  authenticate,
  upload.fields([{ name: 'fileOne', maxCount: 1 }, { name: 'fileTwo', maxCount: 1 }]),
  compareDocuments
);

module.exports = router;