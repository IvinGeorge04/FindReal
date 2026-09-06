/**
 * Strips HTML tags, script blocks, and unsafe characters from untrusted external text strings
 */
const sanitizeText = (text) => {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/<script[\s\S]*?<\/script>/gi, '') // Strip script tags and inner code
    .replace(/<style[\s\S]*?<\/style>/gi, '')   // Strip style tags and inner CSS
    .replace(/<[^>]*>/g, '')                   // Strip any remaining HTML tags
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '') // Strip control characters
    .trim();
};

/**
 * Validates external review URLs to ensure safe HTTP/HTTPS links
 */
const sanitizeUrl = (urlStr) => {
  if (!urlStr || typeof urlStr !== 'string') return null;
  try {
    const parsed = new URL(urlStr.trim());
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.href;
    }
    return null;
  } catch {
    return null;
  }
};

module.exports = {
  sanitizeText,
  sanitizeUrl,
};
