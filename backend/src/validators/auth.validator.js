require('../config/resolveModules');
const { z } = require('zod');
const { errorResponse } = require('../utils/apiResponse');
const { HTTP_STATUS } = require('../utils/constants');

// Registration Schema with password complexity requirements
const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters long')
    .max(50, 'Name must not exceed 50 characters'),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Please provide a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .max(128, 'Password must not exceed 128 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

// Login Schema
const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Please provide a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required'),
});

/**
 * Higher-order middleware to validate request body with Zod
 */
const validateBody = (schema) => (req, res, next) => {
  try {
    const validated = schema.parse(req.body);
    req.body = validated;
    next();
  } catch (err) {
    if (err instanceof z.ZodError) {
      const firstError = err.errors[0]?.message || 'Validation failed';
      return errorResponse(res, firstError, HTTP_STATUS.BAD_REQUEST, 'VALIDATION_ERROR');
    }
    return errorResponse(res, 'Malformed request payload', HTTP_STATUS.BAD_REQUEST, 'MALFORMED_REQUEST');
  }
};

module.exports = {
  registerSchema,
  loginSchema,
  validateBody,
};
