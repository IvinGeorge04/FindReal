require('../config/resolveModules');
const path = require('path');
const fs = require('fs');
const metadataService = require('./metadata.service');
const ffmpegService = require('./ffmpeg.service');
const transcriptionService = require('./transcription.service');
const groqService = require('./groq.service');
const sourceContextService = require('./sourceContext.service');
const aggregationService = require('./aggregation.service');
const { TEMP_STORAGE_DIR } = require('../middleware/upload.middleware');

/**
 * Executes the full end-to-end multi-engine forensic pipeline for a media asset
 *
 * Fault tolerance rules:
 * - If ExifTool is missing: continues with controlled UNAVAILABLE.
 * - If FFmpeg is missing: continues with controlled UNAVAILABLE.
 * - If Whisper is missing: continues with controlled UNAVAILABLE.
 * - If Groq is unconfigured/fails: continues with controlled UNAVAILABLE, aggregating other signals.
 * - Never crashes the application.
 *
 * @param {Object} media - Media record with filePath, type, mimeType, originalName
 * @param {Object} [options] - Additional options (sourceContext, userClaim)
 * @returns {Promise<Object>} Aggregated forensic report
 */
const runForensicPipeline = async (media, options = {}) => {
  const filePath = media.filePath;
  const mediaType = media.type; // 'image' | 'audio' | 'video'
  const mimeType = media.mimeType;

  // 1. Metadata extraction via ExifTool
  let metadataResult = null;
  try {
    metadataResult = await metadataService.extractMetadata(filePath);
  } catch (err) {
    metadataResult = { status: 'UNAVAILABLE', available: false, message: err.message };
  }

  // 2. Media Processing (Frames and Audio Extraction)
  let mediaProcessingResult = null;
  let audioForTranscriptionPath = null;

  if (mediaType === 'video') {
    try {
      const framesDir = path.join(TEMP_STORAGE_DIR, `frames_${path.parse(filePath).name}`);
      mediaProcessingResult = await ffmpegService.extractRepresentativeFrames(filePath, framesDir);

      // Also extract audio track for acoustic forensics / transcription
      const extractedAudio = path.join(TEMP_STORAGE_DIR, `audio_${path.parse(filePath).name}.wav`);
      const audioExtractRes = await ffmpegService.extractAudioTrack(filePath, extractedAudio);
      if (audioExtractRes.status === 'SUCCESS') {
        audioForTranscriptionPath = audioExtractRes.audioPath;
      }
    } catch (err) {
      mediaProcessingResult = { status: 'UNAVAILABLE', available: false, message: err.message };
    }
  } else if (mediaType === 'audio') {
    try {
      audioForTranscriptionPath = filePath;
      mediaProcessingResult = { status: 'SUCCESS', available: true, isAudioOnly: true };
    } catch (err) {
      mediaProcessingResult = { status: 'ERROR', available: false, message: err.message };
    }
  } else {
    mediaProcessingResult = { status: 'NOT_APPLICABLE', available: false };
  }

  // 4. Speech Transcription via local Whisper (optional)
  let transcriptionResult = null;
  if (audioForTranscriptionPath && (mediaType === 'audio' || mediaType === 'video')) {
    try {
      transcriptionResult = await transcriptionService.transcribeAudio(
        audioForTranscriptionPath,
        TEMP_STORAGE_DIR
      );
    } catch (err) {
      transcriptionResult = { status: 'FAILED', available: false, message: err.message };
    }
  } else {
    transcriptionResult = { status: 'NOT_APPLICABLE', available: false };
  }

  // 5. Source Context Resolution
  let sourceContextResult = null;
  try {
    const rawContextInput = options.sourceContext || {
      originalName: media.originalName,
      mediaType: media.type,
      userClaim: options.userClaim,
    };
    sourceContextResult = sourceContextService.resolveSourceContext(rawContextInput);
  } catch (err) {
    sourceContextResult = {
      status: 'UNAVAILABLE',
      hasContext: false,
      message: 'Source context service unavailable.',
      note: 'The external source-context service could not be reached or encountered an error.',
    };
  }

  // 6. Multimodal Reasoning via Groq
  let groqResult = null;
  let groqAvailability = { status: 'UNAVAILABLE', reason: 'NOT_ATTEMPTED' };
  try {
    const isAvail = groqService.isGroqAvailable();
    if (isAvail.available) {
      try {
        groqResult = await groqService.analyzeMediaWithGroq({
          filePath,
          mimeType,
          mediaType,
          extractedMetadata: metadataResult?.available ? metadataResult : null,
          frames: mediaProcessingResult?.frames || [],
          transcript: transcriptionResult?.transcript || null,
          audioDetails: mediaProcessingResult?.audioDetails || null,
          videoDetails: mediaProcessingResult?.videoDetails || null,
        });
        groqAvailability = { status: 'AVAILABLE', model: groqService.PRIMARY_MODEL };
      } catch (groqErr) {
        console.warn(`[Pipeline] Groq execution failed: ${groqErr.message}`);
        groqResult = null;
        const errCat = groqService.categorizeGroqError(groqErr);
        groqAvailability = {
          status: 'TEMPORARILY_UNAVAILABLE',
          reason: errCat.category,
          message: errCat.message,
          model: groqService.PRIMARY_MODEL,
        };
      }
    } else {
      groqAvailability = { status: 'UNAVAILABLE', reason: isAvail.reason };
    }
  } catch (err) {
    groqResult = null;
    groqAvailability = { status: 'UNAVAILABLE', reason: 'UNEXPECTED_ERROR' };
  }

  // 7. Evidence Aggregation and Transparent Risk Assessment
  const assessmentReport = aggregationService.aggregateEvidenceAndAssessRisk({
    groqAnalysis: groqResult,
    groqAvailability,
    geminiAnalysis: groqResult, // backwards-compatible alias
    geminiAvailability: groqAvailability, // backwards-compatible alias
    metadata: metadataResult,
    mediaProcessing: mediaProcessingResult,
    transcription: transcriptionResult,
    sourceContext: sourceContextResult,
  });

  return {
    ...assessmentReport,
    rawSignals: {
      metadata: metadataResult,
      mediaProcessing: mediaProcessingResult,
      transcription: transcriptionResult,
      groq: groqResult,
      gemini: groqResult, // legacy alias for consumers expecting .gemini
      sourceContext: sourceContextResult,
    },
  };
};

module.exports = {
  runForensicPipeline,
};
