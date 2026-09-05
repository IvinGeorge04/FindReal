require('./resolveModules');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from backend/.env and fallback root .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const rawClientUrl = process.env.CLIENT_URL || 'https://find-real-nops.vercel.app';
const clientUrl = rawClientUrl.replace(/\/+$/, '');

const isProduction = process.env.NODE_ENV === 'production';

// In production, require critical secrets from environment variables
if (isProduction) {
  if (!process.env.MONGODB_URI) {
    throw new Error('FATAL SECURITY ERROR: MONGODB_URI must be provided in environment variables in production.');
  }
  if (!process.env.JWT_SECRET) {
    throw new Error('FATAL SECURITY ERROR: JWT_SECRET must be provided in environment variables in production.');
  }
}

const config = {
  env: process.env.NODE_ENV || 'development',
  isProduction,
  port: parseInt(process.env.PORT || '5000', 10),
  clientUrl,
  backendUrl: (process.env.BACKEND_URL || 'https://findreal.onrender.com').replace(/\/+$/, ''),
  mongoUri: process.env.MONGODB_URI || '',
  bodyLimit: process.env.BODY_LIMIT || '10mb',
  jwtSecret: process.env.JWT_SECRET || (isProduction ? '' : 'findreal_dev_only_jwt_secret_not_for_prod'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-3.6-flash',
  apiPrefix: '/api/v1',
};

// Validate critical configurations
if (config.isProduction && !process.env.CLIENT_URL) {
  console.warn('[Security Warning] CLIENT_URL not explicitly set in production environment.');
}

module.exports = config;
