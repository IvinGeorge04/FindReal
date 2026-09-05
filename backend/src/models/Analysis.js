require('../config/resolveModules');
const mongoose = require('mongoose');

const analysisSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Analysis must belong to a user'],
      index: true,
    },
    mediaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Media',
    },
    mediaName: {
      type: String,
      required: true,
      trim: true,
    },
    mediaType: {
      type: String,
      enum: ['image', 'audio', 'video', 'url'],
      required: true,
    },
    fileSize: {
      type: Number,
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
    },
    verdict: {
      type: String,
      enum: [
        'VERIFIED PROVENANCE',
        'LIKELY AUTHENTIC',
        'INCONCLUSIVE',
        'SUSPICIOUS',
        'HIGH MANIPULATION RISK',
      ],
      default: 'INCONCLUSIVE',
    },
    riskLevel: {
      type: String,
      enum: ['LOW CONCERN', 'MODERATE CONCERN', 'SUSPICIOUS', 'HIGH CONCERN'],
      default: 'MODERATE CONCERN',
    },
    manipulationRisk: {
      type: Number,
      min: 0,
      max: 100,
      default: 50,
    },
    confidenceScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    evidence: {
      aiAnalysis: mongoose.Schema.Types.Mixed,
      metadata: mongoose.Schema.Types.Mixed,
      provenance: mongoose.Schema.Types.Mixed,
      sourceContext: mongoose.Schema.Types.Mixed,
      mediaProcessing: mongoose.Schema.Types.Mixed,
      transcription: mongoose.Schema.Types.Mixed,
    },
    evidenceItems: [
      {
        category: String,
        finding: String,
        severity: String,
        source: String,
        confidence: String,
        details: mongoose.Schema.Types.Mixed,
      },
    ],
    evidenceAvailability: mongoose.Schema.Types.Mixed,
    limitations: [String],
    explanation: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const Analysis = mongoose.models.Analysis || mongoose.model('Analysis', analysisSchema);

module.exports = Analysis;
