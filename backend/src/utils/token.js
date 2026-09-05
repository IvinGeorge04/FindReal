require('../config/resolveModules');
const jwt = require('jsonwebtoken');
const config = require('../config/env');

/**
 * Signs a JWT payload for authenticated session
 */
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    },
    config.jwtSecret,
    {
      expiresIn: config.jwtExpiresIn,
    }
  );
};

/**
 * Sets secure HttpOnly session cookie
 * Enforces:
 * - httpOnly: true (prevents client-side JS access)
 * - sameSite: 'lax' (or 'strict' in production)
 * - secure: true in production (requires HTTPS)
 */
const setAuthCookie = (res, token) => {
  const isProduction = config.isProduction;

  res.cookie('token', token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    path: '/',
  });
};

/**
 * Clears the session cookie on logout
 */
const clearAuthCookie = (res) => {
  const isProduction = config.isProduction;

  res.cookie('token', '', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    expires: new Date(0),
    path: '/',
  });
};

module.exports = {
  generateToken,
  setAuthCookie,
  clearAuthCookie,
};
