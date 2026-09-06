// Evidence-based probabilistic verdict definitions
export const VERDICT_CONFIG = {
  VERIFIED_PROVENANCE: {
    label: 'VERIFIED PROVENANCE',
    badgeClass: 'badge-verified',
    description: 'Authoritative origin or chain of custody confirmed.',
  },
  LIKELY_AUTHENTIC: {
    label: 'LIKELY AUTHENTIC',
    badgeClass: 'badge-authentic',
    description: 'Forensic markers and camera metadata align with genuine capture.',
  },
  INCONCLUSIVE: {
    label: 'INCONCLUSIVE',
    badgeClass: 'badge-inconclusive',
    description: 'Insufficient or ambiguous signals. Limitations apply.',
  },
  SUSPICIOUS: {
    label: 'SUSPICIOUS',
    badgeClass: 'badge-suspicious',
    description: 'Anomalies detected in metadata, compression, or generative patterns.',
  },
  HIGH_MANIPULATION_RISK: {
    label: 'HIGH MANIPULATION RISK',
    badgeClass: 'badge-high-risk',
    description: 'Multiple high-confidence forensic or synthetic generative markers detected.',
  },
};

export const SUPPORTED_MEDIA = {
  IMAGE: ['image/jpeg', 'image/png', 'image/webp'],
  AUDIO: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4'],
  VIDEO: ['video/mp4', 'video/webm', 'video/quicktime'],
};
