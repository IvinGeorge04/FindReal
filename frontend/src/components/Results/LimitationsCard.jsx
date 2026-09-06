import React from 'react';
import { AlertTriangle, ShieldAlert, Check } from 'lucide-react';
import './ResultCard.css';

export default function LimitationsCard({ limitations = [] }) {
  // Mandatory 6 Core Scientific Limitations
  const coreLimitations = [
    {
      title: 'AI detection is probabilistic',
      desc: 'Machine learning classifiers calculate statistical likelihoods based on pattern recognition; they do not possess definitive knowledge of ground truth.',
    },
    {
      title: 'AI-generated content can evade detection',
      desc: 'Adversarial techniques, heavy re-compression, perturbation noise, and newer generative model architectures may bypass standard forensic detectors.',
    },
    {
      title: 'Missing metadata does NOT prove manipulation',
      desc: 'Most major social platforms (WhatsApp, X, Instagram) strip EXIF and container headers automatically upon ingestion to safeguard privacy.',
    },
    {
      title: 'Source searches may be incomplete',
      desc: 'Internet crawls and perceptual reverse-image registries do not index private networks, encrypted chats, or offline archives.',
    },
    {
      title: 'High-stakes decisions require independent verification',
      desc: 'Legal proceedings, editorial publishing, law enforcement, and financial actions must corroborate these findings with human expert testimony.',
    },
  ];

  return (
    <section className="result-card result-card--full result-card--warning" aria-labelledby="limitations-title">
      <div className="result-card__header">
        <div className="result-card__title-group">
          <div className="result-card__icon-badge result-card__icon-badge--warning">
            <AlertTriangle size={18} aria-hidden="true" />
          </div>
          <h2 id="limitations-title" className="result-card__title">
            Platform Limitations & Scientific Uncertainty
          </h2>
        </div>
        <span className="status-pill status-pill--warning">
          Mandatory Forensic Disclosure
        </span>
      </div>

      <div className="result-card__body">
        <p className="limitations-intro">
          FindReal adheres to strict forensic integrity standards. To prevent misplaced overconfidence, users must evaluate these findings alongside the following verified engineering realities:
        </p>

        <div className="limitations-grid">
          {coreLimitations.map((lim, idx) => (
            <div key={idx} className="limitation-item">
              <div className="limitation-item__bullet">
                <ShieldAlert size={14} aria-hidden="true" />
              </div>
              <div className="limitation-item__content">
                <strong className="limitation-item__title">{lim.title}</strong>
                <p className="limitation-item__desc">{lim.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {Array.isArray(limitations) && limitations.length > 0 && (
          <div className="runtime-limitations">
            <h3 className="runtime-limitations__heading">Specific Execution Notes for this Media:</h3>
            <ul className="runtime-limitations__list">
              {limitations.map((note, i) => (
                <li key={i}>{note}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="result-card__footer">
        <span className="forensic-notice">
          FindReal guarantees non-fabrication: unverified tools are marked UNAVAILABLE rather than invented.
        </span>
      </div>
    </section>
  );
}
