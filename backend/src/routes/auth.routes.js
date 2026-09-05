const express = require('express');
const router = express.Router();
const { register, login, logout, getMe } = require('../controllers/auth.controller');
const { registerSchema, loginSchema, validateBody } = require('../validators/auth.validator');
const { loginLimiter, registerLimiter } = require('../middleware/rateLimiter.middleware');
const { authenticate } = require('../middleware/auth.middleware');

// Public Auth Endpoints with Rate Limiting & Zod Validation
router.post('/register', registerLimiter, validateBody(registerSchema), register);
router.post('/login', loginLimiter, validateBody(loginSchema), login);
router.post('/logout', logout);

// Authenticated Session Endpoint
router.get('/me', authenticate, getMe);

module.exports = router;
