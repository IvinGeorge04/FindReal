const express = require('express');
const router = express.Router();
const healthRoutes = require('./health.routes');
const authRoutes = require('./auth.routes');
const analysisRoutes = require('./analysis.routes');
const mediaRoutes = require('./media.routes');
const reportRoutes = require('./report.routes');
const { successResponse } = require('../utils/apiResponse');

// API root summary endpoint
router.get('/', (req, res) => {
  return successResponse(res, {
    name: 'FindReal Forensic API',
    version: 'v1',
    description: 'Multi-modal media verification, provenance auditing, and forensic analysis API',
    endpoints: {
      auth: {
        register: 'POST /api/v1/auth/register',
        login: 'POST /api/v1/auth/login',
        logout: 'POST /api/v1/auth/logout',
        me: 'GET /api/v1/auth/me',
      },
      media: {
        upload: 'POST /api/v1/media/upload',
      },
      analysis: {
        run: 'POST /api/v1/analysis',
        history: 'GET /api/v1/analysis/history',
        getById: 'GET /api/v1/analysis/:id',
        delete: 'DELETE /api/v1/analysis/:id',
      },
      reports: {
        getById: 'GET /api/v1/reports/:id',
      },
      health: 'GET /api/v1/health',
    },
  });
});

// Mount modular sub-routes
router.use('/auth', authRoutes);
router.use('/media', mediaRoutes);
router.use('/analysis', analysisRoutes);
router.use('/reports', reportRoutes);
router.use('/', healthRoutes);

module.exports = router;
