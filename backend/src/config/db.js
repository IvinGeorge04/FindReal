require('./resolveModules');
let mongoose;
try {
  mongoose = require('mongoose');
} catch (e) {
  mongoose = null;
}

const config = require('./env');

let isConnected = false;

/**
 * Mask connection URI to prevent leaking credentials in logs
 */
const maskMongoUri = (uri) => {
  try {
    return uri.replace(/\/\/(.*):(.*)@/, '//***:***@');
  } catch (e) {
    return 'mongodb://[credentials-masked]';
  }
};

let lastConnectAttempt = 0;
const RECONNECT_COOLDOWN_MS = 30000;

const connectDB = async (retries = 2) => {
  if (!mongoose) {
    console.warn('[Database] Mongoose package unavailable in current resolution path.');
    return false;
  }

  if (isConnected && mongoose.connection.readyState === 1) {
    return true;
  }

  lastConnectAttempt = Date.now();

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const maskedUri = maskMongoUri(config.mongoUri);
      console.log(`[Database] Connecting to MongoDB Atlas: ${maskedUri} (attempt ${attempt}/${retries})`);

      const conn = await mongoose.connect(config.mongoUri, {
        serverSelectionTimeoutMS: 5000,
        dbName: 'findreal',
      });

      isConnected = true;
      console.log(`[Database] MongoDB Connected successfully to database "${conn.connection.name}" at: ${conn.connection.host}`);

      mongoose.connection.on('disconnected', () => {
        isConnected = false;
        console.warn('[Database] MongoDB disconnected.');
      });

      mongoose.connection.on('error', (err) => {
        isConnected = false;
        console.error('[Database] MongoDB connection error:', err.message);
      });

      return true;
    } catch (error) {
      console.warn(`[Database] MongoDB connection attempt ${attempt} failed: ${error.message}`);
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  }

  console.warn('[Database] MongoDB connection unavailable after attempts. Continuing with in-memory fallback.');
  isConnected = false;
  return false;
};

const ensureDBConnection = async () => {
  if (mongoose && mongoose.connection && mongoose.connection.readyState === 1) {
    return true;
  }
  if (Date.now() - lastConnectAttempt < RECONNECT_COOLDOWN_MS) {
    return false;
  }
  return connectDB(1);
};

const getDBStatus = () => {
  if (!mongoose) return 'Driver unavailable';
  return mongoose.connection && mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected';
};

const closeDB = async () => {
  if (mongoose && mongoose.connection && mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
    isConnected = false;
    console.log('[Database] MongoDB connection closed gracefully.');
  }
};

module.exports = {
  connectDB,
  ensureDBConnection,
  getDBStatus,
  closeDB,
};

