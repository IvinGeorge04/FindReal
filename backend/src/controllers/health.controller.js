const { getDBStatus } = require('../config/db');
const { isGeminiAvailable, checkGeminiConnectivity } = require('../services/gemini.service');
const { successResponse } = require('../utils/apiResponse');
const { HTTP_STATUS } = require('../utils/constants');

/**
 * Preserves exact legacy /api/hello response for existing client health checks
 */
const getHello = (req, res) => {
  res.json({ message: "Hello from backend!" });
};

/**
 * System Diagnostics Endpoint (conforms to standard response schema)
 */
const getHealth = (req, res) => {
  const geminiStatus = isGeminiAvailable();
  return successResponse(res, {
    status: 'online',
    version: '1.0.0',
    service: 'FindReal API',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    database: getDBStatus(),
    gemini: {
      configured: geminiStatus.available,
    },
    environment: process.env.NODE_ENV || 'development',
  });
};

/**
 * Safe Gemini Health Check Diagnostic
 * GET /api/v1/health/gemini
 * Never returns API keys, credentials, or internal headers.
 */
const getGeminiHealth = async (req, res) => {
  try {
    const connectivity = await checkGeminiConnectivity();

    if (!connectivity.configured) {
      return res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({
        success: false,
        data: {
          configured: false,
        },
      });
    }

    if (!connectivity.available) {
      return res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({
        success: false,
        data: {
          configured: true,
          available: false,
        },
      });
    }

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        configured: true,
        available: true,
      },
    });
  } catch (err) {
    return res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({
      success: false,
      data: {
        configured: false,
        available: false,
      },
    });
  }
};

module.exports = {
  getHello,
  getHealth,
  getGeminiHealth,
};
