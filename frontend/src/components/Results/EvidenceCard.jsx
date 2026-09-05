import React from 'react';
import { Layers, Shield, AlertTriangle, AlertOctagon, Info, CheckCircle2 } from 'lucide-react';
import './ResultCard.css';

export default function EvidenceCard({ evidenceItems = [] }) {
  const items = Array.isArray(evidenceItems) ? evidenceItems : [];

  const getSeverityIcon = (severity) => {
    switch (String(severity).toUpperCase()) {
      case 'CRITICAL':
      case 'HIGH':
        return <AlertOctagon size={14} className="text-danger" aria-hidden="true" />;
      case 'MEDIUM':
        return <AlertTriangle size={14} className="text-warning" aria-hidden="true" />;
      case 'LOW':
        return <Info size={14} className="text-info" aria-hidden="true" />;
      case 'INFO':
      default:
        return <CheckCircle2 size={14} className="text-success" aria-hidden="true" />;
    }
  };

  return (
    <section className="result-card result-card--full" aria-labelledby="evidence-title">
      <div className="result-card__header">
        <div className="result-card__title-group">
          <div className="result-card__icon-badge">
            <Layers size={18} aria-hidden="true" />
          </div>
          <h2 id="evidence-title" className="result-card__title">
            Evidence Items ({items.length})
          </h2>
        </div>
        <span className="status-pill status-pill--available">
          Itemized Multi-Signal Audit
        </span>
      </div>

      <div className="result-card__body">
        {items.length > 0 ? (
          <div className="evidence-table-container">
            <table className="evidence-table" role="table">
              <thead>
                <tr>
                  <th scope="col">Category</th>
                  <th scope="col">Observed Finding</th>
                  <th scope="col">Severity</th>
                  <th scope="col">Forensic Source</th>
                  <th scope="col">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx} className="evidence-table__row">
                    <td className="evidence-table__category">
                      <span className="category-tag">{item.category || 'GENERAL'}</span>
                    </td>
                    <td className="evidence-table__finding">
                      <span className="finding-text">{item.finding}</span>
                      {item.details && (
                        <span className="finding-details">{item.details}</span>
                      )}
                    </td>
                    <td className="evidence-table__severity">
                      <span className={`severity-badge severity-badge--${String(item.severity || 'info').toLowerCase()}`}>
                        {getSeverityIcon(item.severity)}
                        <span>{item.severity || 'INFO'}</span>
                      </span>
                    </td>
                    <td className="evidence-table__source">
                      <code className="source-code">{item.source || 'DETECTOR'}</code>
                    </td>
                    <td className="evidence-table__confidence">
                      <span className="confidence-pill">
                        {item.confidence || 'MEDIUM'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="unavailable-state">
            <Info size={18} className="unavailable-state__icon text-info" aria-hidden="true" />
            <div className="unavailable-state__text">
              <strong>No Granular Anomalies Flagged</strong>
              <p>
                No specific generative diffusion anomalies, compression breaks, or manifest violations were registered during inspection.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="result-card__footer">
        <span className="forensic-notice">
          Every evidence item represents an individual signal. No single signal alone proves or disproves authenticity.
        </span>
      </div>
    </section>
  );
}
