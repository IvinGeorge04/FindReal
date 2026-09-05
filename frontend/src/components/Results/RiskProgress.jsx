import React from 'react';
import { AlertCircle, HelpCircle } from 'lucide-react';
import './RiskProgress.css';

/**
 * RiskProgress
 * Custom progress visualization for Manipulation Risk.
 * 
 * CRITICAL REQUIREMENTS:
 * - Shows: Manipulation Risk
 * - Clearly labeled: "AI-generated risk assessment. Not definitive proof of manipulation."
 * - Does NOT make the number visually resemble scientifically calibrated certainty.
 */
export default function RiskProgress({
  score = 50,
  riskLevel = 'MODERATE CONCERN',
  className = '',
}) {
  const clampedScore = Math.min(Math.max(Math.round(score), 5), 95);

  let variant = 'moderate';
  if (clampedScore < 25) {
    variant = 'low';
  } else if (clampedScore < 50) {
    variant = 'moderate';
  } else if (clampedScore < 75) {
    variant = 'suspicious';
  } else {
    variant = 'high';
  }

  return (
    <div className={`risk-progress-card ${className}`}>
      <div className="risk-progress-card__header">
        <div className="risk-progress-card__title-wrap">
          <span className="risk-progress-card__eyebrow">Risk Evaluation</span>
          <h3 className="risk-progress-card__title">Manipulation Risk</h3>
        </div>
        <div className="risk-progress-card__badge-wrap">
          <span className={`risk-tier-badge risk-tier-badge--${variant}`}>
            {riskLevel}
          </span>
        </div>
      </div>

      <div className="risk-progress-card__score-row">
        <div className="risk-progress-card__numeric-display">
          <span className="risk-progress-card__number">{clampedScore}%</span>
          <span className="risk-progress-card__scale">/ 100</span>
        </div>
        <span className="risk-progress-card__nature-indicator">
          Indicative Score &bull; Non-Deterministic
        </span>
      </div>

      {/* Stepped Segments Bar to discourage false scientific precision */}
      <div 
        className="risk-progress-card__track"
        role="meter"
        aria-valuenow={clampedScore}
        aria-valuemin="0"
        aria-valuemax="100"
        aria-label={`Manipulation Risk: ${clampedScore}% (${riskLevel})`}
      >
        <div
          className={`risk-progress-card__fill risk-progress-card__fill--${variant}`}
          style={{ width: `${clampedScore}%` }}
        />
        <div className="risk-progress-card__markers">
          <span className="risk-marker" style={{ left: '25%' }} title="Low / Moderate boundary" />
          <span className="risk-marker" style={{ left: '50%' }} title="Moderate / Suspicious boundary" />
          <span className="risk-marker" style={{ left: '75%' }} title="Suspicious / High boundary" />
        </div>
      </div>

      <div className="risk-progress-card__labels">
        <span>Low Concern (0-24%)</span>
        <span>Moderate (25-49%)</span>
        <span>Suspicious (50-74%)</span>
        <span>High (75-100%)</span>
      </div>

      {/* Mandatory Calibration & Non-Definitive Proof Disclaimer */}
      <div className="risk-progress-card__disclaimer" role="note">
        <AlertCircle size={16} className="risk-progress-card__disclaimer-icon" aria-hidden="true" />
        <p className="risk-progress-card__disclaimer-text">
          <strong>AI-generated risk assessment. Not definitive proof of manipulation.</strong>{' '}
          Scores represent a probabilistic synthesis of available signals and must not be treated as absolute certainty.
        </p>
      </div>
    </div>
  );
}
