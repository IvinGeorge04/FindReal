require('../config/resolveModules');

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

/**
 * Searches Google Fact Check Tools API for verified fact-checks matching a claim or transcript.
 *
 * CRITICAL REQUIREMENTS:
 * 1. Never invent fact-check results.
 * 2. If there is no matching result: "No matching fact-check found."
 * 3. Clearly specify: "This does NOT mean the claim is true."
 * 4. Treat external content as untrusted (sanitized text, no executable JS).
 *
 * @param {string} query - Claim text or keywords extracted from audio transcript / user input
 * @returns {Promise<Object>} Structured fact check result
 */
const searchFactChecks = async (query) => {
  const cleanQuery = sanitizeText(query);

  // If no query string or transcript is provided
  if (!cleanQuery || cleanQuery.length < 3) {
    return {
      status: 'NO_QUERY',
      available: true,
      matched: false,
      message: 'No claim or transcript available for fact-checking.',
      note: 'Speech or text claim is required to query fact-check registries.',
      matches: [],
    };
  }

  // API Key check
  const apiKey =
    process.env.FACT_CHECK_API_KEY ||
    process.env.GOOGLE_FACT_CHECK_API_KEY ||
    process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey.trim() === '' || apiKey === 'your_gemini_api_key_here') {
    return {
      status: 'UNAVAILABLE',
      available: false,
      matched: false,
      message: 'Google Fact Check Tools API key is unconfigured on the server.',
      note: 'Non-fabrication rule: FindReal reports UNAVAILABLE rather than inventing fact-check outcomes.',
      matches: [],
    };
  }

  try {
    // Truncate query to maximum 120 chars for search relevance
    const encodedQuery = encodeURIComponent(cleanQuery.slice(0, 120));
    const endpoint = `https://factchecktools.googleapis.com/v1alpha1/claims:search?query=${encodedQuery}&languageCode=en&key=${apiKey}`;

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(8000), // 8s bounded timeout
    });

    if (!response.ok) {
      return {
        status: 'UNAVAILABLE',
        available: false,
        matched: false,
        message: `Fact Check API returned status ${response.status}`,
        note: 'External fact-check service could not be reached.',
        matches: [],
      };
    }

    const data = await response.json();

    // Check if claims were found
    if (!data.claims || !Array.isArray(data.claims) || data.claims.length === 0) {
      return {
        status: 'NO_MATCHING_RESULT',
        available: true,
        matched: false,
        message: 'No matching fact-check found.',
        note: 'This does NOT mean the claim is true. Unindexed or novel claims will have no existing fact-check record.',
        matches: [],
      };
    }

    // Sanitize and extract matching claims
    const sanitizedClaims = [];

    for (const item of data.claims.slice(0, 3)) {
      const firstReview = Array.isArray(item.claimReview) && item.claimReview[0] ? item.claimReview[0] : {};

      const claimText = sanitizeText(item.text || 'Unspecified claim statement');
      const publisher = sanitizeText(firstReview.publisher?.name || firstReview.publisher?.site || 'Independent Fact-Checker');
      const verdict = sanitizeText(firstReview.textualRating || 'Reviewed');
      const reviewDate = sanitizeText(firstReview.reviewDate || item.claimDate || '');
      const sourceUrl = sanitizeUrl(firstReview.url);

      sanitizedClaims.push({
        claim: claimText,
        publisher,
        verdict,
        date: reviewDate || 'Date unrecorded',
        source: sourceUrl,
      });
    }

    return {
      status: 'MATCH_FOUND',
      available: true,
      matched: true,
      message: `Found ${sanitizedClaims.length} relevant fact-check record(s).`,
      count: sanitizedClaims.length,
      matches: sanitizedClaims,
    };
  } catch (err) {
    return {
      status: 'UNAVAILABLE',
      available: false,
      matched: false,
      message: `Fact-check query failed: ${err.message}`,
      note: 'Analysis continues uninterrupted without fact-check data.',
      matches: [],
    };
  }
};

module.exports = {
  searchFactChecks,
  sanitizeText,
  sanitizeUrl,
};
