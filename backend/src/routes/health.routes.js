const express = require('express');
const router = express.Router();
const { getHello, getHealth } = require('../controllers/health.controller');

// Legacy route preserved for backwards compatibility
router.get('/hello', getHello);

// System health check
router.get('/health', getHealth);

module.exports = router;
