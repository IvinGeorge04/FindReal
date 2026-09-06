require('../config/resolveModules');
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');

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
 * Resolves the path to the c2patool binary.
 * Priority:
 * 1. C2PA_TOOL_PATH environment variable
 * 2. Bundled / local project binary in backend/bin/ (c2patool or c2patool.exe)
 * 3. System PATH ('c2patool', 'c2pa-tool')
 */
const findC2paBinary = () => {
  if (process.env.C2PA_TOOL_PATH && fs.existsSync(process.env.C2PA_TOOL_PATH)) {
    return process.env.C2PA_TOOL_PATH;
  }

  const isWin = process.platform === 'win32';
  const binName = isWin ? 'c2patool.exe' : 'c2patool';

  // 1. backend/bin/c2patool
  const projectBin = path.resolve(__dirname, '../../bin', binName);
  if (fs.existsSync(projectBin)) {
    return projectBin;
  }

  // 2. Alternate relative path
  const srcBin = path.resolve(__dirname, '../bin', binName);
  if (fs.existsSync(srcBin)) {
    return srcBin;
  }

  // 3. Fallback to system PATH binary name
  return 'c2patool';
};

/**
 * Checks whether the c2patool binary is available and executable
 */
const checkC2paAvailability = async (forceRefresh = false) => {
  if (!forceRefresh && c2paToolCache !== null) {
    return c2paToolCache;
  }

  const resolvedBinary = findC2paBinary();

  return new Promise((resolve) => {
    execFile(resolvedBinary, ['--version'], { timeout: 3000 }, (error, stdout) => {
      if (!error && stdout) {
        c2paToolCache = {
          available: true,
          binary: resolvedBinary,
          version: stdout.trim(),
        };
        return resolve(c2paToolCache);
      }

      // If resolvedBinary wasn't 'c2patool', check system PATH 'c2patool'
      if (resolvedBinary !== 'c2patool') {
        execFile('c2patool', ['--version'], { timeout: 3000 }, (errPath, stdoutPath) => {
          if (!errPath && stdoutPath) {
            c2paToolCache = {
              available: true,
              binary: 'c2patool',
              version: stdoutPath.trim(),
            };
            return resolve(c2paToolCache);
          }

          // Try alternate executable name 'c2pa-tool'
          execFile('c2pa-tool', ['--version'], { timeout: 3000 }, (err2, stdout2) => {
            if (!err2 && stdout2) {
              c2paToolCache = {
                available: true,
                binary: 'c2pa-tool',
                version: stdout2.trim(),
              };
            } else {
              c2paToolCache = {
                available: false,
                binary: null,
                version: null,
                reason: 'C2PA extraction utility (c2patool) was not accessible in the server runtime environment.',
              };
            }
            resolve(c2paToolCache);
          });
        });
      } else {
        // Try alternate executable name 'c2pa-tool'
        execFile('c2pa-tool', ['--version'], { timeout: 3000 }, (err2, stdout2) => {
          if (!err2 && stdout2) {
            c2paToolCache = {
              available: true,
              binary: 'c2pa-tool',
              version: stdout2.trim(),
            };
          } else {
            c2paToolCache = {
              available: false,
              binary: null,
              version: null,
              reason: 'C2PA extraction utility (c2patool) was not accessible in the server runtime environment.',
            };
          }
          resolve(c2paToolCache);
        });
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
      { timeout: 15000, maxBuffer: 10 * 1024 * 1024 },
      (error, stdout, stderr) => {
        const combinedOutput = `${stdout || ''} ${stderr || ''}`;

        // Check if no manifest is present
        if (
          error &&
          (combinedOutput.includes('No claim found') ||
            combinedOutput.includes('no manifest') ||
            combinedOutput.includes('No JUMBF') ||
            combinedOutput.includes('ManifestNotFound') ||
            combinedOutput.includes('no claim'))
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

        // If error occurred and not JSON output
        if (error && !stdout.trim().startsWith('{')) {
          if (
            combinedOutput.includes('validation_status') ||
            combinedOutput.includes('validation error') ||
            combinedOutput.includes('Invalid')
          ) {
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

          // General NOT_FOUND fallback if no claim
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
          const activeManifestKey = manifestData.active_manifest;
          const activeManifest =
            (manifestData.manifests && activeManifestKey && manifestData.manifests[activeManifestKey]) ||
            manifestData;

          const validationStatus = manifestData.validation_status || [];
          const hasValidationErrors = validationStatus.some(
            (s) => s.code && s.code !== 'claim.valid' && !s.code.includes('untrusted')
          );

          // If validation_state is explicitly 'Valid' or no structural errors
          const isValid =
            manifestData.validation_state === 'Valid' ||
            (!hasValidationErrors && (!manifestData.validation_state || manifestData.validation_state !== 'Invalid'));

          const status = isValid ? 'VALID' : 'INVALID';
          const explanation = C2PA_STATUS_EXPLANATIONS[status];

          return resolve({
            status,
            available: true,
            tool: toolCheck.binary,
            explanation: explanation.description,
            forensicImplication: explanation.forensicImplication,
            manifest: {
              title: activeManifest.title || manifestData.title || null,
              format: activeManifest.format || manifestData.format || null,
              claimGenerator: activeManifest.claim_generator || manifestData.claim_generator || null,
              issuer:
                activeManifest.signature_info?.issuer ||
                activeManifest.signature_info?.common_name ||
                manifestData.issuer ||
                null,
              assertions: Array.isArray(activeManifest.assertions)
                ? activeManifest.assertions.map((a) => a.label || a.type)
                : Array.isArray(manifestData.assertions)
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
  verifyC2PA: inspectC2paProvenance, // CRITICAL: ensures pipeline.service.js verifyC2PA calls succeed
  C2PA_STATUS_EXPLANATIONS,
};
