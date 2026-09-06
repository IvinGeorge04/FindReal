const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const VERSION = '0.27.20';
const BIN_DIR = path.resolve(__dirname, '../bin');
const IS_WIN = process.platform === 'win32';
const BINARY_NAME = IS_WIN ? 'c2patool.exe' : 'c2patool';
const TARGET_PATH = path.join(BIN_DIR, BINARY_NAME);

// Determine asset name based on platform and architecture
function getReleaseAsset() {
  const platform = process.platform;
  const arch = process.arch;

  if (platform === 'linux' && arch === 'x64') {
    return {
      fileName: `c2patool-v${VERSION}-x86_64-unknown-linux-gnu.tar.gz`,
      isTarGz: true,
    };
  }
  if (platform === 'win32' && arch === 'x64') {
    return {
      fileName: `c2patool-v${VERSION}-x86_64-pc-windows-msvc.zip`,
      isTarGz: false,
    };
  }
  if (platform === 'darwin') {
    return {
      fileName: `c2patool-v${VERSION}-universal-apple-darwin.zip`,
      isTarGz: false,
    };
  }

  // Default to Linux x86_64 for standard container targets
  return {
    fileName: `c2patool-v${VERSION}-x86_64-unknown-linux-gnu.tar.gz`,
    isTarGz: true,
  };
}

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    function get(reqUrl) {
      https.get(reqUrl, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307) {
          if (!res.headers.location) {
            return reject(new Error('Redirect with no location header'));
          }
          return get(res.headers.location);
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`Download failed with HTTP ${res.statusCode}`));
        }
        res.pipe(file);
        file.on('finish', () => {
          file.close(resolve);
        });
      }).on('error', (err) => {
        fs.unlink(destPath, () => {});
        reject(err);
      });
    }
    get(url);
  });
}

async function installC2paTool() {
  // If binary already exists and is executable, skip download
  if (fs.existsSync(TARGET_PATH)) {
    try {
      if (!IS_WIN) {
        fs.chmodSync(TARGET_PATH, 0o755);
      }
      console.log(`[c2patool-installer] Binary already exists at ${TARGET_PATH}`);
      return;
    } catch (e) {
      // Continue to re-install if broken
    }
  }

  if (!fs.existsSync(BIN_DIR)) {
    fs.mkdirSync(BIN_DIR, { recursive: true });
  }

  const asset = getReleaseAsset();
  const downloadUrl = `https://github.com/contentauth/c2pa-rs/releases/download/c2patool-v${VERSION}/${asset.fileName}`;
  const archivePath = path.join(BIN_DIR, asset.fileName);
  const extractTempDir = path.join(BIN_DIR, 'extract_tmp');

  console.log(`[c2patool-installer] Downloading c2patool v${VERSION} for ${process.platform}-${process.arch}...`);
  console.log(`[c2patool-installer] Source: ${downloadUrl}`);

  try {
    await downloadFile(downloadUrl, archivePath);
    console.log(`[c2patool-installer] Download complete (${fs.statSync(archivePath).size} bytes). Extracting...`);

    if (fs.existsSync(extractTempDir)) {
      fs.rmSync(extractTempDir, { recursive: true, force: true });
    }
    fs.mkdirSync(extractTempDir, { recursive: true });

    // Use built-in tar command (available on Linux, macOS, and Windows 10+)
    execSync(`tar -xf "${archivePath}" -C "${extractTempDir}"`, { stdio: 'inherit' });

    // Find c2patool / c2patool.exe inside extracted structure
    let foundBinary = null;
    function searchFile(dir) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          searchFile(full);
        } else if (entry.name === BINARY_NAME) {
          foundBinary = full;
          return;
        }
      }
    }
    searchFile(extractTempDir);

    if (!foundBinary) {
      throw new Error(`Could not find ${BINARY_NAME} in extracted archive`);
    }

    // Also preserve sample folder if present (useful for provenance verification tests)
    const sampleSrc = path.join(path.dirname(foundBinary), 'sample');
    const sampleDst = path.join(BIN_DIR, 'sample');
    if (fs.existsSync(sampleSrc) && !fs.existsSync(sampleDst)) {
      try {
        fs.cpSync(sampleSrc, sampleDst, { recursive: true });
      } catch (cpErr) {
        // Non-critical
      }
    }

    // Move binary to target destination
    fs.copyFileSync(foundBinary, TARGET_PATH);
    if (!IS_WIN) {
      fs.chmodSync(TARGET_PATH, 0o755);
    }

    console.log(`[c2patool-installer] Successfully installed ${BINARY_NAME} to ${TARGET_PATH}`);

    // Verify binary execution
    const ver = execSync(`"${TARGET_PATH}" --version`, { encoding: 'utf-8' }).trim();
    console.log(`[c2patool-installer] Verified execution: ${ver}`);
  } catch (err) {
    console.warn(`[c2patool-installer] Warning: Automatic c2patool installation encountered an error: ${err.message}`);
    console.warn('[c2patool-installer] FindReal non-fabrication rule: C2PA status will report TOOLING_UNAVAILABLE if missing in runtime.');
  } finally {
    // Cleanup temporary archive and extracted files
    if (fs.existsSync(archivePath)) {
      try { fs.unlinkSync(archivePath); } catch (e) {}
    }
    if (fs.existsSync(extractTempDir)) {
      try { fs.rmSync(extractTempDir, { recursive: true, force: true }); } catch (e) {}
    }
  }
}

if (require.main === module) {
  installC2paTool().catch((err) => {
    console.warn(`[c2patool-installer] Failed: ${err.message}`);
    // Do not fail the build if download fails
    process.exit(0);
  });
}

module.exports = { installC2paTool };
