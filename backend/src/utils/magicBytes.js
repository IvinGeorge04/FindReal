const fs = require('fs');

/**
 * Validates file magic bytes (file signature) by reading initial buffer bytes.
 * Treats all client-supplied headers and extensions as untrusted.
 */
const detectMagicBytes = (buffer) => {
  if (!buffer || buffer.length < 12) {
    return { isValid: false, reason: 'File buffer too short for signature validation' };
  }

  // 1. JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return {
      isValid: true,
      type: 'image',
      extension: 'jpg',
      mimeType: 'image/jpeg',
    };
  }

  // 2. PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return {
      isValid: true,
      type: 'image',
      extension: 'png',
      mimeType: 'image/png',
    };
  }

  // 3. WEBP: RIFF (bytes 0-3) + WEBP (bytes 8-11)
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return {
      isValid: true,
      type: 'image',
      extension: 'webp',
      mimeType: 'image/webp',
    };
  }

  // 4. WAV: RIFF (bytes 0-3) + WAVE (bytes 8-11)
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x41 &&
    buffer[10] === 0x56 &&
    buffer[11] === 0x45
  ) {
    return {
      isValid: true,
      type: 'audio',
      extension: 'wav',
      mimeType: 'audio/wav',
    };
  }

  // 5. MP3: ID3 header (49 44 33) or MPEG sync frame (FF FB, FF F3, FF F2)
  if (
    (buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33) ||
    (buffer[0] === 0xff && (buffer[1] === 0xfb || buffer[1] === 0xf3 || buffer[1] === 0xf2))
  ) {
    return {
      isValid: true,
      type: 'audio',
      extension: 'mp3',
      mimeType: 'audio/mpeg',
    };
  }

  // 6. MP4 / MOV / M4A: ftyp signature at offset 4..7 (66 74 79 70)
  if (
    buffer[4] === 0x66 &&
    buffer[5] === 0x74 &&
    buffer[6] === 0x79 &&
    buffer[7] === 0x70
  ) {
    const brand = buffer.toString('utf8', 8, 12).toLowerCase();

    // Audio M4A specific brand
    if (brand.startsWith('m4a') || brand.startsWith('m4b')) {
      return {
        isValid: true,
        type: 'audio',
        extension: 'm4a',
        mimeType: 'audio/mp4',
      };
    }

    // QuickTime MOV brand
    if (brand.startsWith('qt')) {
      return {
        isValid: true,
        type: 'video',
        extension: 'mov',
        mimeType: 'video/quicktime',
      };
    }

    // Standard MP4
    return {
      isValid: true,
      type: 'video',
      extension: 'mp4',
      mimeType: 'video/mp4',
    };
  }

  // 7. WEBM / MKV: EBML header (1A 45 DF A3)
  if (
    buffer[0] === 0x1a &&
    buffer[1] === 0x45 &&
    buffer[2] === 0xdf &&
    buffer[3] === 0xa3
  ) {
    return {
      isValid: true,
      type: 'video',
      extension: 'webm',
      mimeType: 'video/webm',
    };
  }

  return { isValid: false, reason: 'Unrecognized or unsupported file binary signature' };
};

/**
 * Asynchronously inspects the first 64 bytes of a file on disk
 */
const validateFileMagicBytes = async (filePath) => {
  let fileHandle;
  try {
    fileHandle = await fs.promises.open(filePath, 'r');
    const buffer = Buffer.alloc(64);
    const { bytesRead } = await fileHandle.read(buffer, 0, 64, 0);

    if (bytesRead < 8) {
      return { isValid: false, reason: 'File content too small to verify signature' };
    }

    return detectMagicBytes(buffer);
  } catch (err) {
    return { isValid: false, reason: `Failed to read file signature: ${err.message}` };
  } finally {
    if (fileHandle) {
      await fileHandle.close();
    }
  }
};

module.exports = {
  detectMagicBytes,
  validateFileMagicBytes,
};
