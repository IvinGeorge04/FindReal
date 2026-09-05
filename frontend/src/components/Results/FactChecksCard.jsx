import React from 'react';
import { CheckSquare, AlertTriangle, Info, ExternalLink, Calendar, Building2 } from 'lucide-react';
import './ResultCard.css';

/**
 * FactChecksCard
 * Displays corroborated fact-check findings from Google Fact Check Tools API.
 * 
 * Strict Guidelines:
 * - Never invent fact-check results.
 * - If no match: "No matching fact-check found."
 * - Clearly state: "This does NOT mean the claim is true."
 * - Treat external content as untrusted; render as safe plain text.
 */
export default function FactChecksCard({ factCheck, availability }) {
  const matches = Array.isArray(factCheck?.matches) 
    ? factCheck.matches 
    : Array.isArray(availability?.matches) 
    ? availability.matches 
    : [];

  const isMatch = (availability?.status === 'MATCH_FOUND' || factCheck?.matched) && matches.length > 0;
  const isUnconfigured = availability?.status === 'UNAVAILABLE' && !factCheck?.matched;

  return (
    <section className="result-card" aria-labelledby="fact-checks-title">
      <div className="result-card__header">
        <div className="result-card__title-group">
          <div className="result-card__icon-badge">
            <CheckSquare size={18} aria-hidden="true" />
          </div>
          <h2 id="fact-checks-title" className="result-card__title">
            Fact Checks
          </h2>
        </div>
        <span className={`status-pill status-pill--${isMatch ? 'suspicious' : 'neutral'}`}>
          {isMatch ? `${matches.length} Match Found` : isUnconfigured ? 'API Unavailable' : 'No Match Found'}
        </span>
      </div>

      <div className="result-card__body">
        {isMatch ? (
          <div className="fact-checks-list">
            {matches.map((item, idx) => (
              <article key={idx} className="fact-check-match-box">
                <div className="fact-check-match-box__header">
                  <div className="fact-check-verdict-badge">
                    <AlertTriangle size={14} className="text-warning" aria-hidden="true" />
                    <span>Verdict: {String(item.verdict || 'Reviewed')}</span>
                  </div>
                  {item.date && (
                    <span className="fact-check-date">
                      <Calendar size={12} aria-hidden="true" />
                      <span>{String(item.date)}</span>
                    </span>
                  )}
                </div>

                <div className="fact-check-claim-group">
                  <span className="fact-check-label">Claim:</span>
                  <p className="fact-check-claim-text">{String(item.claim)}</p>
                </div>

                <div className="fact-check-publisher-row">
                  <span className="fact-check-publisher">
                    <Building2 size={13} aria-hidden="true" />
                    <span>Publisher: {String(item.publisher || 'Independent Fact-Checker')}</span>
                  </span>

                  {item.source && (
                    <a
                      href={item.source}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="fact-check-source-link"
                    >
                      <span>Review Source</span>
                      <ExternalLink size={12} aria-hidden="true" />
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="unavailable-state">
            <Info size={18} className="unavailable-state__icon text-info" aria-hidden="true" />
            <div className="unavailable-state__text">
              <strong>No matching fact-check found.</strong>
              <p>
                No matching fact-check records were found in authoritative verification databases for this media or extracted statements.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="result-card__footer">
        <span className="forensic-notice">
          <strong>Crucial Principle:</strong> "No matching fact-check found" does NOT mean the claim is true. Unindexed or novel claims will not have pre-existing fact-check records.
        </span>
      </div>
    </section>
  );
}
