require('../config/resolveModules');
const rateLimit = require('express-rate-limit');
const { errorResponse } = require('../utils/apiResponse');
const { HTTP_STATUS } = require('../utils/constants');

// Rate limiter for Login attempts (5 attempts per 15 minutes)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return errorResponse(
      res,
      'Too many login attempts from this IP address. Please try again after 15 minutes.',
      HTTP_STATUS.TOO_MANY_REQUESTS,
      'RATE_LIMIT_EXCEEDED'
    );
  },
});

// Rate limiter for Registration attempts (5 attempts per 1 hour)
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return errorResponse(
      res,
      'Too many accounts created from this IP address. Please try again after an hour.',
      HTTP_STATUS.TOO_MANY_REQUESTS,
      'RATE_LIMIT_EXCEEDED'
    );
  },
});

// Rate limiter for Media Uploads (10 uploads per 10 minutes)
const uploadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return errorResponse(
      res,
      'Media upload rate limit exceeded. Please wait a few minutes before submitting additional files.',
      HTTP_STATUS.TOO_MANY_REQUESTS,
      'UPLOAD_RATE_LIMIT_EXCEEDED'
    );
  },
});

// Rate limiter for Analysis Pipeline Execution (15 analyses per 10 minutes)
const analysisLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return errorResponse(
      res,
      'Analysis request limit exceeded. Please wait a few minutes before submitting new media for verification.',
      HTTP_STATUS.TOO_MANY_REQUESTS,
      'ANALYSIS_RATE_LIMIT_EXCEEDED'
    );
  },
});

module.exports = {
  loginLimiter,
  registerLimiter,
  uploadLimiter,
  analysisLimiter,
};
