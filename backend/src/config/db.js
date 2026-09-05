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

const connectDB = async () => {
  if (!mongoose) {
    console.warn('[Database] Mongoose package unavailable in current resolution path.');
    return false;
  }

  if (isConnected) {
    return true;
  }

  try {
    const maskedUri = maskMongoUri(config.mongoUri);
    console.log(`[Database] Connecting to MongoDB at: ${maskedUri}`);

    const conn = await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });

    isConnected = true;
    console.log(`[Database] MongoDB Connected successfully: ${conn.connection.host}`);

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
    console.warn(`[Database] MongoDB connection unavailable (${error.message}). Continuing in non-persistent dev mode.`);
    isConnected = false;
    return false;
  }
};

const getDBStatus = () => {
  if (!mongoose) return 'Driver unavailable';
  return isConnected ? 'Connected' : 'Disconnected';
};

const closeDB = async () => {
  if (mongoose && isConnected) {
    await mongoose.connection.close();
    isConnected = false;
    console.log('[Database] MongoDB connection closed gracefully.');
  }
};

module.exports = {
  connectDB,
  getDBStatus,
  closeDB,
};
