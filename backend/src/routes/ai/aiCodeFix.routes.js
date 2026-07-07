// src/routes/ai/aiCodeFix.routes.js
const express = require("express");
const router = express.Router();
const { fixSyntax } = require("../../controllers/ai/aiCodeFix.controller");

router.post("/fix-syntax", fixSyntax);

module.exports = router;