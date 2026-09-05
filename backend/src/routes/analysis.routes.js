const express = require('express');
const router = express.Router();
const { 
  getAnalysisById, 
  createAndRunAnalysis, 
  getAnalysisHistory, 
  deleteAnalysisById 
} = require('../controllers/analysis.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { analysisLimiter } = require('../middleware/rateLimiter.middleware');

// POST /api/v1/analysis - Trigger multi-engine analysis on verified media (rate-limited)
router.post('/', authenticate, analysisLimiter, createAndRunAnalysis);

// GET /api/v1/analysis/history - Protected with user IDOR isolation (MUST be declared before /:id)
router.get('/history', authenticate, getAnalysisHistory);

// GET /api/v1/analysis/:id - Protected with IDOR ownership validation
router.get('/:id', authenticate, getAnalysisById);

// DELETE /api/v1/analysis/:id - Protected with IDOR ownership validation
router.delete('/:id', authenticate, deleteAnalysisById);

module.exports = router;
