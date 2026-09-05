const express = require('express');
const router = express.Router();
const { getReportById } = require('../controllers/report.controller');
const { authenticate } = require('../middleware/auth.middleware');

// GET /api/v1/reports/:id - Protected with IDOR ownership validation
router.get('/:id', authenticate, getReportById);

module.exports = router;
