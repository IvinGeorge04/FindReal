require('../config/resolveModules');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { errorResponse } = require('../utils/apiResponse');
const { HTTP_STATUS } = require('../utils/constants');

// Isolated temporary directory located completely outside the public web root
const TEMP_STORAGE_DIR = path.resolve(__dirname, '../../uploads/temp');

// Ensure directory exists with restricted access
if (!fs.existsSync(TEMP_STORAGE_DIR)) {
  fs.mkdirSync(TEMP_STORAGE_DIR, { recursive: true, mode: 0o700 });
}

// Configure storage with random server-side identifiers
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, TEMP_STORAGE_DIR);
  },
  filename: (req, file, cb) => {
    // Generate secure random UUID; never use client-supplied originalname in filesystem
    const randomId = crypto.randomUUID();
    cb(null, `${randomId}.tmp`);
  },
});

// Dangerous / executable extension blacklist
const DANGEROUS_EXTENSIONS = [
  'exe', 'bat', 'cmd', 'sh', 'php', 'phtml', 'js', 'vbs', 'scr', 'msi',
  'dll', 'com', 'jar', 'apk', 'bin', 'py', 'pl', 'cgi', 'asp', 'aspx',
];

const fileFilter = (req, file, cb) => {
  const original = (file.originalname || '').toLowerCase();

  // Guard against null-byte and path manipulation in headers
  if (original.includes('\0') || original.includes('..') || original.includes('/') || original.includes('\\')) {
    return cb(new Error('SUSPICIOUS_FILENAME_FORMAT'));
  }

  // Pre-filter dangerous executable extensions
  const ext = original.split('.').pop() || '';
  if (DANGEROUS_EXTENSIONS.includes(ext)) {
    return cb(new Error('DISALLOWED_EXECUTABLE_FORMAT'));
  }

  cb(null, true);
};

// Multer upload instance
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB ceiling
    files: 1, // Single media item per upload request
  },
});

/**
 * Express middleware wrapper to catch Multer errors gracefully
 */
const handleUpload = (fieldName = 'media') => {
  const singleUpload = upload.single(fieldName);

  return (req, res, next) => {
    singleUpload(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return errorResponse(
            res,
            'Uploaded file exceeds maximum allowed limit of 50MB.',
            HTTP_STATUS.BAD_REQUEST,
            'FILE_TOO_LARGE'
          );
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return errorResponse(
            res,
            'Unexpected field name or multiple files uploaded. Expected single "media" field.',
            HTTP_STATUS.BAD_REQUEST,
            'UNEXPECTED_FIELD'
          );
        }
        if (err.message === 'DISALLOWED_EXECUTABLE_FORMAT' || err.message === 'SUSPICIOUS_FILENAME_FORMAT') {
          return errorResponse(
            res,
            'Potentially hazardous or malformed file rejected.',
            HTTP_STATUS.BAD_REQUEST,
            'REJECTED_UNTRUSTED_FILE'
          );
        }
        return errorResponse(
          res,
          `File upload error: ${err.message}`,
          HTTP_STATUS.BAD_REQUEST,
          'UPLOAD_FAILED'
        );
      }
      next();
    });
  };
};

module.exports = {
  handleUpload,
  TEMP_STORAGE_DIR,
};
