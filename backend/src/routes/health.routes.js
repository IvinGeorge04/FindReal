const express = require('express');
const router = express.Router();
const { getHello, getHealth, getGeminiHealth } = require('../controllers/health.controller');

// Legacy route preserved for backwards compatibility
router.get('/hello', getHello);

// System health check
router.get('/health', getHealth);

// Safe Gemini health check diagnostic
router.get('/health/gemini', getGeminiHealth);

module.exports = router;
