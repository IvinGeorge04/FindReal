const express = require('express');
const router = express.Router();
const { uploadMedia, uploadMediaFromUrl } = require('../controllers/media.controller');
const { handleUpload } = require('../middleware/upload.middleware');
const { optionalAuth } = require('../middleware/auth.middleware');
const { uploadLimiter } = require('../middleware/rateLimiter.middleware');

// POST /api/v1/media/upload - Secure media upload pipeline (open to guests and authenticated users)
router.post(
  '/upload',
  optionalAuth,
  uploadLimiter,
  handleUpload('media'),
  uploadMedia
);

// POST /api/v1/media/url - Ingest media from remote URL with strict SSRF protection
router.post(
  '/url',
  optionalAuth,
  uploadLimiter,
  uploadMediaFromUrl
);

module.exports = router;
