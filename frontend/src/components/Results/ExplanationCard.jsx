import React from 'react';
import { HelpCircle, FileText, CheckCircle2 } from 'lucide-react';
import './ResultCard.css';

export default function ExplanationCard({ explanation, verdict, riskLevel }) {
  return (
    <section className="result-card result-card--full" aria-labelledby="explanation-title">
      <div className="result-card__header">
        <div className="result-card__title-group">
          <div className="result-card__icon-badge">
            <HelpCircle size={18} aria-hidden="true" />
          </div>
          <h2 id="explanation-title" className="result-card__title">
            Why did FindReal give this result?
          </h2>
        </div>
        <span className="status-pill status-pill--available">
          Calibrated Synthesis
        </span>
      </div>

      <div className="result-card__body">
        <div className="explanation-content">
          <div className="explanation-callout">
            <p className="explanation-text">
              {explanation ||
                'Available forensic markers, cryptographic manifests, container metadata, and multimodal AI analysis were synthesized to evaluate manipulation likelihood.'}
            </p>
          </div>

          <div className="explanation-methodology">
            <h3 className="explanation-subhead">Reasoning Framework:</h3>
            <ul className="explanation-points">
              <li>
                <CheckCircle2 size={14} className="text-success" aria-hidden="true" />
                <span>
                  <strong>Evidence-Aware Aggregation:</strong> Analysis combines independent data points rather than trusting a single neural network or heuristic.
                </span>
              </li>
              <li>
                <CheckCircle2 size={14} className="text-success" aria-hidden="true" />
                <span>
                  <strong>Absence of Evidence Respected:</strong> Missing metadata or absent C2PA manifests are treated as neutral distribution realities, never as affirmative proof of forgery.
                </span>
              </li>
              <li>
                <CheckCircle2 size={14} className="text-success" aria-hidden="true" />
                <span>
                  <strong>Probabilistic Calibration:</strong> Confidence levels account for common compression artifacts, web re-encoding, and known detector limitations.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="result-card__footer">
        <span className="forensic-notice">
          Explanations reflect observable empirical evidence without speculative or unverifiable assumptions.
        </span>
      </div>
    </section>
  );
}
