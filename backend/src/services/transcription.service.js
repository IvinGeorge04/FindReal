require('../config/resolveModules');
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const { deleteFileSafely } = require('../utils/cleanup');

let whisperCache = null;

const SUPPORTED_AUDIO_EXTENSIONS = new Set(['.mp3', '.wav', '.m4a']);

/**
 * Validates that a file path is safe and does not contain traversal patterns
 */
const sanitizePath = (targetPath) => {
  if (!targetPath || typeof targetPath !== 'string') {
    throw new Error('Invalid path provided for transcription.');
  }
  const resolved = path.resolve(targetPath);
  if (resolved.includes('\0')) {
    throw new Error('Null-byte attack detected in path.');
  }
  return resolved;
};

/**
 * Checks whether the local Whisper CLI tool is installed in system PATH
 */
const checkWhisperAvailability = async () => {
  if (whisperCache !== null) {
    return whisperCache;
  }

  return new Promise((resolve) => {
    execFile('whisper', ['--help'], { timeout: 4000 }, (error) => {
      if (error) {
        whisperCache = {
          available: false,
          version: null,
          reason: 'Local Whisper speech-to-text CLI is not installed in system PATH.',
        };
      } else {
        whisperCache = {
          available: true,
          version: 'installed',
        };
      }
      resolve(whisperCache);
    });
  });
};

/**
 * Optional local speech transcription for MP3, WAV, M4A
 *
 * CRITICAL FAULT-TOLERANCE RULES:
 * 1. If Whisper is unavailable, this returns a controlled unavailable status.
 * 2. If Whisper fails or times out, this function catches the error and returns a controlled result.
 * 3. The analysis pipeline MUST NOT fail because transcription is unavailable or encounters an error.
 *
 * @param {string} audioPath - Path to verified audio file (MP3, WAV, M4A)
 * @param {string} tempDir - Directory for ephemeral transcript files
 * @returns {Promise<Object>} Transcription result
 */
const transcribeAudio = async (audioPath, tempDir) => {
  let safeAudioPath;
  let safeTempDir;

  try {
    safeAudioPath = sanitizePath(audioPath);
    safeTempDir = sanitizePath(tempDir);
  } catch (pathErr) {
    return {
      status: 'INVALID_PATH',
      available: false,
      transcript: null,
      message: 'Unsafe or invalid file path provided.',
      note: 'Analysis pipeline continues uninterrupted.',
    };
  }

  // Check supported extension (MP3, WAV, M4A)
  const ext = path.extname(safeAudioPath).toLowerCase();
  if (!SUPPORTED_AUDIO_EXTENSIONS.has(ext)) {
    return {
      status: 'UNSUPPORTED_FORMAT',
      available: false,
      transcript: null,
      message: `Unsupported audio format for transcription: ${ext}. Supported: MP3, WAV, M4A.`,
      note: 'Analysis pipeline continues uninterrupted.',
    };
  }

  // 1. Verify file accessibility
  try {
    await fs.promises.access(safeAudioPath, fs.constants.R_OK);
  } catch (err) {
    return {
      status: 'FILE_INACCESSIBLE',
      available: false,
      transcript: null,
      message: 'Audio asset could not be accessed for transcription.',
      note: 'Analysis pipeline continues uninterrupted.',
    };
  }

  // 2. Check local Whisper availability
  const toolCheck = await checkWhisperAvailability();
  if (!toolCheck.available) {
    return {
      status: 'UNAVAILABLE',
      available: false,
      transcript: null,
      message: toolCheck.reason,
      note: 'Speech-to-text transcription is optional. Analysis continues without acoustic transcript.',
    };
  }

  // 3. Execute Whisper safely using argument array (no shell command interpolation)
  return new Promise((resolve) => {
    execFile(
      'whisper',
      [
        safeAudioPath,
        '--model', 'base',
        '--output_format', 'json',
        '--output_dir', safeTempDir,
      ],
      { timeout: 45000 }, // 45s bounded timeout to prevent runaway execution
      async (error, stdout) => {
        if (error) {
          // Gracefully report failure without stopping overall analysis
          return resolve({
            status: 'FAILED',
            available: true,
            transcript: null,
            message: `Whisper transcription failed: ${error.message}`,
            note: 'Analysis pipeline continues uninterrupted.',
          });
        }

        // Try reading generated output JSON
        const possibleJsonPath = path.join(safeTempDir, `${path.parse(safeAudioPath).name}.json`);

        try {
          if (fs.existsSync(possibleJsonPath)) {
            const raw = await fs.promises.readFile(possibleJsonPath, 'utf8');
            const data = JSON.parse(raw);
            await deleteFileSafely(possibleJsonPath); // Ephemeral cleanup

            return resolve({
              status: 'SUCCESS',
              available: true,
              transcript: data.text ? data.text.trim() : null,
              segments: Array.isArray(data.segments)
                ? data.segments.map((s) => ({ start: s.start, end: s.end, text: s.text }))
                : [],
            });
          }

          // Fallback to stdout text if JSON wasn't written
          return resolve({
            status: 'SUCCESS',
            available: true,
            transcript: stdout ? stdout.trim() : null,
          });
        } catch (readErr) {
          return resolve({
            status: 'OUTPUT_PARSE_ERROR',
            available: true,
            transcript: null,
            message: 'Failed to read Whisper output structure.',
            note: 'Analysis pipeline continues uninterrupted.',
          });
        }
      }
    );
  });
};

module.exports = {
  checkWhisperAvailability,
  transcribeAudio,
  SUPPORTED_AUDIO_EXTENSIONS,
};
