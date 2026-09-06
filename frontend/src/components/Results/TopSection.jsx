import React from 'react';
import { 
  Clock, 
  FileText, 
  Percent, 
  ShieldAlert, 
  CheckCircle2,
  Calendar,
  Layers
} from 'lucide-react';
import VerdictBadge from '../VerdictBadge/VerdictBadge';
import RiskProgress from './RiskProgress';
import './TopSection.css';

/**
 * TopSection
 * Title: MEDIA VERIFICATION RESULT
 * Displays: assessment, manipulation risk, confidence, media type, analysis timestamp
 */
export default function TopSection({
  assessment = 'INCONCLUSIVE',
  manipulationRisk = 50,
  riskLevel = 'MODERATE CONCERN',
  confidence = 65,
  mediaType = 'image',
  mediaName = 'Uploaded Media',
  evaluatedAt = new Date().toISOString(),
  fileSize = null,
}) {
  // Format readable timestamp
  const formattedDate = new Date(evaluatedAt).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <header className="results-top-section" aria-labelledby="results-title">
      <div className="results-top-section__header">
        <div className="results-top-section__badge-row">
          <span className="results-top-section__tag">
            <ShieldAlert size={14} aria-hidden="true" />
            <span>Forensic Assessment Dossier</span>
          </span>
          <span className="results-top-section__timestamp">
            <Calendar size={13} aria-hidden="true" />
            <time dateTime={evaluatedAt}>{formattedDate}</time>
          </span>
        </div>

        <h1 id="results-title" className="results-top-section__title">
          MEDIA VERIFICATION RESULT
        </h1>

        <p className="results-top-section__subtitle">
          Probabilistic multi-signal analysis for{' '}
          <strong className="results-top-section__media-name">{mediaName}</strong>
        </p>
      </div>

      <div className="results-top-section__grid">
        {/* Left Column: Primary Verdict & Meta Info */}
        <div className="results-summary-card">
          <div className="results-summary-card__verdict-block">
            <span className="results-summary-card__label">Primary Assessment</span>
            <div className="results-summary-card__verdict-wrap">
              <VerdictBadge verdict={assessment} size="lg" />
            </div>
            <p className="results-summary-card__verdict-subtext">
              Derived from synthesis of container EXIF, acoustic cadences, and multimodal AI indicators.
            </p>
          </div>

          <div className="results-summary-card__meta-stats">
            <div className="meta-stat">
              <div className="meta-stat__icon-wrap">
                <Layers size={16} aria-hidden="true" />
              </div>
              <div className="meta-stat__content">
                <span className="meta-stat__label">Media Type</span>
                <span className="meta-stat__value">{mediaType.toUpperCase()}</span>
              </div>
            </div>

            <div className="meta-stat">
              <div className="meta-stat__icon-wrap">
                <Percent size={16} aria-hidden="true" />
              </div>
              <div className="meta-stat__content">
                <span className="meta-stat__label">Engine Confidence</span>
                <span className="meta-stat__value">{confidence}%</span>
              </div>
            </div>

            <div className="meta-stat">
              <div className="meta-stat__icon-wrap">
                <Clock size={16} aria-hidden="true" />
              </div>
              <div className="meta-stat__content">
                <span className="meta-stat__label">Analysis Completed</span>
                <span className="meta-stat__value">{new Date(evaluatedAt).toLocaleTimeString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Manipulation Risk Visualization */}
        <div className="results-top-section__risk-col">
          <RiskProgress score={manipulationRisk} riskLevel={riskLevel} />
        </div>
      </div>
    </header>
  );
}
