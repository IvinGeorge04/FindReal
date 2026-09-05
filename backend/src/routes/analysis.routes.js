const express = require('express');
const router = express.Router();
const { 
  getAnalysisById, 
  createAndRunAnalysis, 
  getAnalysisHistory, 
  deleteAnalysisById 
} = require('../controllers/analysis.controller');
const { authenticate, optionalAuth } = require('../middleware/auth.middleware');
const { analysisLimiter } = require('../middleware/rateLimiter.middleware');

// POST /api/v1/analysis - Trigger multi-engine analysis on verified media (open to guests & registered users)
router.post('/', optionalAuth, analysisLimiter, createAndRunAnalysis);

// GET /api/v1/analysis/history - Protected with user IDOR isolation (returns empty list for guests)
router.get('/history', optionalAuth, getAnalysisHistory);

// GET /api/v1/analysis/:id - Access analysis by ID (public if created anonymously, IDOR-protected if user-owned)
router.get('/:id', optionalAuth, getAnalysisById);

// DELETE /api/v1/analysis/:id - Protected with IDOR ownership validation (requires registered user)
router.delete('/:id', authenticate, deleteAnalysisById);

module.exports = router;
