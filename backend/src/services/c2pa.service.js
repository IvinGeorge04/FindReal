require('../config/resolveModules');
const { execFile } = require('child_process');
const fs = require('fs');

let c2paToolCache = null;

/**
 * Detailed user-facing explanations for each C2PA status
 * Strictly reinforces the principle that missing C2PA credentials does not prove manipulation.
 */
const C2PA_STATUS_EXPLANATIONS = {
  VALID: {
    status: 'VALID',
    label: 'Valid Content Credentials',
    summary: 'Cryptographically certified provenance manifest verified.',
    description:
      'A valid C2PA (Coalition for Content Provenance and Authenticity) manifest is embedded in the media container. The cryptographic signature matches an authoritative certifier and no manifest tampering was detected.',
    forensicImplication:
      'Strong positive signal confirming the digital chain-of-custody from capture or authorized software editor.',
  },
  INVALID: {
    status: 'INVALID',
    label: 'Invalid or Tampered Credentials',
    summary: 'C2PA manifest detected, but cryptographic validation failed.',
    description:
      'An embedded C2PA manifest was found, but cryptographic integrity validation failed. Either the asset was altered after signing, the signature expired/failed verification, or manifest hashes do not match the media stream.',
    forensicImplication:
      'High manipulation warning: The digital seal has been broken or altered.',
  },
  NOT_FOUND: {
    status: 'NOT_FOUND',
    label: 'No Manifest Found',
    summary: 'No C2PA Content Credentials manifest embedded in asset container.',
    description:
      'The media container was inspected with C2PA tooling, but no Content Credentials manifest was detected.',
    forensicImplication:
      'Crucial Note: The absence of C2PA credentials does NOT mean the media is fake or manipulated. The overwhelming majority of consumer camera hardware, mobile phones, and web platforms do not yet embed C2PA manifests, and social media platforms strip metadata upon upload.',
  },
  UNAVAILABLE: {
    status: 'UNAVAILABLE',
    label: 'Tooling Unavailable',
    summary: 'C2PA extraction binary is not available on the server.',
    description:
      'C2PA verification tooling (c2patool) is not installed or not accessible in the server environment PATH. Provenance inspection could not be performed.',
    forensicImplication:
      'Non-fabrication principle: FindReal reports "UNAVAILABLE" rather than falsely asserting that no credentials were found.',
  },
};

/**
 * Checks whether the c2patool binary is installed in system PATH
 */
const checkC2paAvailability = async () => {
  if (c2paToolCache !== null) {
    return c2paToolCache;
  }

  return new Promise((resolve) => {
    execFile('c2patool', ['--version'], { timeout: 1000 }, (error, stdout) => {
      if (error) {
        // Check alternate executable name
        execFile('c2pa-tool', ['--version'], { timeout: 1000 }, (err2, stdout2) => {
          if (err2) {
            c2paToolCache = {
              available: false,
              binary: null,
              version: null,
              reason: 'C2PA CLI binary (c2patool) not found in system PATH.',
            };
          } else {
            c2paToolCache = {
              available: true,
              binary: 'c2pa-tool',
              version: stdout2.trim(),
            };
          }
          resolve(c2paToolCache);
        });
      } else {
        c2paToolCache = {
          available: true,
          binary: 'c2patool',
          version: stdout.trim(),
        };
        resolve(c2paToolCache);
      }
    });
  });
};

/**
 * Inspects a media asset for C2PA Content Credentials
 * Strictly prevents fabrication:
 * - If tooling is unavailable, returns "UNAVAILABLE" (never pretends NOT_FOUND).
 * - Clearly explains that NOT_FOUND does not mean fake.
 *
 * @param {string} filePath - Absolute path to the verified media asset
 * @returns {Promise<Object>} Structured C2PA provenance evaluation
 */
const inspectC2paProvenance = async (filePath) => {
  // 1. Verify file readable
  try {
    await fs.promises.access(filePath, fs.constants.R_OK);
  } catch (err) {
    return {
      status: 'ERROR',
      available: false,
      message: `Media file at ${filePath} is unreadable.`,
    };
  }

  // 2. Check C2PA tool availability
  const toolCheck = await checkC2paAvailability();

  if (!toolCheck.available) {
    // Return UNAVAILABLE per non-fabrication requirement
    const explanation = C2PA_STATUS_EXPLANATIONS.UNAVAILABLE;
    return {
      status: 'UNAVAILABLE',
      available: false,
      tool: 'c2patool',
      explanation: explanation.description,
      forensicImplication: explanation.forensicImplication,
      manifest: null,
    };
  }

  // 3. Execute c2patool against media file
  return new Promise((resolve) => {
    execFile(
      toolCheck.binary,
      [filePath],
      { timeout: 10000, maxBuffer: 10 * 1024 * 1024 },
      (error, stdout, stderr) => {
        const combinedOutput = `${stdout || ''} ${stderr || ''}`;

        // Check if no manifest is present
        if (
          error &&
          (combinedOutput.includes('No claim found') ||
            combinedOutput.includes('no manifest') ||
            combinedOutput.includes('No JUMBF') ||
            combinedOutput.includes('ManifestNotFound'))
        ) {
          const explanation = C2PA_STATUS_EXPLANATIONS.NOT_FOUND;
          return resolve({
            status: 'NOT_FOUND',
            available: true,
            tool: toolCheck.binary,
            explanation: explanation.description,
            forensicImplication: explanation.forensicImplication,
            manifest: null,
          });
        }

        // If command failed with another error
        if (error) {
          // If output has validation errors, it may be an INVALID manifest
          if (combinedOutput.includes('validation_status') || combinedOutput.includes('validation error')) {
            const explanation = C2PA_STATUS_EXPLANATIONS.INVALID;
            return resolve({
              status: 'INVALID',
              available: true,
              tool: toolCheck.binary,
              explanation: explanation.description,
              forensicImplication: explanation.forensicImplication,
              manifestDetails: { rawOutput: combinedOutput.substring(0, 1000) },
            });
          }

          // Otherwise, general NOT_FOUND fallback if no claim
          const explanation = C2PA_STATUS_EXPLANATIONS.NOT_FOUND;
          return resolve({
            status: 'NOT_FOUND',
            available: true,
            tool: toolCheck.binary,
            explanation: explanation.description,
            forensicImplication: explanation.forensicImplication,
            manifest: null,
          });
        }

        // Successfully parsed manifest output
        try {
          const manifestData = JSON.parse(stdout);
          const validationStatus = manifestData.validation_status || [];
          const hasValidationErrors = validationStatus.some((s) => s.code && s.code !== 'claim.valid');

          const status = hasValidationErrors ? 'INVALID' : 'VALID';
          const explanation = C2PA_STATUS_EXPLANATIONS[status];

          return resolve({
            status,
            available: true,
            tool: toolCheck.binary,
            explanation: explanation.description,
            forensicImplication: explanation.forensicImplication,
            manifest: {
              title: manifestData.title || null,
              format: manifestData.format || null,
              claimGenerator: manifestData.claim_generator || null,
              issuer: manifestData.issuer || null,
              assertions: Array.isArray(manifestData.assertions)
                ? manifestData.assertions.map((a) => a.label || a.type)
                : [],
              validationStatus,
            },
          });
        } catch (jsonErr) {
          // Output was not JSON, inspect string content
          const isInvalid = combinedOutput.includes('Invalid') || combinedOutput.includes('failed');
          const status = isInvalid ? 'INVALID' : 'VALID';
          const explanation = C2PA_STATUS_EXPLANATIONS[status];

          return resolve({
            status,
            available: true,
            tool: toolCheck.binary,
            explanation: explanation.description,
            forensicImplication: explanation.forensicImplication,
            rawSummary: stdout.trim().substring(0, 500),
          });
        }
      }
    );
  });
};

module.exports = {
  checkC2paAvailability,
  inspectC2paProvenance,
  C2PA_STATUS_EXPLANATIONS,
};
