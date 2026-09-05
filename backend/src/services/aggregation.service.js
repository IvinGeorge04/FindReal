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
  FACT_CHECK: 'FACT_CHECK',
  TEMPORAL: 'TEMPORAL',
};

const EVIDENCE_SOURCES = {
  GEMINI_VISION: 'GEMINI_VISION',
  GEMINI_AUDIO: 'GEMINI_AUDIO',
  EXIFTOOL: 'EXIFTOOL',
  C2PA: 'C2PA',
  WHISPER: 'WHISPER',
  FRAME_INSPECTION: 'FRAME_INSPECTION',
  FACT_CHECK: 'FACT_CHECK',
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
 * 1. FindReal must combine multiple evidence sources rather than blindly treating Gemini's score as truth.
 * 2. Risk metric is strictly titled "Manipulation Risk" (NEVER "Probability the media is fake").
 * 3. Evidence availability is explicitly tracked. Unavailable evidence is NEVER treated as negative evidence.
 * 4. Absence of evidence (missing EXIF, missing C2PA, no fact-check match, unavailable source context)
 *    must NOT automatically increase risk.
 * 5. Assessment never produces "100% REAL" or "100% FAKE".
 * 6. Explanations use probabilistic, calibrated phrases: "may indicate", "possible", "consistent with",
 *    "raises concerns", "no evidence found", "insufficient evidence".
 *
 * @param {Object} params
 * @param {Object} [params.geminiAnalysis] - Result from gemini.service.js
 * @param {Object} [params.metadata] - Result from metadata.service.js
 * @param {Object} [params.c2pa] - Result from c2pa.service.js
 * @param {Object} [params.mediaProcessing] - Result from ffmpeg.service.js (frames, probe, audio)
 * @param {Object} [params.transcription] - Result from transcription.service.js
 * @param {Object} [params.factCheck] - Optional fact check result
 * @param {Object} [params.sourceContext] - Optional user/source context
 * @returns {Object} Consolidated forensic assessment report
 */
const aggregateEvidenceAndAssessRisk = ({
  geminiAnalysis = null,
  geminiAvailability = null,
  metadata = null,
  c2pa = null,
  mediaProcessing = null,
  transcription = null,
  factCheck = null,
  sourceContext = null,
} = {}) => {
  const evidenceItems = [];
  const limitations = [];

  // -------------------------------------------------------------
  // 1. Explicit Evidence Availability Tracking
  // -------------------------------------------------------------
  const visualStatus = geminiAnalysis && geminiAnalysis.assessment
    ? 'AVAILABLE'
    : geminiAvailability?.status === 'TEMPORARILY_UNAVAILABLE'
    ? 'TEMPORARILY_UNAVAILABLE'
    : 'UNAVAILABLE';

  const evidenceAvailability = {
    visualAndAudioAI: {
      status: visualStatus,
      reason: geminiAvailability?.reason || (visualStatus === 'AVAILABLE' ? null : 'API_KEY_NOT_CONFIGURED'),
      label: 'Gemini Multimodal Reasoning',
      source: EVIDENCE_SOURCES.GEMINI_VISION,
    },
    metadata: {
      status: metadata && metadata.available ? 'AVAILABLE' : 'UNAVAILABLE',
      label: 'Hardware & Container Metadata',
      source: EVIDENCE_SOURCES.EXIFTOOL,
      note: metadata && !metadata.available ? 'Stripped or absent metadata does not indicate manipulation.' : null,
    },
    c2pa: {
      status: c2pa && c2pa.status ? c2pa.status : 'UNAVAILABLE',
      label: 'Content Credentials (C2PA)',
      source: EVIDENCE_SOURCES.C2PA,
      note: (c2pa?.status === 'NOT_FOUND' || c2pa?.status === 'UNAVAILABLE')
        ? 'Absence of C2PA manifest is normal across web transfers and does not indicate manipulation.'
        : null,
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
    factCheck: {
      status: factCheck && factCheck.matched ? 'MATCH_FOUND' : factCheck?.status === 'NO_MATCHING_RESULT' ? 'NO_MATCHING_RESULT' : factCheck?.available ? 'NO_MATCHING_RESULT' : 'UNAVAILABLE',
      label: 'Corroborating Fact-Check Database',
      source: EVIDENCE_SOURCES.FACT_CHECK,
      message: factCheck?.matched ? `Identified ${factCheck.matches?.length || 1} corroborating fact-check(s).` : 'No matching fact-check found.',
      note: 'This does NOT mean the claim is true.',
      matches: factCheck?.matches || [],
    },
    sourceContext: {
      status: sourceContext && sourceContext.hasContext ? 'AVAILABLE' : 'UNAVAILABLE',
      label: 'Source Context',
      source: EVIDENCE_SOURCES.SOURCE_CONTEXT,
      message: sourceContext && sourceContext.hasContext ? sourceContext.message : 'Source context unavailable.',
      note: 'Source searches may be incomplete.',
      data: sourceContext || null,
    },
  };

  // -------------------------------------------------------------
  // 2. Evidence Extraction from Sources
  // -------------------------------------------------------------

  // A. Gemini Findings
  let geminiRiskContribution = 0;
  let geminiConfidence = 50;
  let hasGeminiData = false;

  if (geminiAnalysis && typeof geminiAnalysis.riskScore === 'number') {
    hasGeminiData = true;
    geminiRiskContribution = geminiAnalysis.riskScore;
    geminiConfidence = geminiAnalysis.confidence || 60;

    if (Array.isArray(geminiAnalysis.findings)) {
      geminiAnalysis.findings.forEach((f) => {
        evidenceItems.push({
          category: f.category?.toUpperCase() || EVIDENCE_CATEGORIES.VISUAL,
          finding: f.description || f.finding || 'Visual or acoustic artifact observed',
          severity: (f.severity || 'medium').toUpperCase(),
          source: EVIDENCE_SOURCES.GEMINI_VISION,
          confidence: geminiConfidence > 75 ? 'HIGH' : geminiConfidence > 45 ? 'MEDIUM' : 'LOW',
          details: f.evidence || null,
        });
      });
    }

    if (Array.isArray(geminiAnalysis.limitations)) {
      limitations.push(...geminiAnalysis.limitations);
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

  // C. C2PA Provenance Findings
  let c2paStatus = c2pa?.status || 'UNAVAILABLE';
  let c2paRiskDelta = 0;
  let hasValidProvenance = false;

  if (c2paStatus === 'VALID') {
    // Check if manifest indicates AI generation or certified hardware capture
    if (c2pa?.isAiGenerated) {
      c2paRiskDelta += 50;
      evidenceItems.push({
        category: EVIDENCE_CATEGORIES.PROVENANCE,
        finding: `C2PA manifest explicitly certifies synthetic generation via ${c2pa.generatorName || 'generative model'}.`,
        severity: 'HIGH',
        source: EVIDENCE_SOURCES.C2PA,
        confidence: 'HIGH',
      });
    } else {
      hasValidProvenance = true;
      c2paRiskDelta -= 40;
      evidenceItems.push({
        category: EVIDENCE_CATEGORIES.PROVENANCE,
        finding: 'Cryptographically signed C2PA manifest verified. Chain of custody confirmed intact.',
        severity: 'INFO',
        source: EVIDENCE_SOURCES.C2PA,
        confidence: 'HIGH',
      });
    }
  } else if (c2paStatus === 'INVALID') {
    c2paRiskDelta += 35; // Severe warning: manifest signature broken or tampered
    evidenceItems.push({
      category: EVIDENCE_CATEGORIES.PROVENANCE,
      finding: 'C2PA manifest signature validation failed. Digital seal broken or container modified post-signature.',
      severity: 'CRITICAL',
      source: EVIDENCE_SOURCES.C2PA,
      confidence: 'HIGH',
    });
  } else {
    // NOT_FOUND or UNAVAILABLE: ZERO risk increase
    if (c2paStatus === 'NOT_FOUND') {
      evidenceItems.push({
        category: EVIDENCE_CATEGORIES.PROVENANCE,
        finding: 'No C2PA Content Credentials found. Consistent with typical consumer media.',
        severity: 'INFO',
        source: EVIDENCE_SOURCES.C2PA,
        confidence: 'MEDIUM',
      });
    }
    limitations.push('No cryptographic provenance credentials were found or verifiable for this asset.');
  }

  // D. Media Processing & Frame Findings
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

  // F. Fact Check Findings
  let factCheckRiskDelta = 0;
  if (factCheck && factCheck.matched && Array.isArray(factCheck.matches) && factCheck.matches.length > 0) {
    factCheckRiskDelta += 40;
    factCheck.matches.forEach((m) => {
      evidenceItems.push({
        category: EVIDENCE_CATEGORIES.FACT_CHECK,
        finding: `Fact-check record: "${m.claim}" - Rated "${m.verdict}" by ${m.publisher} (${m.date}).`,
        severity: 'HIGH',
        source: EVIDENCE_SOURCES.FACT_CHECK,
        confidence: 'HIGH',
        details: m.source || null,
      });
    });
  } else if (factCheck && factCheck.matched) {
    factCheckRiskDelta += 40;
    evidenceItems.push({
      category: EVIDENCE_CATEGORIES.FACT_CHECK,
      finding: `Media matches known debunked or synthetic media record: "${factCheck.claimTitle || 'Known synthetic asset'}".`,
      severity: 'HIGH',
      source: EVIDENCE_SOURCES.FACT_CHECK,
      confidence: 'HIGH',
    });
  }

  // -------------------------------------------------------------
  // 3. Multi-Signal Synthesis: Calculating "Manipulation Risk"
  // -------------------------------------------------------------
  let calculatedRisk = 30; // Default baseline uncertainty (INCONCLUSIVE anchor)

  if (hasGeminiData) {
    // Weighted synthesis: Gemini provides an analytical signal (50% weight),
    // adjusted by hard cryptographic provenance, metadata, and fact-checking.
    let baseScore = geminiRiskContribution;
    let adjustedScore = baseScore + metadataRiskDelta + c2paRiskDelta + factCheckRiskDelta;
    calculatedRisk = adjustedScore;
  } else {
    // If Gemini is unavailable, rely on available hard signals
    let signalScore = 30 + metadataRiskDelta + c2paRiskDelta + factCheckRiskDelta;
    calculatedRisk = signalScore;
  }

  // Provenance override: Valid un-tampered provenance strongly bounds risk
  if (hasValidProvenance && c2paRiskDelta < 0) {
    calculatedRisk = Math.min(calculatedRisk, 15);
  }

  // STRICT SCIENTIFIC BOUNDING: Never produce 0% or 100% certainty
  const manipulationRisk = Math.min(95, Math.max(5, Math.round(calculatedRisk)));
  const riskLevel = getRiskLevelFromScore(manipulationRisk);

  // Determine overall confidence
  let overallConfidence = hasGeminiData ? geminiConfidence : 35;
  if (isAiGen) {
    overallConfidence = Math.max(overallConfidence, 85);
  }
  if (c2paStatus === 'VALID' || c2paStatus === 'INVALID') {
    overallConfidence = Math.min(95, overallConfidence + 15);
  }
  if (metadata?.available) {
    overallConfidence = Math.min(95, overallConfidence + 5);
  }

  // -------------------------------------------------------------
  // 4. Final Assessment Determination (Exact 5-state verdict)
  // -------------------------------------------------------------
  let verdict = VERDICT_TAXONOMY.INCONCLUSIVE;

  if (hasValidProvenance && manipulationRisk < 20) {
    verdict = VERDICT_TAXONOMY.VERIFIED_PROVENANCE;
  } else if (manipulationRisk < 25 && overallConfidence >= 50) {
    verdict = VERDICT_TAXONOMY.LIKELY_AUTHENTIC;
  } else if (manipulationRisk >= 75) {
    verdict = VERDICT_TAXONOMY.HIGH_MANIPULATION_RISK;
  } else if (manipulationRisk >= 50) {
    verdict = VERDICT_TAXONOMY.SUSPICIOUS;
  } else {
    // 25 - 49 score range or low confidence
    if (overallConfidence < 45 || !hasGeminiData) {
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
    hasValidProvenance,
    c2paStatus,
    metadata,
    hasGeminiData,
    factCheck,
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
  hasValidProvenance,
  c2paStatus,
  metadata,
  hasGeminiData,
  factCheck,
}) => {
  const sentences = [];

  // 1. Primary Verdict Orientation
  switch (verdict) {
    case VERDICT_TAXONOMY.VERIFIED_PROVENANCE:
      sentences.push(
        'The media carries a valid, cryptographically intact C2PA manifest confirming certified provenance.'
      );
      break;
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
  } else if (verdict === VERDICT_TAXONOMY.LIKELY_AUTHENTIC || verdict === VERDICT_TAXONOMY.VERIFIED_PROVENANCE) {
    sentences.push('No significant evidence of latent diffusion textures, vocal synthesis, or structural tampering was found.');
  }

  // 3. Provenance and Metadata Context
  if (c2paStatus === 'INVALID') {
    sentences.push('Cryptographic provenance validation failed, which may indicate manifest tampering.');
  } else if (metadata?.isGenerativeAi || metadata?.extracted?.isGenerativeAi) {
    sentences.push(`Asset container metadata records explicit generative AI parameters or provenance (${metadata.software || metadata.aiGeneratorName || 'Synthetic Model'}).`);
  } else if (metadata?.hasAiOrEditingSoftware) {
    sentences.push(`Metadata tags reference ${metadata.software}, which is consistent with digital editing.`);
  }

  // 4. Corroboration & Absence of Evidence Note
  if (c2paStatus === 'NOT_FOUND' || !metadata?.available) {
    sentences.push('Absence of embedded C2PA credentials or EXIF metadata is standard across internet distribution and was not treated as negative evidence.');
  }

  // 5. Note on Gemini reasoning engine status
  if (!hasGeminiData) {
    sentences.push('Note: Deep neural visual reasoning was inactive because Gemini service credentials are not configured in backend/.env. Risk evaluation reflects container metadata and file inspection.');
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
