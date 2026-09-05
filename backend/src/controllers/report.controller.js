require('../config/resolveModules');
const mongoose = require('mongoose');
const Analysis = require('../models/Analysis');
const { memoryAnalysis } = require('./analysis.controller');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { HTTP_STATUS } = require('../utils/constants');

const isDbConnected = () => mongoose.connection && mongoose.connection.readyState === 1;

/**
 * Generate Sanitized Official Verification Report
 * GET /api/v1/reports/:id
 * 
 * Strict Security Guarantees:
 * - Ownership verification (IDOR protection)
 * - Excludes: API keys, system prompts, internal prompts, chain-of-thought, secrets, filesystem paths
 */
const getReportById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user ? (req.user._id ? req.user._id.toString() : req.user.id) : null;

    // 1. Retrieve Analysis Record
    let analysis = null;
    if (isDbConnected()) {
      try {
        analysis = await Analysis.findById(id);
      } catch (err) {
        analysis = memoryAnalysis.get(id);
      }
    } else {
      analysis = memoryAnalysis.get(id);
    }

    if (!analysis) {
      analysis = memoryAnalysis.get(id);
    }

    if (!analysis) {
      return errorResponse(
        res,
        'The requested verification report could not be found.',
        HTTP_STATUS.NOT_FOUND,
        'REPORT_NOT_FOUND'
      );
    }

    // 2. IDOR Prevention: Verify Ownership
    // If report was created anonymously (!ownerId), any user or guest can view it.
    // If report belongs to a registered user, only the owner (or admin) can view it.
    const ownerId = analysis.userId ? analysis.userId.toString() : null;
    const isOwner = !ownerId || (currentUserId && ownerId === currentUserId);
    const isAdmin = req.user?.role === 'admin';

    if (ownerId && !isOwner && !isAdmin) {
      return errorResponse(
        res,
        'Access denied. You do not possess authorization to view this verification report.',
        HTTP_STATUS.FORBIDDEN,
        'FORBIDDEN_RESOURCE'
      );
    }

    // 3. Assemble Sanitized Official Report Structure
    const evidenceData = analysis.evidence || {};
    const rawAi = evidenceData.aiAnalysis || {};
    const rawMeta = evidenceData.metadata || {};
    const rawProv = evidenceData.provenance || {};

    // Sanitize AI Analysis: strip system prompt, internal instructions, or API responses
    const sanitizedAiAnalysis = {
      available: Boolean(rawAi.assessment || rawAi.summary),
      summary: rawAi.summary || 'Multimodal AI analysis conducted without generating absolute conclusions.',
      findings: Array.isArray(rawAi.findings)
        ? rawAi.findings.map((f) => ({
            category: f.category,
            severity: f.severity,
            description: f.description,
          }))
        : [],
    };

    // Sanitize Metadata: strip internal absolute file system paths
    const sanitizedMetadata = {
      available: Boolean(rawMeta.available),
      cameraMake: rawMeta.cameraMake || null,
      cameraModel: rawMeta.cameraModel || null,
      software: rawMeta.software || null,
      hasAiOrEditingSoftware: Boolean(rawMeta.hasAiOrEditingSoftware),
      creationDate: rawMeta.creationDate || null,
      dimensions: rawMeta.imageWidth && rawMeta.imageHeight ? `${rawMeta.imageWidth}x${rawMeta.imageHeight}` : null,
      format: rawMeta.fileFormat || null,
      audioCodec: rawMeta.audioCodec || null,
      videoCodec: rawMeta.videoCodec || null,
      note: 'Missing EXIF or container metadata is common on web transfers and does not prove manipulation.',
    };

    // Sanitize Provenance (C2PA)
    const sanitizedProvenance = {
      status: rawProv.status || 'NOT_FOUND',
      isAiGenerated: Boolean(rawProv.isAiGenerated),
      claimGenerator: rawProv.claimGenerator || null,
      issuer: rawProv.issuer || null,
      note: 'Absence of C2PA Content Credentials is standard across consumer devices and does not indicate falsification.',
    };

    // Sanitize Source Context
    const sanitizedSourceContext = {
      hasContext: Boolean(evidenceData.sourceContext?.url || analysis.mediaName),
      ingestionType: evidenceData.sourceContext?.url ? 'URL' : 'DIRECT_UPLOAD',
      url: evidenceData.sourceContext?.url || null,
      note: 'Source searches may be incomplete.',
    };

    // Sanitize Fact Checks
    const sanitizedFactChecks = {
      status: evidenceData.factCheck?.matched ? 'MATCH_FOUND' : 'NO_MATCHING_RESULT',
      claimTitle: evidenceData.factCheck?.claimTitle || null,
      note: 'Absence of a fact-check record does not prove authenticity.',
    };

    // Safe sanitized verification report object
    const report = {
      title: 'FindReal Verification Report',
      reportId: analysis._id ? analysis._id.toString() : analysis.id,
      mediaInformation: {
        filename: analysis.mediaName,
        mediaType: analysis.mediaType,
        fileSize: analysis.fileSize || null,
      },
      overallAssessment: analysis.verdict || 'INCONCLUSIVE',
      manipulationRisk: typeof analysis.manipulationRisk === 'number' ? analysis.manipulationRisk : 50,
      riskLevel: analysis.riskLevel || 'MODERATE CONCERN',
      confidence: analysis.confidenceScore || 65,
      aiAnalysis: sanitizedAiAnalysis,
      metadata: sanitizedMetadata,
      provenance: sanitizedProvenance,
      sourceContext: sanitizedSourceContext,
      factChecks: sanitizedFactChecks,
      evidence: Array.isArray(analysis.evidenceItems) ? analysis.evidenceItems : [],
      explanation: analysis.explanation || 'Evidence aggregated across multiple independent signals.',
      limitations: Array.isArray(analysis.limitations) ? analysis.limitations : [],
      analysisTimestamp: analysis.createdAt || new Date().toISOString(),
    };

    return successResponse(res, { report });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getReportById,
};
