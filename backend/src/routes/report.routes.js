const express = require('express');
const router = express.Router();
const { getReportById } = require('../controllers/report.controller');
const { optionalAuth } = require('../middleware/auth.middleware');

// GET /api/v1/reports/:id - Public for anonymous analysis, IDOR ownership validation for user accounts
router.get('/:id', optionalAuth, getReportById);

module.exports = router;
