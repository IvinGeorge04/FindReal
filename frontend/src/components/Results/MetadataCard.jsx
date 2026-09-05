import React from 'react';
import { FileCode, Info, Camera, Calendar, Monitor, Music } from 'lucide-react';
import './ResultCard.css';

export default function MetadataCard({ metadata, availability }) {
  const isAvailable = availability?.status === 'AVAILABLE' && Boolean(metadata);

  return (
    <section className="result-card" aria-labelledby="metadata-title">
      <div className="result-card__header">
        <div className="result-card__title-group">
          <div className="result-card__icon-badge">
            <FileCode size={18} aria-hidden="true" />
          </div>
          <h2 id="metadata-title" className="result-card__title">
            Metadata
          </h2>
        </div>
        <span className={`status-pill status-pill--${isAvailable ? 'available' : 'unavailable'}`}>
          {isAvailable ? 'Available' : 'Unavailable / Stripped'}
        </span>
      </div>

      <div className="result-card__body">
        {isAvailable ? (
          <div className="metadata-content">
            <dl className="metadata-grid">
              <div className="metadata-prop">
                <dt className="metadata-prop__label">
                  <Camera size={13} aria-hidden="true" />
                  <span>Hardware Make / Model</span>
                </dt>
                <dd className="metadata-prop__value">
                  {[metadata.cameraMake, metadata.cameraModel].filter(Boolean).join(' ') || 'Not recorded'}
                </dd>
              </div>

              <div className="metadata-prop">
                <dt className="metadata-prop__label">
                  <Monitor size={13} aria-hidden="true" />
                  <span>Software Tag</span>
                </dt>
                <dd className="metadata-prop__value">
                  {metadata.software ? (
                    <span className={metadata.hasAiOrEditingSoftware ? 'text-warning' : ''}>
                      {metadata.software}
                      {metadata.hasAiOrEditingSoftware && ' (Editing/Generative Tag)'}
                    </span>
                  ) : (
                    'Not specified'
                  )}
                </dd>
              </div>

              <div className="metadata-prop">
                <dt className="metadata-prop__label">
                  <Calendar size={13} aria-hidden="true" />
                  <span>Creation Date</span>
                </dt>
                <dd className="metadata-prop__value">
                  {metadata.creationDate || 'Not preserved'}
                </dd>
              </div>

              <div className="metadata-prop">
                <dt className="metadata-prop__label">
                  <FileCode size={13} aria-hidden="true" />
                  <span>Format & Resolution</span>
                </dt>
                <dd className="metadata-prop__value">
                  {metadata.fileFormat || 'Standard'} &bull; {metadata.imageWidth && metadata.imageHeight ? `${metadata.imageWidth}×${metadata.imageHeight}` : 'Unspecified dimensions'}
                </dd>
              </div>

              {(metadata.videoCodec || metadata.audioCodec) && (
                <div className="metadata-prop">
                  <dt className="metadata-prop__label">
                    <Music size={13} aria-hidden="true" />
                    <span>Stream Codecs</span>
                  </dt>
                  <dd className="metadata-prop__value">
                    {[metadata.videoCodec, metadata.audioCodec].filter(Boolean).join(' / ') || 'None'}
                  </dd>
                </div>
              )}
            </dl>

            {metadata.hasAiOrEditingSoftware && (
              <div className="context-callout context-callout--warning">
                <Info size={16} aria-hidden="true" />
                <p>
                  <strong>Contextual Software Finding:</strong> The metadata contains a software signature associated with digital editing or generative tooling ({metadata.software}). This provides contextual evidence but is not definitive proof of deception.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="unavailable-state">
            <Info size={18} className="unavailable-state__icon text-info" aria-hidden="true" />
            <div className="unavailable-state__text">
              <strong>EXIF Metadata Unavailable or Stripped</strong>
              <p>
                No technical EXIF container markers were present. This is standard behavior across social media platforms (WhatsApp, Twitter/X, Instagram) which automatically strip metadata upon upload to protect user privacy.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="result-card__footer">
        <span className="forensic-notice">
          <strong>Mandatory Principle:</strong> Missing metadata does NOT prove manipulation.
        </span>
      </div>
    </section>
  );
}
