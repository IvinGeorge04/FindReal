const { HTTP_STATUS } = require('../utils/constants');
const { errorResponse } = require('../utils/apiResponse');

/**
 * 404 Route Not Found Middleware
 * Safely responds to undefined endpoints without exposing filesystem or router internals.
 */
const notFound = (req, res, next) => {
  return errorResponse(
    res,
    `Resource not found: ${req.method} ${req.originalUrl}`,
    HTTP_STATUS.NOT_FOUND,
    'NOT_FOUND'
  );
};

module.exports = notFound;
