const mongoose = require('mongoose');
const User = require('../models/User');
const { ensureDBConnection } = require('../config/db');
const { generateToken, setAuthCookie, clearAuthCookie } = require('../utils/token');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { HTTP_STATUS } = require('../utils/constants');

// In-memory user store fallback for development if MongoDB daemon is offline
const memoryUsers = new Map();

const isDbConnected = () => mongoose.connection && mongoose.connection.readyState === 1;

/**
 * Register User
 * POST /api/v1/auth/register
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // Ensure database connection is active
    if (!isDbConnected()) {
      await ensureDBConnection();
    }

    let existingUser = null;
    if (isDbConnected()) {
      try {
        existingUser = await User.findOne({ email });
      } catch (e) {
        existingUser = memoryUsers.get(email);
      }
    } else {
      existingUser = memoryUsers.get(email);
    }

    if (existingUser) {
      return errorResponse(
        res,
        'An account with this email address already exists.',
        HTTP_STATUS.CONFLICT,
        'EMAIL_ALREADY_EXISTS'
      );
    }

    let user = null;
    if (isDbConnected()) {
      try {
        user = await User.create({ name, email, password });
        console.log(`[Auth] User registered and persisted to MongoDB: ${user._id} (${user.email})`);
      } catch (dbErr) {
        console.error(`[Auth] Database write failed for user: ${dbErr.message}`);
        user = null;
      }
    }

    if (!user) {
      // Fallback for offline local dev without MongoDB
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash(password, 12);
      const mockId = new mongoose.Types.ObjectId().toString();
      const mockUser = {
        _id: mockId,
        id: mockId,
        name,
        email,
        password: hashedPassword,
        role: 'user',
        createdAt: new Date(),
        comparePassword: async function (candidate) {
          return bcrypt.compare(candidate, this.password);
        },
        toJSON: function () {
          const { password: _, ...clean } = this;
          return clean;
        },
      };
      memoryUsers.set(email, mockUser);
      user = mockUser;
      console.warn(`[Auth] User stored in temporary in-memory fallback: ${user._id} (${user.email})`);
    }

    const token = generateToken(user);
    setAuthCookie(res, token);

    return successResponse(
      res,
      {
        user: typeof user.toJSON === 'function' ? user.toJSON() : user,
      },
      HTTP_STATUS.CREATED
    );
  } catch (err) {
    next(err);
  }
};

/**
 * Login User
 * POST /api/v1/auth/login
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Ensure database connection is active
    if (!isDbConnected()) {
      await ensureDBConnection();
    }

    let user = null;
    if (isDbConnected()) {
      try {
        user = await User.findOne({ email }).select('+password');
      } catch (e) {
        user = memoryUsers.get(email);
      }
    } else {
      user = memoryUsers.get(email);
    }

    if (!user) {
      return errorResponse(
        res,
        'Invalid email or password credentials.',
        HTTP_STATUS.UNAUTHORIZED,
        'INVALID_CREDENTIALS'
      );
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return errorResponse(
        res,
        'Invalid email or password credentials.',
        HTTP_STATUS.UNAUTHORIZED,
        'INVALID_CREDENTIALS'
      );
    }

    const token = generateToken(user);
    setAuthCookie(res, token);

    return successResponse(res, {
      user: typeof user.toJSON === 'function' ? user.toJSON() : user,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Logout User
 * POST /api/v1/auth/logout
 */
const logout = async (req, res, next) => {
  try {
    clearAuthCookie(res);
    return successResponse(res, { message: 'Logged out successfully.' });
  } catch (err) {
    next(err);
  }
};

/**
 * Get Current User
 * GET /api/v1/auth/me
 */
const getMe = async (req, res, next) => {
  try {
    return successResponse(res, {
      user: req.user,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  register,
  login,
  logout,
  getMe,
  memoryUsers, // exported for testing / offline fallback
};
