const fs = require('fs');
const path = require('path');

/**
 * Safely removes a file from disk without throwing uncaught errors
 */
const deleteFileSafely = async (filePath) => {
  if (!filePath) return false;
  try {
    await fs.promises.unlink(filePath);
    return true;
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.warn(`[Cleanup Warning] Failed to delete file at ${filePath}: ${err.message}`);
    }
    return false;
  }
};

/**
 * Sanitizes original filename:
 * - Strips directory traversal sequences (../, ..\, etc.)
 * - Strips null bytes (\0)
 * - Restricts characters to safe alphanumeric, dots, dashes, underscores
 */
const sanitizeOriginalFilename = (rawName) => {
  if (!rawName || typeof rawName !== 'string') {
    return 'unnamed_media_asset';
  }

  // Remove path separators and null bytes
  const base = path.basename(rawName).replace(/\0/g, '').trim();

  // Strip non-standard characters
  const sanitized = base.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 120);

  return sanitized || 'unnamed_media_asset';
};

/**
 * Scans a directory and deletes files older than maxAgeMs
 */
const purgeOldTempFiles = async (directory, maxAgeMs = 2 * 60 * 60 * 1000) => {
  try {
    const exists = fs.existsSync(directory);
    if (!exists) return;

    const files = await fs.promises.readdir(directory);
    const now = Date.now();

    for (const file of files) {
      const fullPath = path.join(directory, file);
      try {
        const stats = await fs.promises.stat(fullPath);
        if (now - stats.mtimeMs > maxAgeMs) {
          await fs.promises.unlink(fullPath);
        }
      } catch (e) {
        // Continue cleaning remaining files
      }
    }
  } catch (err) {
    console.warn(`[Cleanup Warning] Directory purge error: ${err.message}`);
  }
};

module.exports = {
  deleteFileSafely,
  sanitizeOriginalFilename,
  purgeOldTempFiles,
};
