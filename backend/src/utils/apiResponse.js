const { HTTP_STATUS } = require('./constants');

/**
 * Standard Success Response Helper
 * Conforms strictly to:
 * {
 *   "success": true,
 *   "data": {}
 * }
 */
const successResponse = (res, data = {}, statusCode = HTTP_STATUS.OK) => {
  return res.status(statusCode).json({
    success: true,
    data: data !== null && typeof data === 'object' ? data : { value: data },
  });
};

/**
 * Standard Error Response Helper
 * Conforms strictly to:
 * {
 *   "success": false,
 *   "error": {
 *     "code": "ERROR_CODE",
 *     "message": "Safe user-facing message"
 *   }
 * }
 */
const errorResponse = (
  res,
  message = 'An unexpected error occurred',
  statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR,
  code = 'INTERNAL_ERROR'
) => {
  return res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
    },
  });
};

module.exports = {
  successResponse,
  errorResponse,
};
