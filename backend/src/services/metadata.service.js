require('../config/resolveModules');
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');

const zlib = require('zlib');

let exifToolCache = null;

/**
 * Checks whether the ExifTool CLI binary is installed and executable in system PATH
 */
const checkExifToolAvailability = async () => {
  if (exifToolCache !== null) {
    return exifToolCache;
  }

  return new Promise((resolve) => {
    execFile('exiftool', ['-ver'], { timeout: 1000 }, (error, stdout) => {
      if (error) {
        exifToolCache = {
          available: false,
          version: null,
          reason: 'ExifTool binary is not installed or not in system PATH.',
        };
      } else {
        exifToolCache = {
          available: true,
          version: stdout.trim(),
        };
      }
      resolve(exifToolCache);
    });
  });
};

/**
 * Known generative AI models, tools, and IPTC provenance signatures
 */
const KNOWN_AI_GENERATORS = [
  'stable diffusion',
  'midjourney',
  'dall-e',
  'dall·e',
  'comfyui',
  'automatic1111',
  'novelai',
  'adobe firefly',
  'firefly',
  'bing image creator',
  'civitai',
  'trainedalgorithmicmedia',
  'compositewithtrainedalgorithmicmedia',
  'generative fill',
  'fooocus',
  'invokeai',
  'flux',
  'kandinsky',
  'ideogram',
  'leonardo.ai',
];

/**
 * Known digital editing software signatures
 */
const KNOWN_EDITING_AGENTS = [
  'photoshop',
  'gimp',
  'lightroom',
  'premiere',
  'after effects',
  'canva',
  'snapseed',
  'affinity',
  'audacity',
  'pro tools',
  'logic pro',
  'fl studio',
  'davinci resolve',
  'ffmpeg',
];

/**
 * Native Node.js image container parser for PNG, JPEG, and WebP.
 * Operates without external system binaries (ExifTool) to extract:
 * - PNG tEXt/iTXt/zTXt chunks (Stable Diffusion parameters, ComfyUI workflows, prompts)
 * - JPEG APP1 XMP (IPTC trainedAlgorithmicMedia tags, DALL-E, Firefly, Midjourney)
 * - Standard dimensions and EXIF camera tags (Make, Model, Software, Timestamps)
 */
const parseNativeMetadata = async (filePath, fileStats) => {
  try {
    const fd = await fs.promises.open(filePath, 'r');
    const readSize = Math.min(2 * 1024 * 1024, fileStats?.fileSizeBytes || 2 * 1024 * 1024);
    const buffer = Buffer.alloc(readSize);
    const { bytesRead } = await fd.read(buffer, 0, buffer.length, 0);
    await fd.close();
    const data = buffer.slice(0, bytesRead);

    let cameraMake = null;
    let cameraModel = null;
    let software = null;
    let isGenerativeAi = false;
    let aiGeneratorName = null;
    let generationPrompt = null;
    let width = null;
    let height = null;
    let fileFormat = null;
    let creationDate = null;
    const contextualNotes = [];

    // 1. PNG Inspection
    if (data.length >= 8 && data.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
      fileFormat = 'PNG';
      let offset = 8;
      while (offset + 8 <= data.length) {
        const length = data.readUInt32BE(offset);
        const type = data.slice(offset + 4, offset + 8).toString('ascii');
        const chunkDataOffset = offset + 8;
        if (chunkDataOffset + length > data.length) break;

        if (type === 'IHDR' && length >= 8) {
          width = data.readUInt32BE(chunkDataOffset);
          height = data.readUInt32BE(chunkDataOffset + 4);
        } else if (type === 'tEXt' || type === 'iTXt') {
          const chunkBuf = data.slice(chunkDataOffset, chunkDataOffset + length);
          const nullIdx = chunkBuf.indexOf(0);
          if (nullIdx > 0) {
            const keyword = chunkBuf.slice(0, nullIdx).toString('latin1');
            let text = '';
            if (type === 'tEXt') {
              text = chunkBuf.slice(nullIdx + 1).toString('latin1');
            } else {
              let textStart = nullIdx + 3;
              const langNull = chunkBuf.indexOf(0, textStart);
              if (langNull >= 0) {
                const transNull = chunkBuf.indexOf(0, langNull + 1);
                if (transNull >= 0) textStart = transNull + 1;
              }
              const isCompressed = chunkBuf[nullIdx + 1] === 1;
              const rawTextBuf = chunkBuf.slice(textStart);
              if (isCompressed) {
                try {
                  text = zlib.inflateSync(rawTextBuf).toString('utf-8');
                } catch (e) {}
              } else {
                text = rawTextBuf.toString('utf-8');
              }
            }

            const lowerKey = keyword.toLowerCase();
            const lowerText = text.toLowerCase();

            if (lowerKey === 'parameters' || lowerKey === 'workflow' || lowerKey === 'prompt') {
              isGenerativeAi = true;
              if (lowerText.includes('steps:') || lowerText.includes('sampler:') || lowerText.includes('cfg scale:')) {
                aiGeneratorName = 'Stable Diffusion (Automatic1111 / WebUI)';
              } else if (lowerKey === 'workflow' || lowerText.includes('comfyui')) {
                aiGeneratorName = 'ComfyUI Workflow';
              } else {
                aiGeneratorName = 'AI Generative Framework';
              }
              software = aiGeneratorName;
              generationPrompt = text.slice(0, 300);
            } else if (lowerKey === 'software') {
              software = text.trim();
              const matchedGen = KNOWN_AI_GENERATORS.find((g) => lowerText.includes(g));
              if (matchedGen) {
                isGenerativeAi = true;
                aiGeneratorName = text.trim();
              }
            } else if (lowerKey === 'comment' || lowerKey === 'description') {
              const matchedGen = KNOWN_AI_GENERATORS.find((g) => lowerText.includes(g));
              if (matchedGen) {
                isGenerativeAi = true;
                aiGeneratorName = matchedGen.toUpperCase();
              }
            }
          }
        } else if (type === 'zTXt') {
          try {
            const chunkBuf = data.slice(chunkDataOffset, chunkDataOffset + length);
            const nullIdx = chunkBuf.indexOf(0);
            if (nullIdx > 0) {
              const keyword = chunkBuf.slice(0, nullIdx).toString('latin1');
              const compText = zlib.inflateSync(chunkBuf.slice(nullIdx + 2)).toString('latin1');
              const lowerKey = keyword.toLowerCase();
              const lowerText = compText.toLowerCase();
              if (lowerKey === 'parameters' || lowerText.includes('steps:') || lowerText.includes('sampler:')) {
                isGenerativeAi = true;
                aiGeneratorName = 'Stable Diffusion (Compressed Parameters)';
                software = aiGeneratorName;
                generationPrompt = compText.slice(0, 300);
              }
            }
          } catch (e) {}
        }
        offset += 12 + length;
      }
    }
    // 2. JPEG Inspection
    else if (data.length >= 2 && data[0] === 0xff && data[1] === 0xd8) {
      fileFormat = 'JPEG';
      let offset = 2;
      while (offset + 4 <= data.length) {
        if (data[offset] !== 0xff) break;
        const marker = data[offset + 1];
        if (marker === 0xd9 || marker === 0xda) break;

        const length = data.readUInt16BE(offset + 2);
        const segmentData = data.slice(offset + 4, offset + 2 + length);

        if (marker === 0xe1) {
          const xmpHeader = 'http://ns.adobe.com/xap/1.0/\0';
          if (segmentData.slice(0, xmpHeader.length).toString('ascii') === xmpHeader) {
            const xmpText = segmentData.slice(xmpHeader.length).toString('utf-8');
            const lowerXmp = xmpText.toLowerCase();

            if (lowerXmp.includes('trainedalgorithmicmedia') || lowerXmp.includes('compositewithtrainedalgorithmicmedia')) {
              isGenerativeAi = true;
              aiGeneratorName = 'Generative AI (IPTC trainedAlgorithmicMedia tag)';
              software = 'Generative AI Engine';
            }

            const matchedAi = KNOWN_AI_GENERATORS.find((g) => lowerXmp.includes(g));
            if (matchedAi) {
              isGenerativeAi = true;
              aiGeneratorName = matchedAi.toUpperCase();
              software = software || aiGeneratorName;
            }
          } else if (segmentData.slice(0, 6).toString('ascii') === 'Exif\0\0') {
            const tiffData = segmentData.slice(6);
            if (tiffData.length >= 8) {
              const isLittle = tiffData.slice(0, 2).toString('ascii') === 'II';
              const read16 = (o) => (isLittle ? tiffData.readUInt16LE(o) : tiffData.readUInt16BE(o));
              const read32 = (o) => (isLittle ? tiffData.readUInt32LE(o) : tiffData.readUInt32BE(o));

              const ifdOffset = read32(4);
              if (ifdOffset + 2 <= tiffData.length) {
                const tagCount = read16(ifdOffset);
                let entryOffset = ifdOffset + 2;
                for (let i = 0; i < tagCount && entryOffset + 12 <= tiffData.length; i++) {
                  const tag = read16(entryOffset);
                  const count = read32(entryOffset + 4);
                  const valOffset = read32(entryOffset + 8);

                  if (tag === 0x010f && valOffset < tiffData.length) {
                    cameraMake = tiffData.slice(valOffset, valOffset + count).toString('ascii').replace(/\0+$/, '').trim();
                  } else if (tag === 0x0110 && valOffset < tiffData.length) {
                    cameraModel = tiffData.slice(valOffset, valOffset + count).toString('ascii').replace(/\0+$/, '').trim();
                  } else if (tag === 0x0131 && valOffset < tiffData.length) {
                    software = tiffData.slice(valOffset, valOffset + count).toString('ascii').replace(/\0+$/, '').trim();
                  } else if (tag === 0x0132 && valOffset < tiffData.length) {
                    creationDate = tiffData.slice(valOffset, valOffset + count).toString('ascii').replace(/\0+$/, '').trim();
                  }
                  entryOffset += 12;
                }
              }
            }
          }
        } else if ((marker === 0xc0 || marker === 0xc2) && segmentData.length >= 5) {
          height = segmentData.readUInt16BE(1);
          width = segmentData.readUInt16BE(3);
        }

        offset += 2 + length;
      }
    }
    // 3. WebP Inspection
    else if (data.length >= 12 && data.slice(0, 4).toString('ascii') === 'RIFF' && data.slice(8, 12).toString('ascii') === 'WEBP') {
      fileFormat = 'WEBP';
      const webpStr = data.toString('utf-8', 0, Math.min(data.length, 50000)).toLowerCase();
      if (webpStr.includes('trainedalgorithmicmedia')) {
        isGenerativeAi = true;
        aiGeneratorName = 'Generative AI (IPTC Tag)';
      }
      const matched = KNOWN_AI_GENERATORS.find((g) => webpStr.includes(g));
      if (matched) {
        isGenerativeAi = true;
        aiGeneratorName = matched.toUpperCase();
        software = aiGeneratorName;
      }
    }

    const hasAiOrEditingSoftware = Boolean(
      isGenerativeAi ||
      (software && (
        KNOWN_AI_GENERATORS.some((g) => software.toLowerCase().includes(g)) ||
        KNOWN_EDITING_AGENTS.some((agent) => software.toLowerCase().includes(agent))
      ))
    );

    if (isGenerativeAi) {
      contextualNotes.push(
        `Synthetic generative AI metadata identified: "${aiGeneratorName || software}". Container retains algorithmic generation provenance.`
      );
      if (generationPrompt) {
        contextualNotes.push(`Generation prompt/parameters: "${generationPrompt.slice(0, 150)}..."`);
      }
    } else if (hasAiOrEditingSoftware) {
      contextualNotes.push(
        `Editing software signature identified: "${software}". Contextual evidence of post-processing.`
      );
    } else if (cameraMake || cameraModel) {
      contextualNotes.push(
        `Physical camera hardware captured: ${[cameraMake, cameraModel].filter(Boolean).join(' ')}.`
      );
    } else {
      contextualNotes.push(
        'Standard file container parsed. No camera EXIF or AI parameters preserved in container.'
      );
    }

    const dimensions = width && height ? `${width} x ${height}` : null;

    return {
      status: 'SUCCESS',
      available: true,
      tool: 'Native Container Inspector',
      cameraMake,
      cameraModel,
      software,
      hasAiOrEditingSoftware,
      isGenerativeAi,
      aiGeneratorName,
      generationPrompt,
      creationDate,
      modificationDate: fileStats?.lastModified || null,
      fileFormat: fileFormat || 'IMAGE',
      dimensions,
      imageWidth: width,
      imageHeight: height,
      extracted: {
        cameraMake,
        cameraModel,
        software,
        hasAiOrEditingSoftware,
        isGenerativeAi,
        aiGeneratorName,
        creationDate,
        modificationDate: fileStats?.lastModified || null,
        fileFormat: fileFormat || 'IMAGE',
        dimensions,
        imageWidth: width,
        imageHeight: height,
        codec: null,
        audioProperties: null,
      },
      forensics: {
        hasCameraMetadata: Boolean(cameraMake || cameraModel),
        editingSoftwareDetected: hasAiOrEditingSoftware,
        isGenerativeAi,
      },
      contextualNotes,
    };
  } catch (err) {
    return {
      status: 'UNAVAILABLE',
      available: false,
      tool: 'Native Container Inspector',
      message: err.message,
    };
  }
};

/**
 * Extracts and synthesizes technical metadata using ExifTool where available,
 * with automatic fallback to high-fidelity native container parsing.
 *
 * @param {string} filePath - Absolute path to the verified media asset
 * @returns {Promise<Object>} Structured metadata extraction result
 */
const extractMetadata = async (filePath) => {
  // 1. Verify file exists on disk
  let fileStats = null;
  try {
    const stats = await fs.promises.stat(filePath);
    fileStats = {
      fileSizeBytes: stats.size,
      lastModified: stats.mtime.toISOString(),
    };
  } catch (err) {
    return {
      status: 'ERROR',
      available: false,
      message: `Media file at ${filePath} is unreadable or missing.`,
    };
  }

  // 2. Check ExifTool availability
  const toolCheck = await checkExifToolAvailability();

  if (!toolCheck.available) {
    // Run Native Container Inspector for robust image parsing
    return await parseNativeMetadata(filePath, fileStats);
  }

  // 3. Execute ExifTool with JSON output flags (-j, -G, -q)
  return new Promise((resolve) => {
    execFile(
      'exiftool',
      ['-j', '-G', '-q', filePath],
      { timeout: 10000, maxBuffer: 10 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error || !stdout) {
          return resolve({
            status: 'EXTRACTION_FAILED',
            available: true,
            tool: 'ExifTool',
            message: `ExifTool execution failed: ${error ? error.message : 'Empty output'}`,
            contextualNotes: ['Failed to parse metadata stream from media container.'],
          });
        }

        try {
          const parsedArray = JSON.parse(stdout);
          const raw = parsedArray[0] || {};

          // Extract standard camera attributes
          const cameraMake = raw['EXIF:Make'] || raw['Make'] || null;
          const cameraModel = raw['EXIF:Model'] || raw['Model'] || null;
          const software =
            raw['EXIF:Software'] ||
            raw['Software'] ||
            raw['XMP:CreatorTool'] ||
            raw['XMP-xmp:CreatorTool'] ||
            raw['XMP:HistorySoftwareAgent'] ||
            null;

          // Extract timestamps
          const creationDate =
            raw['EXIF:DateTimeOriginal'] ||
            raw['DateTimeOriginal'] ||
            raw['EXIF:CreateDate'] ||
            raw['CreateDate'] ||
            raw['QuickTime:CreateDate'] ||
            null;

          const modificationDate =
            raw['EXIF:ModifyDate'] ||
            raw['ModifyDate'] ||
            raw['File:FileModifyDate'] ||
            raw['FileModifyDate'] ||
            null;

          // File format & dimensions
          const fileFormat = raw['File:FileType'] || raw['FileType'] || raw['File:MIMEType'] || null;
          const width = raw['File:ImageWidth'] || raw['Composite:ImageWidth'] || raw['ImageWidth'] || null;
          const height = raw['File:ImageHeight'] || raw['Composite:ImageHeight'] || raw['ImageHeight'] || null;
          const dimensions = width && height ? `${width} x ${height}` : null;

          // Codec and audio properties
          const codec =
            raw['QuickTime:CompressorID'] ||
            raw['CompressorID'] ||
            raw['RIFF:AudioCodec'] ||
            raw['AudioCodec'] ||
            raw['File:Compression'] ||
            null;

          const audioProperties = {
            sampleRate: raw['Composite:AudioSampleRate'] || raw['AudioSampleRate'] || raw['SampleRate'] || null,
            channels: raw['QuickTime:AudioChannels'] || raw['AudioChannels'] || raw['Channels'] || null,
            bitrate: raw['Composite:AvgBitrate'] || raw['AudioBitrate'] || raw['Bitrate'] || null,
            duration: raw['Composite:Duration'] || raw['Duration'] || null,
          };

          // Contextual Forensic Observations
          const contextualNotes = [];
          const hasExif = Boolean(cameraMake || cameraModel || creationDate);

          if (!hasExif) {
            contextualNotes.push(
              'No camera hardware metadata (EXIF) was found. Note: Social media platforms and messaging apps strip EXIF data automatically upon upload. Missing metadata does NOT prove manipulation.'
            );
          } else {
            contextualNotes.push(
              `Camera hardware metadata identified: ${[cameraMake, cameraModel].filter(Boolean).join(' ')}. Signals physical sensor capture.`
            );
          }

          let editingSoftwareDetected = false;
          let isGenerativeAi = false;
          let aiGeneratorName = null;

          if (software) {
            const lowerSoft = String(software).toLowerCase();
            const matchedAi = KNOWN_AI_GENERATORS.find((g) => lowerSoft.includes(g));
            if (matchedAi) {
              isGenerativeAi = true;
              aiGeneratorName = software;
              editingSoftwareDetected = true;
              contextualNotes.push(
                `Synthetic generative AI software signature identified: "${software}". Metadata explicitly preserves algorithmic creation origin.`
              );
            } else {
              const matchedAgent = KNOWN_EDITING_AGENTS.find((agent) => lowerSoft.includes(agent));
              if (matchedAgent) {
                editingSoftwareDetected = true;
                contextualNotes.push(
                  `Software tag identified: "${software}". Note: Editing software indicates post-processing or export history. It is contextual evidence and does not by itself prove malicious fabrication.`
                );
              } else {
                contextualNotes.push(`Software tag detected: "${software}".`);
              }
            }
          }

          return resolve({
            status: 'SUCCESS',
            available: true,
            tool: `ExifTool v${toolCheck.version || 'unknown'}`,
            cameraMake,
            cameraModel,
            software,
            hasAiOrEditingSoftware: editingSoftwareDetected,
            isGenerativeAi,
            aiGeneratorName,
            creationDate,
            modificationDate,
            fileFormat,
            dimensions,
            imageWidth: width,
            imageHeight: height,
            codec,
            audioProperties,
            extracted: {
              cameraMake,
              cameraModel,
              software,
              hasAiOrEditingSoftware: editingSoftwareDetected,
              isGenerativeAi,
              aiGeneratorName,
              creationDate,
              modificationDate,
              fileFormat,
              dimensions,
              imageWidth: width,
              imageHeight: height,
              codec,
              audioProperties,
            },
            forensics: {
              hasCameraMetadata: hasExif,
              editingSoftwareDetected,
              isGenerativeAi,
            },
            contextualNotes,
          });
        } catch (parseErr) {
          return resolve({
            status: 'PARSE_ERROR',
            available: true,
            message: 'Failed to parse ExifTool JSON output.',
          });
        }
      }
    );
  });
};

module.exports = {
  checkExifToolAvailability,
  extractMetadata,
};
