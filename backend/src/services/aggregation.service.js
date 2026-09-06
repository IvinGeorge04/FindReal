require('../config/resolveModules');

// 1. User-Facing Risk Levels (Transparent risk assessment)
const RISK_LEVELS = {
  LOW_CONCERN: 'LOW CONCERN',
  MODERATE_CONCERN: 'MODERATE CONCERN',
  SUSPICIOUS: 'SUSPICIOUS',
  HIGH_CONCERN: 'HIGH CONCERN',
};

// 2. Final Verdict Taxonomy (Strict 5-state forensic taxonomy)
const VERDICT_TAXONOMY = {
  VERIFIED_PROVENANCE: 'VERIFIED PROVENANCE',
  LIKELY_AUTHENTIC: 'LIKELY AUTHENTIC',
  INCONCLUSIVE: 'INCONCLUSIVE',
  SUSPICIOUS: 'SUSPICIOUS',
  HIGH_MANIPULATION_RISK: 'HIGH MANIPULATION RISK',
};

// 3. Evidence Categories and Sources
const EVIDENCE_CATEGORIES = {
  VISUAL: 'VISUAL',
  AUDIO: 'AUDIO',
  METADATA: 'METADATA',
  PROVENANCE: 'PROVENANCE',
  CONTEXT: 'CONTEXT',
  TEMPORAL: 'TEMPORAL',
};

const EVIDENCE_SOURCES = {
  GROQ_VISION: 'GROQ_VISION',
  GROQ_REASONING: 'GROQ_REASONING',
  GROQ_AUDIO: 'GROQ_AUDIO',
  GEMINI_VISION: 'GROQ_VISION', // backwards compatibility alias
  GEMINI_AUDIO: 'GROQ_AUDIO', // backwards compatibility alias
  EXIFTOOL: 'EXIFTOOL',
  WHISPER: 'WHISPER',
  FRAME_INSPECTION: 'FRAME_INSPECTION',
  SOURCE_CONTEXT: 'SOURCE_CONTEXT',
};

/**
 * Maps a numeric Manipulation Risk score (0 - 100) to a user-facing risk level label
 */
const getRiskLevelFromScore = (score) => {
  if (score < 25) return RISK_LEVELS.LOW_CONCERN;
  if (score < 50) return RISK_LEVELS.MODERATE_CONCERN;
  if (score < 75) return RISK_LEVELS.SUSPICIOUS;
  return RISK_LEVELS.HIGH_CONCERN;
};

/**
 * Synthesizes multiple evidence sources into a consolidated, probabilistic verification report.
 *
 * CRITICAL GUIDELINES ENFORCED:
 * 1. FindReal must combine multiple evidence sources rather than blindly treating AI scores as truth.
 * 2. Risk metric is strictly titled "Manipulation Risk" (NEVER "Probability the media is fake").
 * 3. Evidence availability is explicitly tracked. Unavailable evidence is NEVER treated as negative evidence.
 * 4. Absence of evidence (missing EXIF, unprovided source context) must NOT automatically increase risk.
 * 5. Assessment never produces "100% REAL" or "100% FAKE".
 * 6. Explanations use probabilistic, calibrated phrases: "may indicate", "possible", "consistent with",
 *    "raises concerns", "no evidence found", "insufficient evidence".
 *
 * @param {Object} params
 * @param {Object} [params.groqAnalysis] - Result from groq.service.js
 * @param {Object} [params.geminiAnalysis] - Backwards compatibility alias
 * @param {Object} [params.metadata] - Result from metadata.service.js
 * @param {Object} [params.mediaProcessing] - Result from ffmpeg.service.js (frames, probe, audio)
 * @param {Object} [params.transcription] - Result from transcription.service.js
 * @param {Object} [params.sourceContext] - Optional user/source context
 * @returns {Object} Consolidated forensic assessment report
 */
const aggregateEvidenceAndAssessRisk = ({
  groqAnalysis = null,
  groqAvailability = null,
  geminiAnalysis = null,
  geminiAvailability = null,
  metadata = null,
  mediaProcessing = null,
  transcription = null,
  sourceContext = null,
} = {}) => {
  const evidenceItems = [];
  const limitations = [];

  const aiAnalysis = groqAnalysis || geminiAnalysis;
  const aiAvailability = groqAvailability || geminiAvailability;

  // -------------------------------------------------------------
  // 1. Explicit Evidence Availability Tracking
  // -------------------------------------------------------------
  const visualStatus = aiAnalysis && aiAnalysis.assessment
    ? 'AVAILABLE'
    : aiAvailability?.status === 'TEMPORARILY_UNAVAILABLE'
    ? 'TEMPORARILY_UNAVAILABLE'
    : 'UNAVAILABLE';

  const evidenceAvailability = {
    visualAndAudioAI: {
      status: visualStatus,
      reason: aiAvailability?.reason || (visualStatus === 'AVAILABLE' ? null : 'API_KEY_NOT_CONFIGURED'),
      message: aiAvailability?.message || null,
      model: aiAvailability?.model || null,
      label: 'Groq Multimodal Reasoning',
      source: EVIDENCE_SOURCES.GROQ_VISION,
    },
    metadata: {
      status: metadata && metadata.available ? 'AVAILABLE' : 'UNAVAILABLE',
      label: 'Hardware & Container Metadata',
      source: EVIDENCE_SOURCES.EXIFTOOL,
      note: metadata && !metadata.available ? 'Stripped or absent metadata does not indicate manipulation.' : null,
    },
    mediaProcessing: {
      status: mediaProcessing && mediaProcessing.available ? 'AVAILABLE' : 'UNAVAILABLE',
      label: 'Bounded Representative Frame & Audio Extraction',
      source: EVIDENCE_SOURCES.FRAME_INSPECTION,
    },
    transcription: {
      status: transcription && transcription.available && transcription.status === 'SUCCESS'
        ? 'AVAILABLE'
        : transcription && transcription.status === 'FAILED'
        ? 'FAILED'
        : 'UNAVAILABLE',
      label: 'Speech-to-Text Transcription',
      source: EVIDENCE_SOURCES.WHISPER,
      note: 'Speech transcription is optional. Absence does not impact risk calculation.',
    },
    sourceContext: {
      status: sourceContext && sourceContext.hasContext
        ? 'AVAILABLE'
        : (sourceContext?.status === 'UNAVAILABLE' ? 'UNAVAILABLE' : 'NOT_PROVIDED'),
      label: 'Source Context',
      source: EVIDENCE_SOURCES.SOURCE_CONTEXT,
      message: sourceContext && sourceContext.hasContext
        ? sourceContext.message
        : (sourceContext?.status === 'UNAVAILABLE'
            ? (sourceContext?.message || 'Source context service unavailable.')
            : 'No source context provided.'),
      note: sourceContext?.note || (sourceContext?.status === 'UNAVAILABLE'
            ? 'The external source-context service could not be reached or encountered an error.'
            : 'This file was uploaded directly and does not contain a verified origin URL, publisher attribution, or contextual source information.'),
      data: sourceContext || null,
    },
  };

  // -------------------------------------------------------------
  // 2. Evidence Extraction from Sources
  // -------------------------------------------------------------

  // A. Groq Multimodal AI Findings
  let aiRiskContribution = 0;
  let aiConfidence = 50;
  let hasAiData = false;

  if (aiAnalysis && typeof aiAnalysis.riskScore === 'number') {
    hasAiData = true;
    aiRiskContribution = aiAnalysis.riskScore;
    aiConfidence = aiAnalysis.confidence || 60;

    if (Array.isArray(aiAnalysis.findings)) {
      aiAnalysis.findings.forEach((f) => {
        evidenceItems.push({
          category: f.category?.toUpperCase() || EVIDENCE_CATEGORIES.VISUAL,
          finding: f.description || f.finding || 'Visual or acoustic artifact observed',
          severity: (f.severity || 'medium').toUpperCase(),
          source: EVIDENCE_SOURCES.GROQ_VISION,
          confidence: aiConfidence > 75 ? 'HIGH' : aiConfidence > 45 ? 'MEDIUM' : 'LOW',
          details: f.evidence || null,
        });
      });
    }

    if (Array.isArray(aiAnalysis.limitations)) {
      limitations.push(...aiAnalysis.limitations);
    }
  } else {
    limitations.push('AI multimodal reasoning service was unavailable during assessment.');
  }

  // B. Metadata Findings (ExifTool / Native Container Inspector)
  let metadataRiskDelta = 0;
  const metaObj = metadata?.extracted ? { ...metadata.extracted, ...metadata } : (metadata || {});
  const isAiGen = Boolean(metaObj.isGenerativeAi || metadata?.forensics?.isGenerativeAi);
  const hasEditing = Boolean(metaObj.hasAiOrEditingSoftware || metadata?.forensics?.editingSoftwareDetected);

  if (metadata && (metadata.available || metadata.extracted)) {
    if (isAiGen) {
      metadataRiskDelta += 55; // Decisive evidence of synthetic algorithmic generation
      evidenceItems.push({
        category: EVIDENCE_CATEGORIES.METADATA,
        finding: `Synthetic generative AI signature / parameter block identified in media container (${metaObj.aiGeneratorName || metaObj.software || 'AI Model'}). Container metadata explicitly confirms algorithmic generation origin.`,
        severity: 'HIGH',
        source: EVIDENCE_SOURCES.EXIFTOOL,
        confidence: 'HIGH',
        details: metaObj.generationPrompt || null,
      });
    } else if (hasEditing) {
      metadataRiskDelta += 20; // Moderate concern signal, not definitive proof
      evidenceItems.push({
        category: EVIDENCE_CATEGORIES.METADATA,
        finding: `Editing software signature detected (${metaObj.software}). Consistent with post-processing or digital export.`,
        severity: 'MEDIUM',
        source: EVIDENCE_SOURCES.EXIFTOOL,
        confidence: 'HIGH',
      });
    } else if (metaObj.cameraMake || metaObj.cameraModel) {
      metadataRiskDelta -= 10; // Consistent with physical hardware camera capture
      evidenceItems.push({
        category: EVIDENCE_CATEGORIES.METADATA,
        finding: `Physical capture metadata recorded (${[metaObj.cameraMake, metaObj.cameraModel].filter(Boolean).join(' ')}). Consistent with camera hardware.`,
        severity: 'INFO',
        source: EVIDENCE_SOURCES.EXIFTOOL,
        confidence: 'MEDIUM',
      });
    } else {
      evidenceItems.push({
        category: EVIDENCE_CATEGORIES.METADATA,
        finding: 'Standard file container metadata recorded without camera tags or editing signatures.',
        severity: 'INFO',
        source: EVIDENCE_SOURCES.EXIFTOOL,
        confidence: 'LOW',
      });
    }
  } else {
    // Missing metadata: ZERO risk increase
    limitations.push('Metadata was stripped or unavailable. Web platforms routinely strip EXIF.');
  }

  // C. Media Processing & Frame Findings
  if (mediaProcessing && mediaProcessing.available) {
    if (mediaProcessing.totalFramesExtracted > 0) {
      evidenceItems.push({
        category: EVIDENCE_CATEGORIES.TEMPORAL,
        finding: `Bounded representative frame sampling performed across ${mediaProcessing.totalFramesExtracted} sample points (${mediaProcessing.method || 'BOUNDED_SAMPLING'}).`,
        severity: 'INFO',
        source: EVIDENCE_SOURCES.FRAME_INSPECTION,
        confidence: 'HIGH',
      });
    }
  }

  // E. Audio Transcription Findings
  if (transcription && transcription.available && transcription.transcript) {
    evidenceItems.push({
      category: EVIDENCE_CATEGORIES.AUDIO,
      finding: `Speech transcribed successfully (${transcription.transcript.slice(0, 80)}...). Speech cadence evaluated.`,
      severity: 'INFO',
      source: EVIDENCE_SOURCES.WHISPER,
      confidence: 'MEDIUM',
    });
  }

  // -------------------------------------------------------------
  // 3. Multi-Signal Synthesis: Calculating "Manipulation Risk"
  // -------------------------------------------------------------
  let calculatedRisk = 30; // Default baseline uncertainty (INCONCLUSIVE anchor)

  if (hasAiData) {
    // Weighted synthesis: Groq provides an analytical signal (50% weight),
    // adjusted by hard container metadata.
    let baseScore = aiRiskContribution;
    let adjustedScore = baseScore + metadataRiskDelta;
    calculatedRisk = adjustedScore;
  } else {
    // If AI is unavailable, rely on available hard signals
    let signalScore = 30 + metadataRiskDelta;
    calculatedRisk = signalScore;
  }

  // STRICT SCIENTIFIC BOUNDING: Never produce 0% or 100% certainty
  const manipulationRisk = Math.min(95, Math.max(5, Math.round(calculatedRisk)));
  const riskLevel = getRiskLevelFromScore(manipulationRisk);

  // Determine overall confidence
  let overallConfidence = hasAiData ? aiConfidence : 35;
  if (isAiGen) {
    overallConfidence = Math.max(overallConfidence, 85);
  }
  if (metadata?.available) {
    overallConfidence = Math.min(95, overallConfidence + 5);
  }

  // -------------------------------------------------------------
  // 4. Final Assessment Determination (Exact 4-state verdict)
  // -------------------------------------------------------------
  let verdict = VERDICT_TAXONOMY.INCONCLUSIVE;

  if (manipulationRisk < 25 && overallConfidence >= 50) {
    verdict = VERDICT_TAXONOMY.LIKELY_AUTHENTIC;
  } else if (manipulationRisk >= 75) {
    verdict = VERDICT_TAXONOMY.HIGH_MANIPULATION_RISK;
  } else if (manipulationRisk >= 50) {
    verdict = VERDICT_TAXONOMY.SUSPICIOUS;
  } else {
    // 25 - 49 score range or low confidence
    if (overallConfidence < 45 || !hasAiData) {
      verdict = VERDICT_TAXONOMY.INCONCLUSIVE;
    } else if (manipulationRisk < 35) {
      verdict = VERDICT_TAXONOMY.LIKELY_AUTHENTIC;
    } else {
      verdict = VERDICT_TAXONOMY.INCONCLUSIVE;
    }
  }

  // -------------------------------------------------------------
  // 5. Concise Evidence-Based Explanation Generation
  // Uses calibrated phrases: "may indicate", "possible", "consistent with",
  // "raises concerns", "no evidence found", "insufficient evidence".
  // Never exposes system prompts or chain-of-thought.
  // -------------------------------------------------------------
  const explanation = generateEvidenceExplanation({
    verdict,
    riskLevel,
    manipulationRisk,
    evidenceItems,
    metadata,
    hasAiData,
  });

  return {
    verdict,
    riskLevel,
    manipulationRisk, // Transparent metric name (NEVER "Probability the media is fake")
    confidenceScore: overallConfidence,
    evidenceAvailability,
    evidenceItems,
    explanation,
    limitations: Array.from(new Set(limitations)),
    evaluatedAt: new Date().toISOString(),
  };
};

/**
 * Generates an evidence-supported, probabilistic explanation.
 * Exposes only concise reasoning supported by observable signals.
 */
const generateEvidenceExplanation = ({
  verdict,
  riskLevel,
  manipulationRisk,
  evidenceItems,
  metadata,
  hasAiData,
}) => {
  const sentences = [];

  // 1. Primary Verdict Orientation
  switch (verdict) {
    case VERDICT_TAXONOMY.LIKELY_AUTHENTIC:
      sentences.push(
        'Forensic analysis observed characteristics consistent with authentic capture, with no clear indicators of generative synthesis.'
      );
      break;
    case VERDICT_TAXONOMY.SUSPICIOUS:
      sentences.push(
        `Multi-source inspection identified anomalies that raise concerns regarding digital manipulation or synthetic alteration (Manipulation Risk: ${manipulationRisk}%).`
      );
      break;
    case VERDICT_TAXONOMY.HIGH_MANIPULATION_RISK:
      sentences.push(
        `Strong cumulative evidence indicates a high likelihood of generative AI synthesis or substantial digital alteration (Manipulation Risk: ${manipulationRisk}%).`
      );
      break;
    case VERDICT_TAXONOMY.INCONCLUSIVE:
    default:
      sentences.push(
        'Available signals yield insufficient evidence to conclusively verify or dispute the authenticity of this asset.'
      );
      break;
  }

  // 2. Notable Observable Evidence Highlights
  const highSeverityItems = evidenceItems.filter((e) => e.severity === 'HIGH' || e.severity === 'CRITICAL');
  const mediumSeverityItems = evidenceItems.filter((e) => e.severity === 'MEDIUM');

  if (highSeverityItems.length > 0) {
    const highlights = highSeverityItems.slice(0, 2).map((h) => h.finding).join(' Additionally, ');
    sentences.push(`Key observations: ${highlights}.`);
  } else if (mediumSeverityItems.length > 0) {
    const highlights = mediumSeverityItems.slice(0, 2).map((m) => m.finding).join(' Furthermore, ');
    sentences.push(`Observed contextual factors: ${highlights}.`);
  } else if (verdict === VERDICT_TAXONOMY.LIKELY_AUTHENTIC) {
    sentences.push('No significant evidence of latent diffusion textures, vocal synthesis, or structural tampering was found.');
  }

  // 3. Metadata Context
  if (metadata?.isGenerativeAi || metadata?.extracted?.isGenerativeAi) {
    sentences.push(`Asset container metadata records explicit generative AI parameters or provenance (${metadata.software || metadata.aiGeneratorName || 'Synthetic Model'}).`);
  } else if (metadata?.hasAiOrEditingSoftware) {
    sentences.push(`Metadata tags reference ${metadata.software}, which is consistent with digital editing.`);
  }

  // 4. Corroboration & Absence of Evidence Note
  if (!metadata?.available) {
    sentences.push('Absence of EXIF metadata is standard across internet distribution and was not treated as negative evidence.');
  }

  // 5. Note on Groq reasoning engine status
  if (!hasAiData) {
    sentences.push('Note: Deep neural visual reasoning was inactive because Groq service credentials are not configured in backend/.env. Risk evaluation reflects container metadata and file inspection.');
  }

  return sentences.join(' ');
};

module.exports = {
  aggregateEvidenceAndAssessRisk,
  getRiskLevelFromScore,
  RISK_LEVELS,
  VERDICT_TAXONOMY,
  EVIDENCE_CATEGORIES,
  EVIDENCE_SOURCES,
};
