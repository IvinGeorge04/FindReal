import React from 'react';
import { ShieldCheck, ShieldAlert, ShieldX, HelpCircle, Info } from 'lucide-react';
import './ResultCard.css';

export default function ProvenanceCard({ provenance, availability }) {
  const status = provenance?.status || availability?.status || 'UNAVAILABLE';

  const statusConfig = {
    VALID: {
      label: 'VALID CREDENTIALS',
      variant: 'valid',
      icon: ShieldCheck,
      desc: 'Cryptographic C2PA provenance manifest verified. The digital seal is intact and matches the signing authority.',
    },
    INVALID: {
      label: 'INVALID / TAMPERED',
      variant: 'invalid',
      icon: ShieldX,
      desc: 'An embedded C2PA manifest was detected, but cryptographic hash validation failed. The asset was modified post-signing.',
    },
    NOT_FOUND: {
      label: 'NO CREDENTIALS FOUND',
      variant: 'not-found',
      icon: HelpCircle,
      desc: 'No C2PA Content Credentials manifest was embedded in this container. This is typical for most consumer media.',
    },
    UNAVAILABLE: {
      label: 'TOOLING UNAVAILABLE',
      variant: 'unavailable',
      icon: ShieldAlert,
      desc: 'C2PA extraction utility (c2patool) was not accessible in the server runtime environment.',
    },
  };

  const current = statusConfig[status] || statusConfig.UNAVAILABLE;
  const IconComponent = current.icon;

  return (
    <section className="result-card" aria-labelledby="provenance-title">
      <div className="result-card__header">
        <div className="result-card__title-group">
          <div className="result-card__icon-badge">
            <ShieldCheck size={18} aria-hidden="true" />
          </div>
          <h2 id="provenance-title" className="result-card__title">
            Provenance
          </h2>
        </div>
        <span className={`status-pill status-pill--${current.variant}`}>
          {current.label}
        </span>
      </div>

      <div className="result-card__body">
        <div className="provenance-status-box">
          <div className="provenance-status-box__icon-wrap">
            <IconComponent size={24} className={`text-${current.variant}`} aria-hidden="true" />
          </div>
          <div className="provenance-status-box__details">
            <h3 className="provenance-status-box__title">{current.label}</h3>
            <p className="provenance-status-box__desc">{current.desc}</p>
          </div>
        </div>

        {provenance?.claimGenerator && (
          <div className="provenance-meta-item">
            <span className="provenance-meta-label">Claim Generator:</span>
            <span className="provenance-meta-value">{provenance.claimGenerator}</span>
          </div>
        )}

        {provenance?.issuer && (
          <div className="provenance-meta-item">
            <span className="provenance-meta-label">Signing Authority:</span>
            <span className="provenance-meta-value">{provenance.issuer}</span>
          </div>
        )}
      </div>

      <div className="result-card__footer">
        <span className="forensic-notice">
          <strong>Mandatory Principle:</strong> Absence of C2PA credentials does NOT prove manipulation or falsification.
        </span>
      </div>
    </section>
  );
}
