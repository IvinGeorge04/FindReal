require('../config/resolveModules');
const { sanitizeText, sanitizeUrl } = require('./factcheck.service');

/**
 * Evaluates and extracts contextual provenance and origin information.
 *
 * CRITICAL GUIDELINES:
 * 1. If source information is unavailable: "Source context unavailable."
 * 2. Never fabricate URLs, publishers, dates, original sources, or fact-checks.
 * 3. Only display information actually provided or returned by external services.
 * 4. Treat all source content as untrusted; sanitize all fields to prevent XSS.
 * 5. Do not allow source information to override authorization or application logic.
 *
 * @param {Object} input - Context parameters { url, notes, publisher, originalName, mediaType }
 * @returns {Object} Structured source context report
 */
const resolveSourceContext = (input = {}) => {
  if (!input || typeof input !== 'object') {
    return {
      status: 'UNAVAILABLE',
      hasContext: false,
      message: 'Source context unavailable.',
      note: 'No contextual origin data was provided with this submission.',
    };
  }

  const rawUrl = input.url || input.sourceUrl || null;
  const rawNotes = input.notes || input.userClaim || null;
  const rawPublisher = input.publisher || null;
  const rawOriginalName = input.originalName || null;

  const cleanUrl = sanitizeUrl(rawUrl);
  const cleanNotes = sanitizeText(rawNotes);
  const cleanPublisher = sanitizeText(rawPublisher);
  const cleanOriginalName = sanitizeText(rawOriginalName);

  // If no identifiable information is provided
  if (!cleanUrl && !cleanNotes && !cleanPublisher && !cleanOriginalName) {
    return {
      status: 'UNAVAILABLE',
      hasContext: false,
      message: 'Source context unavailable.',
      note: 'No contextual origin data was provided with this submission.',
    };
  }

  let domain = null;
  let detectedPlatform = null;

  if (cleanUrl) {
    try {
      const parsed = new URL(cleanUrl);
      domain = parsed.hostname.toLowerCase();

      // Transparent platform identification purely based on domain
      if (domain.includes('youtube.com') || domain.includes('youtu.be')) {
        detectedPlatform = 'YouTube';
      } else if (domain.includes('twitter.com') || domain.includes('x.com')) {
        detectedPlatform = 'X (formerly Twitter)';
      } else if (domain.includes('reddit.com')) {
        detectedPlatform = 'Reddit';
      } else if (domain.includes('tiktok.com')) {
        detectedPlatform = 'TikTok';
      } else if (domain.includes('instagram.com')) {
        detectedPlatform = 'Instagram';
      } else if (domain.includes('facebook.com')) {
        detectedPlatform = 'Facebook';
      } else {
        detectedPlatform = 'Independent Web Host';
      }
    } catch {
      // Invalid URL
    }
  }

  return {
    status: 'AVAILABLE',
    hasContext: true,
    url: cleanUrl || null,
    domain: domain || null,
    platform: detectedPlatform || null,
    publisher: cleanPublisher || null,
    notes: cleanNotes || null,
    originalName: cleanOriginalName || null,
    ingestionType: cleanUrl ? 'URL_SOURCE' : 'DIRECT_UPLOAD',
    message: cleanUrl 
      ? `Asset ingested from verified remote protocol (${cleanUrl}).` 
      : 'Asset uploaded directly with user-provided contextual metadata.',
  };
};

module.exports = {
  resolveSourceContext,
};
