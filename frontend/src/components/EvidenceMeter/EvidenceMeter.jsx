import React from 'react';
import { Info } from 'lucide-react';
import './EvidenceMeter.css';

/**
 * EvidenceMeter
 * Renders an accessible, probabilistic score gauge.
 * Adheres strictly to non-absolute certainty guidelines.
 */
export default function EvidenceMeter({
  value = 50,
  label = 'Manipulation Risk Probability',
  description = 'Probabilistic score based on multi-modal forensic inspection',
  verdict = 'INCONCLUSIVE',
  className = '',
}) {
  // Clamp value between 0 and 100
  const clampedValue = Math.min(Math.max(Math.round(value), 0), 100);

  // Determine indicator color level
  let meterVariant = 'inconclusive';
  if (clampedValue <= 25) {
    meterVariant = 'verified';
  } else if (clampedValue <= 45) {
    meterVariant = 'authentic';
  } else if (clampedValue <= 65) {
    meterVariant = 'inconclusive';
  } else if (clampedValue <= 80) {
    meterVariant = 'suspicious';
  } else {
    meterVariant = 'danger';
  }

  return (
    <div className={`evidence-meter ${className}`}>
      <div className="evidence-meter__header">
        <div className="evidence-meter__title-group">
          <label className="evidence-meter__label" id={`meter-label-${clampedValue}`}>
            {label}
          </label>
          <span className="evidence-meter__limitations">
            (Probabilistic &bull; Never 100% Certain)
          </span>
        </div>
        <div className="evidence-meter__value-group">
          <span className="evidence-meter__percentage">{clampedValue}%</span>
        </div>
      </div>

      {/* Accessible Meter Bar */}
      <div
        className="evidence-meter__track"
        role="meter"
        aria-valuenow={clampedValue}
        aria-valuemin="0"
        aria-valuemax="100"
        aria-labelledby={`meter-label-${clampedValue}`}
        aria-valuetext={`${clampedValue}% ${label} - Probabilistic assessment`}
      >
        <div
          className={`evidence-meter__fill evidence-meter__fill--${meterVariant}`}
          style={{ width: `${clampedValue}%` }}
        />
      </div>

      <div className="evidence-meter__footer">
        <p className="evidence-meter__description">
          <Info size={14} className="evidence-meter__info-icon" aria-hidden="true" />
          <span>{description}</span>
        </p>
      </div>
    </div>
  );
}
