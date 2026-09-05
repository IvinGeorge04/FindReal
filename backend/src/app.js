require('./config/resolveModules');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const config = require('./config/env');
const apiV1Routes = require('./routes');
const notFound = require('./middleware/notFound.middleware');
const errorHandler = require('./middleware/error.middleware');
const AppError = require('./utils/AppError');
const { HTTP_STATUS } = require('./utils/constants');

const app = express();

// 1. Security Headers via Helmet (Do not disable security headers)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: ["'self'", config.clientUrl],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'", 'data:', 'blob:'],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false, // Allows cross-origin media rendering if needed
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// 2. Strict CORS Configuration (Only allow process.env.CLIENT_URL, NEVER origin: "*")
const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests with no origin (e.g. server-to-server or mobile) or requests from CLIENT_URL
    if (!origin || origin === config.clientUrl) {
      callback(null, true);
    } else {
      callback(
        new AppError(
          `CORS policy restricts access from origin: ${origin}`,
          HTTP_STATUS.FORBIDDEN,
          'CORS_PROHIBITED'
        )
      );
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));

// 3. Cookie Parsing Middleware (for HttpOnly JWT authentication)
const cookieParser = require('cookie-parser');
app.use(cookieParser());

// 4. Request Body Limiting (Mitigates payload denial-of-service)
app.use(express.json({ limit: config.bodyLimit }));
app.use(express.urlencoded({ extended: true, limit: config.bodyLimit }));

// 4. Mount API Versioned Route: /api/v1
app.use('/api/v1', apiV1Routes);

// 5. Backwards-compatibility alias for legacy /api routes (e.g. /api/hello)
app.use('/api', apiV1Routes);

// 6. Safe 404 Route Handler
app.use(notFound);

// 7. Centralized Error Handling Middleware
app.use(errorHandler);

module.exports = app;
