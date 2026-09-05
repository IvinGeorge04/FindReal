import React from 'react';
import { 
  ShieldCheck, 
  CheckCircle2, 
  HelpCircle, 
  AlertTriangle, 
  AlertOctagon 
} from 'lucide-react';
import './VerdictBadge.css';

const VERDICT_MAP = {
  VERIFIED_PROVENANCE: {
    label: 'VERIFIED PROVENANCE',
    icon: ShieldCheck,
    variant: 'verified',
    description: 'Cryptographic provenance or authoritative manifest confirmed',
  },
  LIKELY_AUTHENTIC: {
    label: 'LIKELY AUTHENTIC',
    icon: CheckCircle2,
    variant: 'authentic',
    description: 'Forensic markers and metadata align with genuine capture',
  },
  INCONCLUSIVE: {
    label: 'INCONCLUSIVE',
    icon: HelpCircle,
    variant: 'inconclusive',
    description: 'Insufficient or ambiguous evidence. Limitations apply',
  },
  SUSPICIOUS: {
    label: 'SUSPICIOUS',
    icon: AlertTriangle,
    variant: 'suspicious',
    description: 'Anomalies detected in compression, structure, or patterns',
  },
  HIGH_MANIPULATION_RISK: {
    label: 'HIGH MANIPULATION RISK',
    icon: AlertOctagon,
    variant: 'danger',
    description: 'High-confidence synthetic generative or manipulation indicators',
  },
};

export default function VerdictBadge({ 
  verdict = 'INCONCLUSIVE', 
  size = 'md', 
  showIcon = true,
  className = '',
}) {
  // Normalize verdict key
  const normalizedKey = String(verdict).toUpperCase().replace(/\s+/g, '_');
  const config = VERDICT_MAP[normalizedKey] || VERDICT_MAP.INCONCLUSIVE;
  const IconComponent = config.icon;

  const iconSizes = {
    sm: 14,
    md: 16,
    lg: 20,
  };

  return (
    <span
      className={`verdict-badge verdict-badge--${config.variant} verdict-badge--${size} ${className}`}
      role="status"
      aria-label={`Verification Assessment: ${config.label}`}
      title={config.description}
    >
      {showIcon && (
        <IconComponent 
          size={iconSizes[size] || 16} 
          className="verdict-badge__icon" 
          aria-hidden="true" 
        />
      )}
      <span className="verdict-badge__label">{config.label}</span>
    </span>
  );
}
