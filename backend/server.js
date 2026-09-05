const app = require('./src/app');
const config = require('./src/config/env');
const { connectDB, closeDB } = require('./src/config/db');

// Connect to MongoDB
connectDB();

const server = app.listen(config.port, () => {
  console.log(`[Server] FindReal backend running in ${config.env} mode on port ${config.port}`);
  console.log(`[Server] Backend URL: ${config.backendUrl}`);
  console.log(`[Server] Allowed Frontend: ${config.clientUrl}`);
  console.log(`[Server] API v1 root: ${config.backendUrl}${config.apiPrefix}`);
});

// Graceful shutdown handling
const handleShutdown = async (signal) => {
  console.log(`\n[Server] Received ${signal}. Initiating graceful shutdown...`);
  server.close(async () => {
    console.log('[Server] HTTP server closed.');
    await closeDB();
    process.exit(0);
  });
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));