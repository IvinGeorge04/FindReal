require('../config/resolveModules');
const dns = require('dns');
const fs = require('fs');
const http = require('http');
const https = require('https');
const { URL } = require('url');

// Disallowed protocols
const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);

// Blocked hostnames (case-insensitive)
const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'metadata.google.internal',
  'instance-data',
]);

const BLOCKED_HOSTNAME_SUFFIXES = [
  '.localhost',
  '.local',
  '.internal',
  '.corp',
  '.lan',
  '.home',
];

/**
 * Checks if an IPv4 address falls within private, loopback, or cloud-metadata ranges
 */
const isPrivateIPv4 = (ip) => {
  const parts = ip.split('.').map((p) => parseInt(p, 10));
  if (parts.length !== 4 || parts.some(isNaN)) return true;

  const [a, b, c, d] = parts;

  // 0.0.0.0/8 (Current network)
  if (a === 0) return true;

  // 127.0.0.0/8 (Loopback)
  if (a === 127) return true;

  // 10.0.0.0/8 (Private RFC 1918)
  if (a === 10) return true;

  // 172.16.0.0/12 (Private RFC 1918: 172.16.0.0 - 172.31.255.255)
  if (a === 172 && b >= 16 && b <= 31) return true;

  // 192.168.0.0/16 (Private RFC 1918)
  if (a === 192 && b === 168) return true;

  // 169.254.0.0/16 (Link-Local and Cloud Metadata: 169.254.169.254)
  if (a === 169 && b === 254) return true;

  // 100.64.0.0/10 (Carrier-grade NAT)
  if (a === 100 && b >= 64 && b <= 127) return true;

  // 198.18.0.0/15 (Network benchmark testing)
  if (a === 198 && (b === 18 || b === 19)) return true;

  // 224.0.0.0/4 (Multicast)
  if (a >= 224 && a <= 239) return true;

  // 240.0.0.0/4 (Reserved / broadcast)
  if (a >= 240) return true;

  // Broadcast
  if (ip === '255.255.255.255') return true;

  return false;
};

/**
 * Checks if an IPv6 address is loopback, link-local, or private
 */
const isPrivateIPv6 = (ip) => {
  const normalized = ip.toLowerCase().trim();

  // Loopback and unspecified
  if (normalized === '::1' || normalized === '::' || normalized === '0:0:0:0:0:0:0:1') {
    return true;
  }

  // IPv4-mapped IPv6 (::ffff:127.0.0.1 or ::ffff:7f00:1)
  if (normalized.startsWith('::ffff:')) {
    const rawIpv4 = normalized.slice(7);
    if (rawIpv4.includes('.')) {
      return isPrivateIPv4(rawIpv4);
    }
  }

  // Unique local addresses (fc00::/7)
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) {
    return true;
  }

  // Link-local addresses (fe80::/10)
  if (normalized.startsWith('fe8') || normalized.startsWith('fe9') || normalized.startsWith('fea') || normalized.startsWith('feb')) {
    return true;
  }

  // Multicast (ff00::/8)
  if (normalized.startsWith('ff')) {
    return true;
  }

  return false;
};

/**
 * General check for private/blocked IP (both IPv4 and IPv6)
 */
const isPrivateOrBlockedIP = (ip) => {
  if (!ip || typeof ip !== 'string') return true;
  if (ip.includes(':')) {
    return isPrivateIPv6(ip);
  }
  return isPrivateIPv4(ip);
};

/**
 * Validates whether a target URL is safe from SSRF attacks
 *
 * @param {string} rawUrl - Untrusted URL input
 * @returns {Promise<{ isSafe: boolean, reason?: string, parsedUrl?: URL, resolvedIps?: string[] }>}
 */
const validateUrlSafety = async (rawUrl) => {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { isSafe: false, reason: 'URL must be a non-empty string.' };
  }

  let parsed;
  try {
    parsed = new URL(rawUrl.trim());
  } catch (err) {
    return { isSafe: false, reason: 'Malformed or unparseable URL.' };
  }

  // 1. Protocol validation (Only http: and https: allowed)
  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    return {
      isSafe: false,
      reason: `Unsupported protocol "${parsed.protocol}". Only HTTP and HTTPS are permitted.`,
    };
  }

  const hostname = parsed.hostname.toLowerCase();

  // 2. Hostname blocklist checks
  if (BLOCKED_HOSTNAMES.has(hostname)) {
    return { isSafe: false, reason: `Access to internal hostname "${hostname}" is prohibited.` };
  }

  for (const suffix of BLOCKED_HOSTNAME_SUFFIXES) {
    if (hostname.endsWith(suffix)) {
      return { isSafe: false, reason: `Access to internal domain zone "${suffix}" is prohibited.` };
    }
  }

  // 3. Direct IP address check (if hostname is an IP literal)
  if (isPrivateOrBlockedIP(hostname)) {
    return { isSafe: false, reason: `Access to private or loopback IP "${hostname}" is prohibited.` };
  }

  // 4. DNS Resolution check (prevent DNS rebinding / internal host resolution)
  try {
    const addresses = await dns.promises.lookup(hostname, { all: true });
    if (!addresses || addresses.length === 0) {
      return { isSafe: false, reason: 'Could not resolve domain name via DNS.' };
    }

    const resolvedIps = [];
    for (const record of addresses) {
      resolvedIps.push(record.address);
      if (isPrivateOrBlockedIP(record.address)) {
        return {
          isSafe: false,
          reason: `Domain resolved to prohibited private/internal IP address (${record.address}).`,
        };
      }
    }

    return {
      isSafe: true,
      parsedUrl: parsed,
      resolvedIps,
    };
  } catch (dnsErr) {
    return { isSafe: false, reason: `DNS lookup failed: ${dnsErr.message}` };
  }
};

/**
 * Downloads media from an SSRF-validated remote URL with strict resource limits
 *
 * Limits enforced:
 * - Max 3 redirects (each destination re-validated for SSRF)
 * - Max download size: 50MB (stream byte counter aborts on excess)
 * - Timeout: 15s connection / download timeout
 *
 * @param {string} targetUrl - Source URL
 * @param {string} destinationPath - Path to write downloaded file
 * @param {Object} options - Configuration options
 * @returns {Promise<{ success: boolean, sizeBytes: number, mimeType: string }>}
 */
const downloadMediaSafely = async (targetUrl, destinationPath, options = {}) => {
  const maxRedirects = options.maxRedirects || 3;
  const maxBytes = options.maxBytes || 50 * 1024 * 1024; // 50MB
  const timeoutMs = options.timeoutMs || 15000; // 15 seconds

  let currentUrl = targetUrl;
  let redirectsCount = 0;

  while (redirectsCount <= maxRedirects) {
    // Validate current URL for SSRF
    const safetyCheck = await validateUrlSafety(currentUrl);
    if (!safetyCheck.isSafe) {
      throw new Error(`SSRF Security Violation: ${safetyCheck.reason}`);
    }

    const client = currentUrl.startsWith('https:') ? https : http;

    const result = await new Promise((resolve, reject) => {
      let settled = false;

      const req = client.get(
        currentUrl,
        {
          headers: {
            'User-Agent': 'FindReal-MediaVerifier/1.0 (+https://findreal.org)',
            'Accept': 'image/*,audio/*,video/*',
          },
          timeout: timeoutMs,
        },
        (res) => {
          // Handle redirects
          if (
            res.statusCode === 301 ||
            res.statusCode === 302 ||
            res.statusCode === 303 ||
            res.statusCode === 307 ||
            res.statusCode === 308
          ) {
            const redirectLocation = res.headers.location;
            res.resume(); // Discard response data
            if (!redirectLocation) {
              settled = true;
              return reject(new Error('Redirect header missing location.'));
            }
            try {
              const nextUrl = new URL(redirectLocation, currentUrl).href;
              settled = true;
              return resolve({ isRedirect: true, nextUrl });
            } catch (err) {
              settled = true;
              return reject(new Error('Invalid redirect location URL.'));
            }
          }

          if (res.statusCode !== 200) {
            res.resume();
            settled = true;
            return reject(new Error(`Server returned HTTP ${res.statusCode}`));
          }

          const mimeType = res.headers['content-type'] || 'application/octet-stream';
          const fileStream = fs.createWriteStream(destinationPath);
          let downloadedBytes = 0;

          res.on('data', (chunk) => {
            downloadedBytes += chunk.length;
            if (downloadedBytes > maxBytes) {
              req.destroy();
              fileStream.destroy();
              try {
                if (fs.existsSync(destinationPath)) fs.unlinkSync(destinationPath);
              } catch {}
              settled = true;
              return reject(new Error(`Download exceeded maximum limit of ${maxBytes / 1024 / 1024}MB.`));
            }
          });

          res.pipe(fileStream);

          fileStream.on('finish', () => {
            fileStream.close();
            if (!settled) {
              settled = true;
              resolve({
                isRedirect: false,
                sizeBytes: downloadedBytes,
                mimeType,
              });
            }
          });

          fileStream.on('error', (fsErr) => {
            try {
              if (fs.existsSync(destinationPath)) fs.unlinkSync(destinationPath);
            } catch {}
            if (!settled) {
              settled = true;
              reject(fsErr);
            }
          });
        }
      );

      req.on('timeout', () => {
        req.destroy();
        try {
          if (fs.existsSync(destinationPath)) fs.unlinkSync(destinationPath);
        } catch {}
        if (!settled) {
          settled = true;
          reject(new Error(`Connection timed out after ${timeoutMs}ms.`));
        }
      });

      req.on('error', (err) => {
        try {
          if (fs.existsSync(destinationPath)) fs.unlinkSync(destinationPath);
        } catch {}
        if (!settled) {
          settled = true;
          reject(err);
        }
      });
    });

    if (result.isRedirect) {
      redirectsCount++;
      currentUrl = result.nextUrl;
    } else {
      return result;
    }
  }

  throw new Error(`Exceeded maximum redirect limit of ${maxRedirects}.`);
};

module.exports = {
  validateUrlSafety,
  downloadMediaSafely,
  isPrivateOrBlockedIP,
  isPrivateIPv4,
  isPrivateIPv6,
};
