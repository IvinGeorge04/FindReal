const { HTTP_STATUS } = require('../utils/constants');
const { errorResponse } = require('../utils/apiResponse');
const config = require('../config/env');

/**
 * Centralized Error Handling Middleware
 * Guarantees zero leakage of stack traces, database credentials, API keys,
 * filesystem paths, or internal implementation details in production.
 */
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let code = err.code || 'INTERNAL_ERROR';
  let message = err.message || 'An unexpected error occurred';

  // Handle specific Express / Mongoose / Parser errors safely
  if (err.type === 'entity.too.large') {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    code = 'PAYLOAD_TOO_LARGE';
    message = 'Request payload exceeds the allowable size limit.';
  } else if (err.name === 'SyntaxError' && err.status === 400 && 'body' in err) {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    code = 'MALFORMED_JSON';
    message = 'Request body contains malformed JSON syntax.';
  } else if (err.name === 'CastError') {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    code = 'INVALID_IDENTIFIER';
    message = 'Invalid resource identifier provided.';
  } else if (err.code === 11000) {
    statusCode = HTTP_STATUS.CONFLICT;
    code = 'DUPLICATE_RESOURCE';
    message = 'A resource with these details already exists.';
  }

  // Sanitize message in production to prevent leaking internal system details
  if (config.isProduction) {
    // If it is not marked as an operational AppError, hide internal message
    if (!err.isOperational) {
      message = 'An internal error occurred. Please contact system support if the issue persists.';
      code = 'INTERNAL_ERROR';
    }

    // Scrub any accidental path or credential leakage
    if (typeof message === 'string') {
      message = message
        .replace(/[A-Za-z]:\\[^"'\s]+/g, '[filepath]')
        .replace(/\/[^"'\s]+\/[^"'\s]+/g, '[filepath]')
        .replace(/mongodb:\/\/[^"'\s]+/gi, 'mongodb://[credentials-hidden]');
    }
  } else {
    // In development, log the error trace to backend console for debugging
    console.error(`[Server Error] ${req.method} ${req.originalUrl}:`, {
      code,
      statusCode,
      message: err.message,
      stack: err.stack,
    });
  }

  return errorResponse(res, message, statusCode, code);
};

module.exports = errorHandler;
