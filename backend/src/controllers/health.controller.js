const { getDBStatus } = require('../config/db');
const { successResponse } = require('../utils/apiResponse');

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
  return successResponse(res, {
    status: 'online',
    version: '1.0.0',
    service: 'FindReal API',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    database: getDBStatus(),
    environment: process.env.NODE_ENV || 'development',
  });
};

module.exports = {
  getHello,
  getHealth,
};
