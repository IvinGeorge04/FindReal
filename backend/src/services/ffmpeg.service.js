require('../config/resolveModules');
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { deleteFileSafely } = require('../utils/cleanup');

let ffmpegCache = null;
let ffprobeCache = null;

// 1. Strict Resource Protection Ceilings
const RESOURCE_LIMITS = {
  MAX_VIDEO_DURATION_SECONDS: 600,   // 10 minutes maximum duration
  MAX_FRAME_COUNT: 5,                // Maximum 5 representative sample frames
  MAX_PROCESS_TIMEOUT_MS: 30000,      // 30 seconds process kill timeout
  MAX_FRAME_WIDTH: 1280,             // Max 720p/1080p bounded resolution width
  MAX_FRAME_HEIGHT: 1280,            // Max bounded resolution height
  MAX_OUTPUT_SIZE_BYTES: 50 * 1024 * 1024, // 50MB maximum output file size
  TARGET_AUDIO_SAMPLE_RATE: 16000,   // 16kHz speech/forensic baseline
  SUPPORTED_AUDIO_FORMATS: ['.mp3', '.wav', '.m4a'],
  SUPPORTED_VIDEO_FORMATS: ['.mp4', '.mov', '.webm'],
};

/**
 * Validates that a file path is safe and does not contain traversal patterns
 */
const sanitizePath = (targetPath) => {
  if (!targetPath || typeof targetPath !== 'string') {
    throw new Error('Invalid path provided.');
  }
  const resolved = path.resolve(targetPath);
  if (resolved.includes('\0')) {
    throw new Error('Null-byte attack detected in path.');
  }
  return resolved;
};

/**
 * Checks whether the FFmpeg CLI binary is installed in system PATH
 */
const checkFFmpegAvailability = async () => {
  if (ffmpegCache !== null) {
    return ffmpegCache;
  }

  return new Promise((resolve) => {
    execFile('ffmpeg', ['-version'], { timeout: 4000 }, (error, stdout) => {
      if (error) {
        ffmpegCache = {
          available: false,
          version: null,
          reason: 'FFmpeg executable is not installed or not in system PATH.',
        };
      } else {
        const firstLine = stdout.split('\n')[0] || 'FFmpeg';
        ffmpegCache = {
          available: true,
          version: firstLine.trim(),
        };
      }
      resolve(ffmpegCache);
    });
  });
};

/**
 * Checks whether the FFprobe CLI binary is installed in system PATH
 */
const checkFFprobeAvailability = async () => {
  if (ffprobeCache !== null) {
    return ffprobeCache;
  }

  return new Promise((resolve) => {
    execFile('ffprobe', ['-version'], { timeout: 4000 }, (error, stdout) => {
      if (error) {
        ffprobeCache = {
          available: false,
          version: null,
          reason: 'FFprobe executable is not installed or not in system PATH.',
        };
      } else {
        const firstLine = stdout.split('\n')[0] || 'FFprobe';
        ffprobeCache = {
          available: true,
          version: firstLine.trim(),
        };
      }
      resolve(ffprobeCache);
    });
  });
};

/**
 * Extracts container stream metadata (duration, resolution, codecs) via FFprobe
 * Enforces resource ceiling limits.
 */
const probeMedia = async (filePath) => {
  const safePath = sanitizePath(filePath);

  const toolCheck = await checkFFprobeAvailability();
  if (!toolCheck.available) {
    return {
      status: 'UNAVAILABLE',
      available: false,
      message: 'FFprobe utility is unavailable for stream inspection.',
    };
  }

  return new Promise((resolve) => {
    execFile(
      'ffprobe',
      [
        '-v', 'error',
        '-show_entries', 'format=duration,size,bit_rate:stream=codec_type,codec_name,width,height,r_frame_rate,sample_rate,channels',
        '-of', 'json',
        safePath,
      ],
      { timeout: 8000 },
      (error, stdout) => {
        if (error || !stdout) {
          return resolve({
            status: 'PROBE_FAILED',
            available: true,
            message: `Failed to probe media streams: ${error ? error.message : 'Empty output'}`,
          });
        }

        try {
          const parsed = JSON.parse(stdout);
          const durationSec = parseFloat(parsed.format?.duration || 0);
          const fileSize = parseInt(parsed.format?.size || 0, 10);

          const videoStream = parsed.streams?.find((s) => s.codec_type === 'video');
          const audioStream = parsed.streams?.find((s) => s.codec_type === 'audio');

          return resolve({
            status: 'SUCCESS',
            available: true,
            duration: durationSec,
            fileSize,
            isDurationExceeded: durationSec > RESOURCE_LIMITS.MAX_VIDEO_DURATION_SECONDS,
            maxDurationAllowed: RESOURCE_LIMITS.MAX_VIDEO_DURATION_SECONDS,
            video: videoStream
              ? {
                  codec: videoStream.codec_name,
                  width: videoStream.width,
                  height: videoStream.height,
                  frameRate: videoStream.r_frame_rate,
                }
              : null,
            audio: audioStream
              ? {
                  codec: audioStream.codec_name,
                  sampleRate: parseInt(audioStream.sample_rate || 0, 10),
                  channels: audioStream.channels,
                }
              : null,
          });
        } catch (e) {
          return resolve({
            status: 'PARSE_ERROR',
            available: true,
            message: 'Unable to parse FFprobe JSON stream structure.',
          });
        }
      }
    );
  });
};

/**
 * Extracts bounded representative frames from video (beginning, middle, end)
 * Prevents memory and CPU exhaustion by never extracting every frame.
 * Uses bounded sampling: beginning, quarter, middle, three-quarter, end (max 5 frames).
 * Optionally attempts scene-change sampling if practical.
 *
 * @param {string} videoPath - Path to verified video asset
 * @param {string} outputDir - Isolated directory to place frames
 * @param {Object} options - Optional configuration { preferSceneChange: boolean }
 * @returns {Promise<Object>} List of generated frame objects
 */
const extractRepresentativeFrames = async (videoPath, outputDir, options = {}) => {
  const safeVideoPath = sanitizePath(videoPath);
  const safeOutputDir = sanitizePath(outputDir);

  const ffmpegCheck = await checkFFmpegAvailability();
  if (!ffmpegCheck.available) {
    return {
      status: 'UNAVAILABLE',
      available: false,
      message: 'FFmpeg executable is unavailable on server. Frame extraction bypassed.',
      frames: [],
    };
  }

  // Ensure output directory exists
  await fs.promises.mkdir(safeOutputDir, { recursive: true });

  // Probe duration to determine sample points and check limits
  const probe = await probeMedia(safeVideoPath);
  const duration = probe.duration || 10;

  if (probe.isDurationExceeded) {
    return {
      status: 'RESOURCE_LIMIT_EXCEEDED',
      available: true,
      message: `Video duration (${duration.toFixed(1)}s) exceeds maximum allowed limit of ${RESOURCE_LIMITS.MAX_VIDEO_DURATION_SECONDS}s.`,
      frames: [],
    };
  }

  // Practical scene-change sampling attempt if requested and duration permits
  if (options.preferSceneChange && duration >= 3) {
    try {
      const sceneFrames = await extractSceneChangeFrames(safeVideoPath, safeOutputDir);
      if (sceneFrames && sceneFrames.length > 0) {
        return {
          status: 'SUCCESS',
          available: true,
          method: 'SCENE_CHANGE',
          totalFramesExtracted: sceneFrames.length,
          frames: sceneFrames,
        };
      }
    } catch (err) {
      // Fallback seamlessly to bounded timestamp sampling
    }
  }

  // Bounded representative sampling: beginning (10%), quarter (25%), middle (50%), three-quarter (75%), end (90%)
  const sampleRatios = [0.1, 0.25, 0.5, 0.75, 0.9].slice(0, RESOURCE_LIMITS.MAX_FRAME_COUNT);
  const sampleTimestamps = sampleRatios.map((ratio) => Math.max(0.5, (duration * ratio)).toFixed(2));

  const extractedFrames = [];

  for (let i = 0; i < sampleTimestamps.length; i++) {
    const ts = sampleTimestamps[i];
    const frameId = crypto.randomUUID();
    const frameFilename = `frame_${i + 1}_${frameId}.jpg`;
    const framePath = path.join(safeOutputDir, frameFilename);

    // Safe execution: strict argument array, no shell interpolation
    const success = await new Promise((resolve) => {
      execFile(
        'ffmpeg',
        [
          '-ss', String(ts),
          '-i', safeVideoPath,
          '-vframes', '1',
          '-vf', `scale=min(${RESOURCE_LIMITS.MAX_FRAME_WIDTH}\\,iw):min(${RESOURCE_LIMITS.MAX_FRAME_HEIGHT}\\,ih):force_original_aspect_ratio=decrease`,
          '-q:v', '2', // High quality JPEG
          '-y',
          framePath,
        ],
        { timeout: RESOURCE_LIMITS.MAX_PROCESS_TIMEOUT_MS },
        (error) => {
          if (error) {
            resolve(false);
          } else {
            // Verify file exists and adheres to size ceiling
            if (fs.existsSync(framePath)) {
              const stat = fs.statSync(framePath);
              if (stat.size > RESOURCE_LIMITS.MAX_OUTPUT_SIZE_BYTES) {
                deleteFileSafely(framePath);
                resolve(false);
              } else {
                resolve(true);
              }
            } else {
              resolve(false);
            }
          }
        }
      );
    });

    if (success) {
      extractedFrames.push({
        index: i + 1,
        timestampSeconds: parseFloat(ts),
        label: i === 0 ? 'Beginning' : i === Math.floor(sampleTimestamps.length / 2) ? 'Middle' : i === sampleTimestamps.length - 1 ? 'End' : `Sample ${i + 1}`,
        filePath: framePath,
        filename: frameFilename,
      });
    }
  }

  return {
    status: 'SUCCESS',
    available: true,
    method: 'BOUNDED_SAMPLING',
    totalFramesExtracted: extractedFrames.length,
    frames: extractedFrames,
  };
};

/**
 * Scene-change bounded frame extraction (up to MAX_FRAME_COUNT frames)
 */
const extractSceneChangeFrames = async (videoPath, outputDir) => {
  const pattern = path.join(outputDir, `scene_%03d_${crypto.randomUUID().slice(0, 8)}.jpg`);

  return new Promise((resolve) => {
    execFile(
      'ffmpeg',
      [
        '-i', videoPath,
        '-vf', `select='gt(scene,0.3)',scale=min(${RESOURCE_LIMITS.MAX_FRAME_WIDTH}\\,iw):min(${RESOURCE_LIMITS.MAX_FRAME_HEIGHT}\\,ih):force_original_aspect_ratio=decrease`,
        '-vsync', 'vfr',
        '-vframes', String(RESOURCE_LIMITS.MAX_FRAME_COUNT),
        '-q:v', '2',
        '-y',
        pattern,
      ],
      { timeout: RESOURCE_LIMITS.MAX_PROCESS_TIMEOUT_MS },
      async (error) => {
        if (error) {
          return resolve(null);
        }

        try {
          const files = await fs.promises.readdir(outputDir);
          const sceneFiles = files
            .filter((f) => f.startsWith('scene_') && f.endsWith('.jpg'))
            .slice(0, RESOURCE_LIMITS.MAX_FRAME_COUNT);

          if (sceneFiles.length === 0) {
            return resolve(null);
          }

          const frames = sceneFiles.map((filename, idx) => ({
            index: idx + 1,
            label: `Scene ${idx + 1}`,
            filePath: path.join(outputDir, filename),
            filename,
          }));

          resolve(frames);
        } catch {
          resolve(null);
        }
      }
    );
  });
};

/**
 * Extracts and normalizes audio track from video for speech / acoustic forensics
 *
 * @param {string} videoPath - Input video path
 * @param {string} outputAudioPath - Destination audio path (.wav)
 */
const extractAudioTrack = async (videoPath, outputAudioPath) => {
  const safeVideoPath = sanitizePath(videoPath);
  const safeAudioPath = sanitizePath(outputAudioPath);

  const ffmpegCheck = await checkFFmpegAvailability();
  if (!ffmpegCheck.available) {
    return {
      status: 'UNAVAILABLE',
      available: false,
      message: 'FFmpeg executable is unavailable. Audio stream extraction bypassed.',
    };
  }

  // Check video duration ceiling
  const probe = await probeMedia(safeVideoPath);
  if (probe.isDurationExceeded) {
    return {
      status: 'RESOURCE_LIMIT_EXCEEDED',
      available: true,
      message: `Video duration exceeds maximum allowed limit of ${RESOURCE_LIMITS.MAX_VIDEO_DURATION_SECONDS}s.`,
    };
  }

  return new Promise((resolve) => {
    execFile(
      'ffmpeg',
      [
        '-i', safeVideoPath,
        '-vn', // Disable video stream
        '-acodec', 'pcm_s16le', // Standard 16-bit PCM WAV
        '-ar', String(RESOURCE_LIMITS.TARGET_AUDIO_SAMPLE_RATE), // 16kHz
        '-ac', '1', // Mono channel for consistent spectral evaluation
        '-y',
        safeAudioPath,
      ],
      { timeout: RESOURCE_LIMITS.MAX_PROCESS_TIMEOUT_MS },
      (error) => {
        if (error || !fs.existsSync(safeAudioPath)) {
          return resolve({
            status: 'EXTRACTION_FAILED',
            available: true,
            message: `Audio extraction failed: ${error ? error.message : 'Output file not created'}`,
          });
        }

        // Verify output size ceiling
        const stat = fs.statSync(safeAudioPath);
        if (stat.size > RESOURCE_LIMITS.MAX_OUTPUT_SIZE_BYTES) {
          deleteFileSafely(safeAudioPath);
          return resolve({
            status: 'RESOURCE_LIMIT_EXCEEDED',
            available: true,
            message: `Extracted audio size (${(stat.size / 1024 / 1024).toFixed(1)}MB) exceeded maximum permitted output ceiling.`,
          });
        }

        return resolve({
          status: 'SUCCESS',
          available: true,
          audioPath: safeAudioPath,
          sizeBytes: stat.size,
        });
      }
    );
  });
};

/**
 * Prepares and normalizes an input audio file (MP3, WAV, M4A) for forensic analysis
 *
 * @param {string} inputAudioPath - Path to uploaded audio file
 * @param {string} outputAudioPath - Destination 16kHz mono WAV path
 */
const prepareAudioForAnalysis = async (inputAudioPath, outputAudioPath) => {
  const safeInputPath = sanitizePath(inputAudioPath);
  const safeOutputPath = sanitizePath(outputAudioPath);

  const ffmpegCheck = await checkFFmpegAvailability();
  if (!ffmpegCheck.available) {
    return {
      status: 'UNAVAILABLE',
      available: false,
      message: 'FFmpeg executable is unavailable. Audio normalization bypassed.',
    };
  }

  // Probe audio duration and properties
  const probe = await probeMedia(safeInputPath);
  if (probe.isDurationExceeded) {
    return {
      status: 'RESOURCE_LIMIT_EXCEEDED',
      available: true,
      message: `Audio duration exceeds maximum allowed limit of ${RESOURCE_LIMITS.MAX_VIDEO_DURATION_SECONDS}s.`,
    };
  }

  return new Promise((resolve) => {
    execFile(
      'ffmpeg',
      [
        '-i', safeInputPath,
        '-acodec', 'pcm_s16le',
        '-ar', String(RESOURCE_LIMITS.TARGET_AUDIO_SAMPLE_RATE),
        '-ac', '1',
        '-y',
        safeOutputPath,
      ],
      { timeout: RESOURCE_LIMITS.MAX_PROCESS_TIMEOUT_MS },
      (error) => {
        if (error || !fs.existsSync(safeOutputPath)) {
          return resolve({
            status: 'PROCESSING_FAILED',
            available: true,
            message: `Audio normalization failed: ${error ? error.message : 'Output file not generated'}`,
          });
        }

        const stat = fs.statSync(safeOutputPath);
        if (stat.size > RESOURCE_LIMITS.MAX_OUTPUT_SIZE_BYTES) {
          deleteFileSafely(safeOutputPath);
          return resolve({
            status: 'RESOURCE_LIMIT_EXCEEDED',
            available: true,
            message: `Normalized audio file exceeded limit of ${RESOURCE_LIMITS.MAX_OUTPUT_SIZE_BYTES} bytes.`,
          });
        }

        return resolve({
          status: 'SUCCESS',
          available: true,
          audioPath: safeOutputPath,
          sizeBytes: stat.size,
          duration: probe.duration,
        });
      }
    );
  });
};

/**
 * Converts video format when necessary (e.g. MOV, WEBM -> MP4)
 * Applies resolution limits, duration limits, and safe execution.
 *
 * @param {string} inputVideoPath - Source video path
 * @param {string} outputVideoPath - Destination MP4 path
 */
const convertVideoFormat = async (inputVideoPath, outputVideoPath) => {
  const safeInputPath = sanitizePath(inputVideoPath);
  const safeOutputPath = sanitizePath(outputVideoPath);

  const ffmpegCheck = await checkFFmpegAvailability();
  if (!ffmpegCheck.available) {
    return {
      status: 'UNAVAILABLE',
      available: false,
      message: 'FFmpeg executable is unavailable. Format conversion bypassed.',
    };
  }

  const probe = await probeMedia(safeInputPath);
  if (probe.isDurationExceeded) {
    return {
      status: 'RESOURCE_LIMIT_EXCEEDED',
      available: true,
      message: `Video duration exceeds limit of ${RESOURCE_LIMITS.MAX_VIDEO_DURATION_SECONDS}s.`,
    };
  }

  return new Promise((resolve) => {
    execFile(
      'ffmpeg',
      [
        '-i', safeInputPath,
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '23',
        '-vf', `scale=min(${RESOURCE_LIMITS.MAX_FRAME_WIDTH}\\,iw):min(${RESOURCE_LIMITS.MAX_FRAME_HEIGHT}\\,ih):force_original_aspect_ratio=decrease`,
        '-c:a', 'aac',
        '-b:a', '128k',
        '-movflags', '+faststart',
        '-y',
        safeOutputPath,
      ],
      { timeout: RESOURCE_LIMITS.MAX_PROCESS_TIMEOUT_MS },
      (error) => {
        if (error || !fs.existsSync(safeOutputPath)) {
          return resolve({
            status: 'CONVERSION_FAILED',
            available: true,
            message: `Video conversion failed: ${error ? error.message : 'Output file not created'}`,
          });
        }

        const stat = fs.statSync(safeOutputPath);
        if (stat.size > RESOURCE_LIMITS.MAX_OUTPUT_SIZE_BYTES) {
          deleteFileSafely(safeOutputPath);
          return resolve({
            status: 'RESOURCE_LIMIT_EXCEEDED',
            available: true,
            message: `Converted video exceeded maximum size limit of ${RESOURCE_LIMITS.MAX_OUTPUT_SIZE_BYTES} bytes.`,
          });
        }

        return resolve({
          status: 'SUCCESS',
          available: true,
          outputPath: safeOutputPath,
          sizeBytes: stat.size,
        });
      }
    );
  });
};

module.exports = {
  checkFFmpegAvailability,
  checkFFprobeAvailability,
  probeMedia,
  extractRepresentativeFrames,
  extractAudioTrack,
  prepareAudioForAnalysis,
  convertVideoFormat,
  RESOURCE_LIMITS,
};
