/**
 * Custom Operational Application Error
 * Encapsulates HTTP status code and standardized machine-readable error code.
 */
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;

    // Capture clean stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
