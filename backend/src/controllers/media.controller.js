require('../config/resolveModules');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const Media = require('../models/Media');
const { validateFileMagicBytes } = require('../utils/magicBytes');
const { deleteFileSafely, sanitizeOriginalFilename } = require('../utils/cleanup');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { HTTP_STATUS } = require('../utils/constants');
const { TEMP_STORAGE_DIR } = require('../middleware/upload.middleware');

// In-memory media store fallback for development when MongoDB is offline
const memoryMedia = new Map();

const isDbConnected = () => mongoose.connection && mongoose.connection.readyState === 1;

/**
 * Upload Media Asset
 * POST /api/v1/media/upload
 * Treats every uploaded file as malicious and untrusted until binary validation succeeds.
 */
const uploadMedia = async (req, res, next) => {
  let uploadedFilePath = req.file?.path;

  try {
    // 1. Ensure file was received
    if (!req.file) {
      return errorResponse(
        res,
        'No media file was provided in the upload request.',
        HTTP_STATUS.BAD_REQUEST,
        'NO_FILE_PROVIDED'
      );
    }

    const currentUserId = req.user ? (req.user._id || req.user.id) : null;

    // 2. Authoritative Magic-Byte / Binary Signature Verification
    // Never trust req.file.mimetype or req.file.originalname
    const signatureResult = await validateFileMagicBytes(uploadedFilePath);

    if (!signatureResult.isValid) {
      // Immediately purge untrusted file from isolated storage
      await deleteFileSafely(uploadedFilePath);
      return errorResponse(
        res,
        `File verification rejected: ${signatureResult.reason}. Expected valid image, audio, or video container.`,
        HTTP_STATUS.BAD_REQUEST,
        'INVALID_FILE_SIGNATURE'
      );
    }

    // 3. Construct Safe Random Stored Identifier
    const storedIdentifier = crypto.randomUUID();
    const finalStoredFilename = `${storedIdentifier}.${signatureResult.extension}`;
    const finalStoredPath = path.join(TEMP_STORAGE_DIR, finalStoredFilename);

    // 4. Rename from .tmp to verified extension
    await fs.promises.rename(uploadedFilePath, finalStoredPath);
    uploadedFilePath = finalStoredPath;

    // 5. Sanitize Original Filename for human display only (never in filesystem)
    const cleanOriginalName = sanitizeOriginalFilename(req.file.originalname);

    // 6. Create Media Record
    let media = null;
    if (isDbConnected()) {
      try {
        media = await Media.create({
          userId: currentUserId,
          type: signatureResult.type,
          originalName: cleanOriginalName,
          storedIdentifier,
          filePath: finalStoredPath,
          mimeType: signatureResult.mimeType,
          extension: signatureResult.extension,
          size: req.file.size,
          status: 'uploaded',
        });
      } catch (dbErr) {
        media = null;
      }
    }

    if (!media) {
      // In-memory fallback if MongoDB daemon is disconnected
      const mockId = 'med_' + Date.now();
      const mockMedia = {
        _id: mockId,
        id: mockId,
        userId: currentUserId,
        type: signatureResult.type,
        originalName: cleanOriginalName,
        storedIdentifier,
        filePath: finalStoredPath,
        mimeType: signatureResult.mimeType,
        extension: signatureResult.extension,
        size: req.file.size,
        status: 'uploaded',
        createdAt: new Date(),
        toJSON: function () {
          const { filePath: _, ...safe } = this;
          return safe;
        },
      };
      memoryMedia.set(storedIdentifier, mockMedia);
      media = mockMedia;
    }

    // 7. Return Standard Success Response
    return successResponse(
      res,
      {
        mediaId: media._id || media.id,
        identifier: media.storedIdentifier,
        type: media.type,
        originalName: media.originalName,
        mimeType: media.mimeType,
        extension: media.extension,
        size: media.size,
        status: media.status,
      },
      HTTP_STATUS.CREATED
    );
  } catch (err) {
    // Purge file on unexpected error to prevent storage leaks
    if (uploadedFilePath) {
      await deleteFileSafely(uploadedFilePath);
    }
    next(err);
  }
};

/**
 * Ingest Media from Remote URL with SSRF Protection
 * POST /api/v1/media/url
 */
const uploadMediaFromUrl = async (req, res, next) => {
  const { url } = req.body;
  if (!url || typeof url !== 'string') {
    return errorResponse(res, 'Valid URL is required.', HTTP_STATUS.BAD_REQUEST, 'INVALID_URL');
  }

  const currentUserId = req.user ? (req.user._id || req.user.id) : null;
  const tempIdentifier = crypto.randomUUID();
  const tempDownloadPath = path.join(TEMP_STORAGE_DIR, `${tempIdentifier}.tmp`);

  try {
    const { downloadMediaSafely } = require('../utils/ssrfProtection');
    const mongoose = require('mongoose');

    // 1. SSRF Validation and Safe Download
    const downloadResult = await downloadMediaSafely(url, tempDownloadPath, {
      maxRedirects: 3,
      maxBytes: 50 * 1024 * 1024,
      timeoutMs: 15000,
    });

    // 2. Authoritative Magic-Byte / Binary Signature Verification
    const signatureResult = await validateFileMagicBytes(tempDownloadPath);

    if (!signatureResult.isValid) {
      await deleteFileSafely(tempDownloadPath);
      return errorResponse(
        res,
        `Downloaded file failed verification: ${signatureResult.reason}. Must be valid image, audio, or video container.`,
        HTTP_STATUS.BAD_REQUEST,
        'INVALID_FILE_SIGNATURE'
      );
    }

    // 3. Rename to verified extension
    const finalStoredFilename = `${tempIdentifier}.${signatureResult.extension}`;
    const finalStoredPath = path.join(TEMP_STORAGE_DIR, finalStoredFilename);
    await fs.promises.rename(tempDownloadPath, finalStoredPath);

    // 4. Derive clean display filename
    let parsedFilename = 'remote_media';
    try {
      const urlObj = new URL(url);
      const base = path.basename(urlObj.pathname);
      if (base && base.length > 2) parsedFilename = base;
    } catch {}
    const cleanOriginalName = sanitizeOriginalFilename(parsedFilename);

    // 5. Create Media Record
    let media = null;
    const isDbConnected = mongoose.connection && mongoose.connection.readyState === 1;
    if (isDbConnected) {
      try {
        media = await Media.create({
          userId: currentUserId,
          type: signatureResult.type,
          originalName: cleanOriginalName,
          storedIdentifier: tempIdentifier,
          filePath: finalStoredPath,
          mimeType: signatureResult.mimeType,
          extension: signatureResult.extension,
          size: downloadResult.sizeBytes,
          status: 'uploaded',
        });
      } catch (dbErr) {
        media = null;
      }
    }

    if (!media) {
      const mockId = 'med_' + Date.now();
      media = {
        _id: mockId,
        id: mockId,
        userId: currentUserId,
        type: signatureResult.type,
        originalName: cleanOriginalName,
        storedIdentifier: tempIdentifier,
        filePath: finalStoredPath,
        mimeType: signatureResult.mimeType,
        extension: signatureResult.extension,
        size: downloadResult.sizeBytes,
        status: 'uploaded',
        createdAt: new Date(),
        toJSON: function () {
          const { filePath: _, ...safe } = this;
          return safe;
        },
      };
      memoryMedia.set(tempIdentifier, media);
    }

    return successResponse(
      res,
      {
        mediaId: media._id || media.id,
        identifier: media.storedIdentifier,
        type: media.type,
        originalName: media.originalName,
        mimeType: media.mimeType,
        extension: media.extension,
        size: media.size,
        status: media.status,
      },
      HTTP_STATUS.CREATED
    );
  } catch (err) {
    if (fs.existsSync(tempDownloadPath)) {
      await deleteFileSafely(tempDownloadPath);
    }
    return errorResponse(
      res,
      `URL ingestion failed: ${err.message}`,
      HTTP_STATUS.BAD_REQUEST,
      'URL_DOWNLOAD_FAILED'
    );
  }
};

module.exports = {
  uploadMedia,
  uploadMediaFromUrl,
  memoryMedia,
};
