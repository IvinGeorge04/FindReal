import React from 'react';
import { Globe, Link as LinkIcon, Info, ExternalLink, Building, Calendar, FileText } from 'lucide-react';
import './ResultCard.css';

/**
 * SourceContextCard
 * Displays validated source context and origin metadata.
 * 
 * Strict Non-Fabrication:
 * - If unavailable: "Source context unavailable."
 * - Never fabricate: URLs, publishers, dates, original sources, or fact-checks.
 * - Only display information actually returned by external services or provided.
 * - Content rendered strictly as safe text (never raw HTML).
 */
export default function SourceContextCard({ sourceContext, mediaName, mediaType }) {
  const hasContext = Boolean(
    sourceContext?.hasContext && 
    (sourceContext?.url || sourceContext?.publisher || sourceContext?.notes || sourceContext?.domain)
  );

  return (
    <section className="result-card" aria-labelledby="source-context-title">
      <div className="result-card__header">
        <div className="result-card__title-group">
          <div className="result-card__icon-badge">
            <Globe size={18} aria-hidden="true" />
          </div>
          <h2 id="source-context-title" className="result-card__title">
            Source Context
          </h2>
        </div>
        <span className={`status-pill status-pill--${hasContext ? 'available' : 'neutral'}`}>
          {hasContext ? (sourceContext?.url ? 'URL Source' : 'Context Recorded') : 'Unavailable'}
        </span>
      </div>

      <div className="result-card__body">
        {hasContext ? (
          <div className="source-context-content">
            {sourceContext.url && (
              <div className="source-item">
                <span className="source-item__label">
                  <LinkIcon size={12} aria-hidden="true" />
                  <span>Remote Origin Source:</span>
                </span>
                <span className="source-item__value source-item__value--mono">
                  {String(sourceContext.url)}
                </span>
              </div>
            )}

            {sourceContext.domain && (
              <div className="source-item">
                <span className="source-item__label">
                  <Globe size={12} aria-hidden="true" />
                  <span>Verified Domain Host:</span>
                </span>
                <span className="source-item__value">
                  {String(sourceContext.domain)}{' '}
                  {sourceContext.platform && `(${String(sourceContext.platform)})`}
                </span>
              </div>
            )}

            {sourceContext.publisher && (
              <div className="source-item">
                <span className="source-item__label">
                  <Building size={12} aria-hidden="true" />
                  <span>Claimed Publisher / Originator:</span>
                </span>
                <span className="source-item__value">{String(sourceContext.publisher)}</span>
              </div>
            )}

            {sourceContext.notes && (
              <div className="source-item">
                <span className="source-item__label">
                  <FileText size={12} aria-hidden="true" />
                  <span>Context / Ingestion Notes:</span>
                </span>
                <span className="source-item__value">{String(sourceContext.notes)}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="unavailable-state">
            <Info size={18} className="unavailable-state__icon text-info" aria-hidden="true" />
            <div className="unavailable-state__text">
              <strong>Source context unavailable.</strong>
              <p>
                No verified origin URL, publisher attribution, or contextual notes accompanied this asset. In accordance with FindReal's non-fabrication guarantee, source provenance is never invented.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="result-card__footer">
        <span className="forensic-notice">
          <strong>Non-Fabrication Principle:</strong> FindReal only displays source records actually returned by external services or provided by users.
        </span>
      </div>
    </section>
  );
}
