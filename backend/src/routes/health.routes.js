const express = require('express');
const router = express.Router();
const { getHello, getHealth, getGroqHealth, getGeminiHealth } = require('../controllers/health.controller');

// Legacy route preserved for backwards compatibility
router.get('/hello', getHello);

// System health check
router.get('/health', getHealth);

// Safe Groq health check diagnostic
router.get('/health/groq', getGroqHealth);

// Safe Gemini health check alias for backwards compatibility
router.get('/health/gemini', getGeminiHealth);

module.exports = router;
