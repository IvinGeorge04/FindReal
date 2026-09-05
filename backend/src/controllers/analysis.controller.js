const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const Analysis = require('../models/Analysis');
const Media = require('../models/Media');
const { ensureDBConnection } = require('../config/db');
const { memoryMedia } = require('./media.controller');
const { runForensicPipeline } = require('../services/pipeline.service');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { HTTP_STATUS } = require('../utils/constants');
const { TEMP_STORAGE_DIR } = require('../middleware/upload.middleware');

// In-memory fallback for local development/offline testing
const memoryAnalysis = new Map();

const isDbConnected = () => mongoose.connection && mongoose.connection.readyState === 1;

/**
 * Trigger Full Forensic Pipeline on an Uploaded Media Asset
 * POST /api/v1/analysis
 */
const createAndRunAnalysis = async (req, res, next) => {
  try {
    const { mediaId, identifier, sourceContext } = req.body || {};
    const currentUserId = req.user ? (req.user._id ? req.user._id.toString() : req.user.id) : null;

    if (!mediaId && !identifier) {
      return errorResponse(
        res,
        'Media identifier or mediaId must be specified to trigger analysis.',
        HTTP_STATUS.BAD_REQUEST,
        'MISSING_MEDIA_IDENTIFIER'
      );
    }

    // 1. Locate Media record
    let media = null;
    try {
      if (mediaId) {
        media = await Media.findById(mediaId).select('+filePath');
      } else if (identifier) {
        media = await Media.findOne({ storedIdentifier: identifier }).select('+filePath');
      }
    } catch (dbErr) {
      // Check in-memory fallback
      media = Array.from(memoryMedia.values()).find(
        (m) => m._id === mediaId || m.id === mediaId || m.storedIdentifier === identifier
      );
    }

    if (!media) {
      media = Array.from(memoryMedia.values()).find(
        (m) => m._id === mediaId || m.id === mediaId || m.storedIdentifier === identifier
      );
    }

    // Shield against omitted or relative file path
    if (media && !media.filePath && media.storedIdentifier) {
      const ext = media.extension || (media.mimeType ? media.mimeType.split('/')[1] : 'png');
      const reconstructed = path.join(TEMP_STORAGE_DIR, `${media.storedIdentifier}.${ext}`);
      if (fs.existsSync(reconstructed)) {
        media.filePath = reconstructed;
      }
    }

    if (!media) {
      return errorResponse(
        res,
        'The specified media asset could not be found.',
        HTTP_STATUS.NOT_FOUND,
        'MEDIA_NOT_FOUND'
      );
    }

    // 2. Ownership verification (IDOR protection)
    const mediaOwnerId = media.userId ? media.userId.toString() : null;
    const isOwner = !mediaOwnerId || (currentUserId && mediaOwnerId === currentUserId);
    const isAdmin = req.user?.role === 'admin';

    if (mediaOwnerId && !isOwner && !isAdmin) {
      return errorResponse(
        res,
        'You do not have authorization to analyze this media asset.',
        HTTP_STATUS.FORBIDDEN,
        'FORBIDDEN_RESOURCE'
      );
    }

    // 3. Execute multi-signal forensic pipeline
    const pipelineReport = await runForensicPipeline(media, { sourceContext });

    // 4. Save Analysis Record
    if (!isDbConnected()) {
      await ensureDBConnection();
    }

    const analysisPayload = {
      userId: currentUserId,
      mediaId: media._id || media.id,
      mediaName: media.originalName || 'uploaded_media',
      mediaType: media.type,
      fileSize: media.size,
      status: 'completed',
      verdict: pipelineReport.verdict,
      riskLevel: pipelineReport.riskLevel,
      manipulationRisk: pipelineReport.manipulationRisk,
      confidenceScore: pipelineReport.confidenceScore,
      evidence: {
        aiAnalysis: pipelineReport.rawSignals.gemini,
        metadata: pipelineReport.rawSignals.metadata,
        provenance: pipelineReport.rawSignals.c2pa,
        sourceContext: sourceContext || null,
        mediaProcessing: pipelineReport.rawSignals.mediaProcessing,
        transcription: pipelineReport.rawSignals.transcription,
      },
      evidenceItems: pipelineReport.evidenceItems,
      evidenceAvailability: pipelineReport.evidenceAvailability,
      limitations: pipelineReport.limitations,
      explanation: pipelineReport.explanation,
    };

    let savedAnalysis = null;
    if (isDbConnected()) {
      try {
        savedAnalysis = await Analysis.create(analysisPayload);
        console.log(`[Analysis] Analysis record saved and persisted to MongoDB: ${savedAnalysis._id}`);
      } catch (saveErr) {
        console.error(`[Analysis] Database save failed for analysis: ${saveErr.message}`);
        savedAnalysis = null;
      }
    }

    if (!savedAnalysis) {
      // In-memory fallback
      const mockAnalysisId = new mongoose.Types.ObjectId().toString();
      savedAnalysis = {
        _id: mockAnalysisId,
        id: mockAnalysisId,
        ...analysisPayload,
        createdAt: new Date(),
        updatedAt: new Date(),
        toJSON: function () {
          return this;
        },
      };
      memoryAnalysis.set(mockAnalysisId, savedAnalysis);
      console.warn(`[Analysis] Stored in in-memory fallback: ${mockAnalysisId}`);
    }

    return successResponse(
      res,
      { analysis: savedAnalysis },
      HTTP_STATUS.CREATED
    );
  } catch (err) {
    next(err);
  }
};

/**
 * Get Analysis by ID (with strict server-side IDOR ownership verification)
 * GET /api/v1/analysis/:id
 */
const getAnalysisById = async (req, res, next) => {
  try {
    const { id } = req.params;

    // 1. Resolve current user identity if authenticated
    const currentUserId = req.user ? (req.user._id ? req.user._id.toString() : req.user.id) : null;

    // 2. Find analysis record
    let analysis;
    try {
      analysis = await Analysis.findById(id);
    } catch (err) {
      analysis = memoryAnalysis.get(id);
    }

    if (!analysis) {
      analysis = memoryAnalysis.get(id);
    }

    if (!analysis) {
      return errorResponse(res, 'Analysis record not found.', HTTP_STATUS.NOT_FOUND, 'ANALYSIS_NOT_FOUND');
    }

    // 3. Verify ownership (IDOR Prevention)
    // If analysis was created anonymously (!ownerId), any guest can view it.
    // If analysis belongs to a registered user, only the owner (or admin) can view it.
    const ownerId = analysis.userId ? analysis.userId.toString() : null;
    const isOwner = !ownerId || (currentUserId && ownerId === currentUserId);
    const isAdmin = req.user?.role === 'admin';

    if (ownerId && !isOwner && !isAdmin) {
      return errorResponse(
        res,
        'Access denied. You do not possess authorization to view this analysis record.',
        HTTP_STATUS.FORBIDDEN,
        'FORBIDDEN_RESOURCE'
      );
    }

    // 4. Return result only if authorized
    return successResponse(res, { analysis });
  } catch (err) {
    next(err);
  }
};

/**
 * Get Analysis History for Current Authenticated User
 * GET /api/v1/analysis/history
 * Strict IDOR: only returns analyses belonging to req.user; returns empty list if unauthenticated
 */
const getAnalysisHistory = async (req, res, next) => {
  try {
    if (!req.user) {
      return successResponse(res, { history: [] });
    }
    const currentUserId = req.user._id ? req.user._id.toString() : req.user.id;

    if (!isDbConnected()) {
      await ensureDBConnection();
    }

    let records = [];
    if (isDbConnected()) {
      try {
        const queryConditions = [{ userId: currentUserId }];
        if (mongoose.Types.ObjectId.isValid(currentUserId)) {
          queryConditions.push({ userId: new mongoose.Types.ObjectId(currentUserId) });
        }

        records = await Analysis.find({ $or: queryConditions })
          .sort({ createdAt: -1 })
          .select('_id mediaName mediaType verdict riskLevel manipulationRisk confidenceScore createdAt fileSize status')
          .lean();
      } catch (dbErr) {
        console.error(`[Analysis] Error fetching history from MongoDB: ${dbErr.message}`);
        records = [];
      }
    }

    if (!records || records.length === 0) {
      const memRecords = Array.from(memoryAnalysis.values()).filter(
        (a) => a.userId && a.userId.toString() === currentUserId
      );
      if (memRecords.length > 0) {
        records = memRecords;
      }
    }

    const history = (records || []).map((item) => ({
      id: item._id ? item._id.toString() : item.id,
      _id: item._id ? item._id.toString() : item.id,
      mediaName: item.mediaName || 'Uploaded Media',
      mediaType: item.mediaType || 'image',
      verdict: item.verdict || 'INCONCLUSIVE',
      riskLevel: item.riskLevel || 'MODERATE CONCERN',
      manipulationRisk: typeof item.manipulationRisk === 'number' ? item.manipulationRisk : 50,
      confidenceScore: item.confidenceScore || 65,
      date: item.createdAt || new Date().toISOString(),
      createdAt: item.createdAt || new Date().toISOString(),
      fileSize: item.fileSize || null,
      status: item.status || 'completed',
    }));

    return successResponse(res, { history });
  } catch (err) {
    next(err);
  }
};

/**
 * Delete Analysis Record by ID
 * DELETE /api/v1/analysis/:id
 * Strict IDOR: only owner or admin can delete
 */
const deleteAnalysisById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user._id ? req.user._id.toString() : req.user.id;

    let analysis = null;
    try {
      analysis = await Analysis.findById(id);
    } catch (dbErr) {
      analysis = memoryAnalysis.get(id);
    }

    if (!analysis) {
      analysis = memoryAnalysis.get(id);
    }

    if (!analysis) {
      return errorResponse(res, 'Analysis record not found.', HTTP_STATUS.NOT_FOUND, 'ANALYSIS_NOT_FOUND');
    }

    const ownerId = analysis.userId ? analysis.userId.toString() : '';
    const isOwner = ownerId === currentUserId;
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return errorResponse(
        res,
        'Access denied. You do not have permission to delete this analysis record.',
        HTTP_STATUS.FORBIDDEN,
        'FORBIDDEN_RESOURCE'
      );
    }

    try {
      await Analysis.findByIdAndDelete(id);
    } catch (err) {
      // Ignore if using in-memory
    }

    memoryAnalysis.delete(id);

    return successResponse(res, {
      message: 'Analysis record successfully deleted.',
      deletedId: id,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createAndRunAnalysis,
  getAnalysisById,
  getAnalysisHistory,
  deleteAnalysisById,
  memoryAnalysis,
};
