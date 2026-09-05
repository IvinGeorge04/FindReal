import React from 'react';
import { Cpu, CheckCircle, AlertCircle, Eye, Volume2, Video } from 'lucide-react';
import './ResultCard.css';

export default function AiAnalysisCard({ aiAnalysis, availability }) {
  const isAvailable = availability?.status === 'AVAILABLE' && Boolean(aiAnalysis);

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
        <span className={`status-pill status-pill--${isAvailable ? 'available' : 'unavailable'}`}>
          {isAvailable ? 'Available' : 'Unavailable'}
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
              <strong>Multimodal AI Engine Inactive</strong>
              <p>
                Visual neural reasoning is currently inactive because <code>GEMINI_API_KEY</code> is not configured in <code>backend/.env</code>. 
                In adherence to FindReal's non-fabrication policy, visual scores are not simulated.
              </p>
              <p className="ai-config-hint" style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary, #94a3b8)' }}>
                💡 <em>Tip: Add your Google Gemini API key to <code>backend/.env</code> to activate visual deepfake & diffusion artifact analysis for images without metadata.</em>
              </p>
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
