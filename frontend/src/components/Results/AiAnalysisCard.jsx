import React from 'react';
import { Cpu, CheckCircle, AlertCircle, Eye, Volume2, Video } from 'lucide-react';
import './ResultCard.css';

export default function AiAnalysisCard({ aiAnalysis, availability }) {
  const isAvailable = availability?.status === 'AVAILABLE' && Boolean(aiAnalysis);
  const reason = availability?.reason || '';

  // Determine status pill and descriptive messaging for Groq AI engine:
  // - missing key -> configuration error
  // - invalid key -> authentication error
  // - quota/rate limit -> rate limit error
  // - unavailable model -> model error
  // - temporary service issue -> service unavailable
  // - successful Groq request -> active
  let statusPillText = 'Unavailable';
  let statusPillClass = 'unavailable';
  let errorTitle = 'Multimodal AI Engine Unavailable';
  let errorDescription = 'Groq API is not configured on the server. In adherence to FindReal’s non-fabrication policy, visual scores are not simulated.';

  if (isAvailable) {
    statusPillText = 'Active';
    statusPillClass = 'available';
  } else if (reason === 'GROQ_AUTH_ERROR' || reason === 'API_KEY_INVALID') {
    statusPillText = 'Authentication Error';
    statusPillClass = 'unavailable';
    errorTitle = 'Groq Authentication Error';
    errorDescription = 'The configured GROQ_API_KEY was rejected by Groq API. Please check your credentials in backend/.env. In adherence to FindReal’s non-fabrication policy, visual scores are not simulated.';
  } else if (reason === 'GROQ_RATE_LIMITED' || reason === 'QUOTA_EXCEEDED') {
    statusPillText = 'Rate Limited';
    statusPillClass = 'warning';
    errorTitle = 'Groq Rate Limit Exceeded';
    errorDescription = 'Groq API request quota or rate limit has been reached. In adherence to FindReal’s non-fabrication policy, visual scores are not simulated.';
  } else if (reason === 'GROQ_MODEL_UNAVAILABLE' || reason === 'MODEL_UNAVAILABLE') {
    statusPillText = 'Model Error';
    statusPillClass = 'warning';
    errorTitle = 'Groq Model Unavailable';
    errorDescription = 'The configured Groq model is unavailable or retired. In adherence to FindReal’s non-fabrication policy, visual scores are not simulated.';
  } else if (
    availability?.status === 'TEMPORARILY_UNAVAILABLE' ||
    reason === 'GROQ_SERVICE_UNAVAILABLE' ||
    reason === 'GROQ_TIMEOUT' ||
    reason === 'SERVICE_UNAVAILABLE' ||
    reason === 'NETWORK_ERROR' ||
    reason === 'SERVICE_ERROR' ||
    reason === 'REQUEST_FAILED'
  ) {
    statusPillText = 'Service Unavailable';
    statusPillClass = 'warning';
    errorTitle = 'Multimodal AI Engine Temporarily Unavailable';
    errorDescription = 'Visual neural reasoning is temporarily unavailable from the Groq service. In adherence to FindReal’s non-fabrication policy, visual scores are not simulated.';
  } else {
    statusPillText = 'Configuration Error';
    statusPillClass = 'unavailable';
    errorTitle = 'Multimodal AI Engine Inactive';
    errorDescription = 'Visual neural reasoning is currently inactive because GROQ_API_KEY is not configured in backend/.env. In adherence to FindReal’s non-fabrication policy, visual scores are not simulated.';
  }

  return (
    <section className="result-card" aria-labelledby="ai-analysis-title">
      <div className="result-card__header">
        <div className="result-card__title-group">
          <div className="result-card__icon-badge">
            <Cpu size={18} aria-hidden="true" />
          </div>
          <h2 id="ai-analysis-title" className="result-card__title">
            AI Analysis
          </h2>
        </div>
        <span className={`status-pill status-pill--${statusPillClass}`}>
          {statusPillText}
        </span>
      </div>

      <div className="result-card__body">
        {isAvailable ? (
          <div className="ai-analysis-content">
            <div className="ai-analysis-summary-box">
              <span className="ai-analysis-summary-label">Multimodal Forensic Summary:</span>
              <p className="ai-analysis-summary-text">{aiAnalysis.summary}</p>
            </div>

            <div className="ai-inspection-pillars">
              <div className="pillar-item">
                <Eye size={14} className="pillar-item__icon" aria-hidden="true" />
                <span>Spatial & Latent Diffusion Patterns</span>
              </div>
              <div className="pillar-item">
                <Volume2 size={14} className="pillar-item__icon" aria-hidden="true" />
                <span>Synthetic Vocoder & Phase Continuity</span>
              </div>
              <div className="pillar-item">
                <Video size={14} className="pillar-item__icon" aria-hidden="true" />
                <span>Temporal Warp & Facial Boundaries</span>
              </div>
            </div>

            {Array.isArray(aiAnalysis.findings) && aiAnalysis.findings.length > 0 && (
              <div className="ai-findings-list">
                <h3 className="ai-findings-heading">Model Observations ({aiAnalysis.findings.length}):</h3>
                <ul className="ai-findings-items">
                  {aiAnalysis.findings.map((f, i) => (
                    <li key={i} className="ai-finding-item">
                      <span className={`finding-severity finding-severity--${f.severity || 'medium'}`}>
                        {f.severity || 'Observed'}
                      </span>
                      <span className="finding-desc">{f.description}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="unavailable-state">
            <AlertCircle size={18} className="unavailable-state__icon" aria-hidden="true" />
            <div className="unavailable-state__text">
              <strong>{errorTitle}</strong>
              <p>{errorDescription}</p>
            </div>
          </div>
        )}
      </div>

      <div className="result-card__footer">
        <span className="forensic-notice">
          AI reasoning is probabilistic. Models evaluate statistical likelihood, not absolute truth.
        </span>
      </div>
    </section>
  );
}
