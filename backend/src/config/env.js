require('./resolveModules');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const rawClientUrl = process.env.CLIENT_URL || 'https://find-real-nops.vercel.app';
const clientUrl = rawClientUrl.replace(/\/+$/, '');

const config = {
  env: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  port: parseInt(process.env.PORT || '5000', 10),
  clientUrl,
  backendUrl: (process.env.BACKEND_URL || 'https://findreal.onrender.com').replace(/\/+$/, ''),
  mongoUri: process.env.MONGODB_URI || 'mongodb+srv://igfigma:figma@sjcet-website.aij6tqd.mongodb.net/findreal?retryWrites=true&w=majority&appName=SJCET-website',
  bodyLimit: process.env.BODY_LIMIT || '10mb',
  jwtSecret: process.env.JWT_SECRET || 'findreal_dev_jwt_secret_key_change_in_production',
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
