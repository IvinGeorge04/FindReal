require('../config/resolveModules');
const jwt = require('jsonwebtoken');
const config = require('../config/env');
const User = require('../models/User');
const { errorResponse } = require('../utils/apiResponse');
const { HTTP_STATUS } = require('../utils/constants');

/**
 * Authentication Middleware
 * Validates HttpOnly cookie session or Bearer header.
 * Attaches verified user to req.user.
 * Rejects untrusted client-supplied identity parameters.
 */
const authenticate = async (req, res, next) => {
  try {
    let token = req.cookies?.token;

    // Optional Bearer header fallback
    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return errorResponse(
        res,
        'Authentication required. Please log in to proceed.',
        HTTP_STATUS.UNAUTHORIZED,
        'UNAUTHORIZED'
      );
    }

    // Verify token cryptographically
    let decoded;
    try {
      decoded = jwt.verify(token, config.jwtSecret);
    } catch (err) {
      return errorResponse(
        res,
        'Invalid or expired session token. Please log in again.',
        HTTP_STATUS.UNAUTHORIZED,
        'INVALID_TOKEN'
      );
    }

    // Fetch user from DB excluding password
    const mongoose = require('mongoose');
    let user = null;
    if (mongoose.connection && mongoose.connection.readyState === 1) {
      try {
        user = await User.findById(decoded.id).select('-password');
      } catch (e) {
        user = null;
      }
    }

    if (!user) {
      const { memoryUsers } = require('../controllers/auth.controller');
      user = Array.from(memoryUsers.values()).find(
        (u) => (u._id && u._id.toString() === decoded.id) || (u.id && u.id.toString() === decoded.id)
      );
    }

    if (!user) {
      return errorResponse(
        res,
        'User associated with this session no longer exists.',
        HTTP_STATUS.UNAUTHORIZED,
        'USER_NOT_FOUND'
      );
    }

    // Attach server-verified identity to request object
    req.user = user;
    next();
  } catch (err) {
    return errorResponse(
      res,
      'Authentication verification failed.',
      HTTP_STATUS.UNAUTHORIZED,
      'AUTH_FAILED'
    );
  }
};

/**
 * Role-Based Access Control (RBAC) Middleware
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return errorResponse(
        res,
        'You do not possess authorization to perform this action.',
        HTTP_STATUS.FORBIDDEN,
        'FORBIDDEN'
      );
    }
    next();
  };
};

module.exports = {
  authenticate,
  authorize,
};
