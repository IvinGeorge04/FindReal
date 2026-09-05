require('./resolveModules');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const config = {
  env: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  port: parseInt(process.env.PORT || '5000', 10),
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/findreal',
  bodyLimit: process.env.BODY_LIMIT || '10mb',
  jwtSecret: process.env.JWT_SECRET || 'findreal_dev_jwt_secret_key_change_in_production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  apiPrefix: '/api/v1',
};

// Validate critical configurations
if (config.isProduction && !process.env.CLIENT_URL) {
  console.warn('[Security Warning] CLIENT_URL not explicitly set in production environment.');
}

module.exports = config;
