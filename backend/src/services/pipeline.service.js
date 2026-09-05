require('../config/resolveModules');
const path = require('path');
const fs = require('fs');
const metadataService = require('./metadata.service');
const c2paService = require('./c2pa.service');
const ffmpegService = require('./ffmpeg.service');
const transcriptionService = require('./transcription.service');
const geminiService = require('./gemini.service');
const factcheckService = require('./factcheck.service');
const sourceContextService = require('./sourceContext.service');
const aggregationService = require('./aggregation.service');
const { TEMP_STORAGE_DIR } = require('../middleware/upload.middleware');

/**
 * Executes the full end-to-end multi-engine forensic pipeline for a media asset
 *
 * Fault tolerance rules:
 * - If ExifTool is missing: continues with controlled UNAVAILABLE.
 * - If C2PA is missing: continues with controlled UNAVAILABLE.
 * - If FFmpeg is missing: continues with controlled UNAVAILABLE.
 * - If Whisper is missing: continues with controlled UNAVAILABLE.
 * - If Gemini is unconfigured/fails: continues with controlled UNAVAILABLE, aggregating other signals.
 * - If Fact Check API is unconfigured: continues with controlled UNAVAILABLE (never invents).
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

  // 2. Cryptographic Provenance inspection via C2PA
  let c2paResult = null;
  try {
    c2paResult = await c2paService.verifyC2PA(filePath);
  } catch (err) {
    c2paResult = { status: 'UNAVAILABLE', available: false, message: err.message };
  }

  // 3. Media Processing (Frames and Audio Extraction)
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
      message: 'Source context unavailable.',
    };
  }

  // 6. Fact Check Verification (Google Fact Check Tools API)
  let factCheckResult = null;
  try {
    const searchQuery =
      options.userClaim ||
      transcriptionResult?.transcript ||
      (sourceContextResult?.notes ? sourceContextResult.notes : '');

    factCheckResult = await factcheckService.searchFactChecks(searchQuery);
  } catch (err) {
    factCheckResult = {
      status: 'UNAVAILABLE',
      available: false,
      matched: false,
      message: 'No matching fact-check found.',
      note: 'This does NOT mean the claim is true.',
      matches: [],
    };
  }

  // 7. Multimodal Reasoning via Gemini
  let geminiResult = null;
  let geminiAvailability = { status: 'UNAVAILABLE', reason: 'NOT_ATTEMPTED' };
  try {
    const isAvail = geminiService.isGeminiAvailable();
    if (isAvail.available) {
      try {
        geminiResult = await geminiService.analyzeMediaWithGemini({
          filePath,
          mimeType,
          mediaType,
          extractedMetadata: metadataResult?.available ? metadataResult : null,
        });
        geminiAvailability = { status: 'AVAILABLE', model: geminiService.PRIMARY_MODEL };
      } catch (geminiErr) {
        console.warn(`[Pipeline] Gemini execution failed: ${geminiErr.message}`);
        geminiResult = null;
        const errCat = geminiService.categorizeGeminiError(geminiErr);
        geminiAvailability = {
          status: 'TEMPORARILY_UNAVAILABLE',
          reason: errCat.category,
          message: errCat.message,
          model: geminiService.PRIMARY_MODEL,
        };
      }
    } else {
      geminiAvailability = { status: 'UNAVAILABLE', reason: isAvail.reason };
    }
  } catch (err) {
    geminiResult = null;
    geminiAvailability = { status: 'UNAVAILABLE', reason: 'UNEXPECTED_ERROR' };
  }

  // 8. Evidence Aggregation and Transparent Risk Assessment
  const assessmentReport = aggregationService.aggregateEvidenceAndAssessRisk({
    geminiAnalysis: geminiResult,
    geminiAvailability,
    metadata: metadataResult,
    c2pa: c2paResult,
    mediaProcessing: mediaProcessingResult,
    transcription: transcriptionResult,
    factCheck: factCheckResult,
    sourceContext: sourceContextResult,
  });

  return {
    ...assessmentReport,
    rawSignals: {
      metadata: metadataResult,
      c2pa: c2paResult,
      mediaProcessing: mediaProcessingResult,
      transcription: transcriptionResult,
      gemini: geminiResult,
      sourceContext: sourceContextResult,
      factCheck: factCheckResult,
    },
  };
};

module.exports = {
  runForensicPipeline,
};
