const { getDBStatus } = require('../config/db');
const { isGroqAvailable, checkGroqConnectivity, PRIMARY_MODEL } = require('../services/groq.service');
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
  const groqStatus = isGroqAvailable();
  return successResponse(res, {
    status: 'online',
    version: '1.0.0',
    service: 'FindReal API',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    database: getDBStatus(),
    groq: {
      configured: groqStatus.available,
      model: PRIMARY_MODEL,
    },
    // Backwards-compatibility alias for existing health monitors
    gemini: {
      configured: groqStatus.available,
      model: PRIMARY_MODEL,
    },
    environment: process.env.NODE_ENV || 'development',
  });
};

/**
 * Safe Groq Health Check Diagnostic
 * GET /api/v1/health/groq
 * Never returns API keys, credentials, or internal headers.
 */
const getGroqHealth = async (req, res) => {
  try {
    const diagnostic = await checkGroqConnectivity();
    const status = diagnostic.requestSuccess ? HTTP_STATUS.OK : (diagnostic.errorStatus || HTTP_STATUS.SERVICE_UNAVAILABLE);

    return res.status(status).json({
      success: diagnostic.requestSuccess,
      data: {
        provider: 'groq',
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
        provider: 'groq',
        sdkAvailable: false,
        apiKeyConfigured: false,
        configuredModel: PRIMARY_MODEL,
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
  getGroqHealth,
  // Backwards compatibility alias
  getGeminiHealth: getGroqHealth,
};
