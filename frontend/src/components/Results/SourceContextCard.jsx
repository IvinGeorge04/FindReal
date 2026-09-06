import React from 'react';
import { Globe, Link as LinkIcon, Info, Building, FileText } from 'lucide-react';
import './ResultCard.css';

/**
 * SourceContextCard
 * Displays validated source context and origin metadata.
 * 
 * Strict Non-Fabrication:
 * - NOT PROVIDED: File uploaded directly without source URL, publisher, or notes.
 * - UNAVAILABLE: External source-context service failed or was unreachable.
 * - AVAILABLE / URL Source: Verified source information exists.
 * - Never fabricate: URLs, publishers, dates, or original sources.
 * - Only display information actually returned by external services or provided.
 * - Content rendered strictly as safe text (never raw HTML).
 */
export default function SourceContextCard({ sourceContext, availability, mediaName, mediaType }) {
  const hasContext = Boolean(
    (sourceContext?.hasContext || sourceContext?.url || sourceContext?.publisher || sourceContext?.notes) && 
    (sourceContext?.url || sourceContext?.publisher || sourceContext?.notes || sourceContext?.domain)
  );

  // Distinguish explicitly between service failure (UNAVAILABLE) and missing source info (NOT PROVIDED)
  const isServiceUnavailable = !hasContext && (
    sourceContext?.status === 'UNAVAILABLE' || 
    (availability?.status === 'UNAVAILABLE' && availability?.serviceFailed)
  );

  const getStatusText = () => {
    if (hasContext) {
      return sourceContext?.url ? 'URL Source' : 'Context Recorded';
    }
    if (isServiceUnavailable) {
      return 'UNAVAILABLE';
    }
    return 'NOT PROVIDED';
  };

  const getStatusPillClass = () => {
    if (hasContext) return 'status-pill--available';
    if (isServiceUnavailable) return 'status-pill--warning';
    return 'status-pill--neutral';
  };

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
        <span className={`status-pill ${getStatusPillClass()}`}>
          {getStatusText()}
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
        ) : isServiceUnavailable ? (
          <div className="unavailable-state">
            <Info size={18} className="unavailable-state__icon text-warning" aria-hidden="true" />
            <div className="unavailable-state__text">
              <strong>Source context service unavailable.</strong>
              <p>
                {sourceContext?.note ||
                  sourceContext?.message ||
                  'The external source-context service could not be reached or encountered an error. Source records could not be retrieved.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="unavailable-state">
            <Info size={18} className="unavailable-state__icon text-info" aria-hidden="true" />
            <div className="unavailable-state__text">
              <strong>No source context provided.</strong>
              <p>
                This file was uploaded directly and does not contain a verified origin URL, publisher attribution, or contextual source information.
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
