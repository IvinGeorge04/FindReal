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
    const diagnostic = await checkGeminiConnectivity();
    const status = diagnostic.requestSuccess ? HTTP_STATUS.OK : HTTP_STATUS.SERVICE_UNAVAILABLE;

    return res.status(status).json({
      success: diagnostic.requestSuccess,
      data: {
        sdkAvailable: diagnostic.sdkAvailable,
        apiKeyConfigured: diagnostic.apiKeyConfigured,
        configuredModel: diagnostic.configuredModel,
        requestSuccess: diagnostic.requestSuccess,
        errorCategory: diagnostic.errorCategory,
        errorStatus: diagnostic.errorStatus,
        errorMessage: diagnostic.errorMessage,
      },
    });
  } catch (err) {
    return res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({
      success: false,
      data: {
        sdkAvailable: false,
        apiKeyConfigured: false,
        configuredModel: null,
        requestSuccess: false,
        errorCategory: 'INTERNAL_ERROR',
        errorStatus: 500,
        errorMessage: 'Health diagnostic encountered an internal error.',
      },
    });
  }
};

module.exports = {
  getHello,
  getHealth,
  getGeminiHealth,
};
