const express = require('express');
const router = express.Router();
const { uploadMedia, uploadMediaFromUrl } = require('../controllers/media.controller');
const { handleUpload } = require('../middleware/upload.middleware');
const { authenticate } = require('../middleware/auth.middleware');
const { uploadLimiter } = require('../middleware/rateLimiter.middleware');

// POST /api/v1/media/upload - Secure authenticated media upload pipeline
router.post(
  '/upload',
  authenticate,
  uploadLimiter,
  handleUpload('media'),
  uploadMedia
);

// POST /api/v1/media/url - Ingest media from remote URL with strict SSRF protection
router.post(
  '/url',
  authenticate,
  uploadLimiter,
  uploadMediaFromUrl
);

module.exports = router;
