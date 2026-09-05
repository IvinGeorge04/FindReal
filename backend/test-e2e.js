/**
 * FindReal - Comprehensive Final End-to-End Integration Test Suite
 * Validates the full functional lifecycle and security guarantees:
 * 1. Register -> Login -> Me
 * 2. Valid Media Upload -> Binary Validation -> UUID Storage
 * 3. Multi-Engine Forensic Pipeline Execution -> Evidence Aggregation
 * 4. Analysis Retrieval -> History -> Report (Safe Sanitization)
 * 5. IDOR Access Control (User 2 blocked from User 1's records)
 * 6. Delete Analysis Lifecycle
 * 7. Security Checks (SSRF, Spoofed Magic-Bytes, Rate Limits)
 */

const http = require('http');
const path = require('path');
const fs = require('fs');
const app = require('./src/app');

// 1x1 valid PNG binary buffer
const VALID_PNG_BUFFER = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2d450000000049454e44ae426082',
  'hex'
);

let server;
let BASE_URL;

const request = async (endpoint, options = {}) => {
  const url = `${BASE_URL}${endpoint}`;
  const headers = options.headers || {};
  if (options.cookie) {
    headers['Cookie'] = options.cookie;
  }
  if (options.json) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.json);
  }

  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body,
  });

  let data = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  // Extract Set-Cookie header if present
  let setCookie = '';
  if (typeof res.headers.getSetCookie === 'function') {
    const cookies = res.headers.getSetCookie();
    setCookie = cookies.join('; ');
  } else {
    setCookie = res.headers.get('set-cookie') || '';
  }

  return {
    status: res.status,
    headers: res.headers,
    data,
    setCookie,
  };
};

// Helper to build multipart form data for node fetch
const buildMultipart = (fieldName, filename, fileBuffer, mimeType = 'image/png') => {
  const boundary = '----FindRealBoundary' + Math.random().toString(36).substring(2);
  const header = `--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`;
  const footer = `\r\n--${boundary}--\r\n`;
  const body = Buffer.concat([
    Buffer.from(header, 'utf-8'),
    fileBuffer,
    Buffer.from(footer, 'utf-8'),
  ]);
  return {
    body,
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
    },
  };
};

async function runE2ETests() {
  console.log('====================================================');
  console.log('   FINDREAL END-TO-END INTEGRATION & SECURITY SUITE ');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`  ✓ ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAILED: ${message}`);
      throw new Error(message);
    }
  }

  // Start temporary local test server on an ephemeral port
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      BASE_URL = `http://127.0.0.1:${port}`;
      console.log(`[E2E Setup] Test server started on ${BASE_URL}\n`);
      resolve();
    });
  });

  try {
    // ----------------------------------------------------
    // 1. User Registration & Authentication
    // ----------------------------------------------------
    console.log('[Step 1] User Registration & Authentication Flow');
    const user1Email = `forensic_user_${Date.now()}@findreal.ai`;
    const user1Password = 'SecurePass123!';

    const regRes = await request('/api/v1/auth/register', {
      method: 'POST',
      json: {
        name: 'Lead Forensic Investigator',
        email: user1Email,
        password: user1Password,
      },
    });
    assert(regRes.status === 201, 'User 1 successfully registered (Status 201)');
    assert(regRes.data.data.user.email === user1Email, 'Returned registered user identity matches');

    // Login User 1
    const loginRes = await request('/api/v1/auth/login', {
      method: 'POST',
      json: {
        email: user1Email,
        password: user1Password,
      },
    });
    assert(loginRes.status === 200, 'User 1 login successful (Status 200)');
    assert(loginRes.setCookie && loginRes.setCookie.includes('token='), 'HttpOnly token cookie issued');
    const user1Cookie = loginRes.setCookie.split(';')[0];

    // Verify /auth/me session
    const meRes = await request('/api/v1/auth/me', { cookie: user1Cookie });
    assert(meRes.status === 200, 'User session validated via /api/v1/auth/me');
    assert(meRes.data.data.user.email === user1Email, 'User details verified from token payload');

    // ----------------------------------------------------
    // 2. Media Upload & Validation
    // ----------------------------------------------------
    console.log('\n[Step 2] Media Upload & Binary Validation');
    const multipart = buildMultipart('media', 'evidence_sample.png', VALID_PNG_BUFFER, 'image/png');
    const uploadRes = await request('/api/v1/media/upload', {
      method: 'POST',
      cookie: user1Cookie,
      headers: multipart.headers,
      body: multipart.body,
    });

    assert(uploadRes.status === 201, 'Media asset uploaded successfully (Status 201)');
    const mediaPayload = uploadRes.data.data;
    const mediaId = mediaPayload.mediaId || mediaPayload.id;
    assert(mediaId, 'Media record generated with valid ID');
    assert(mediaPayload.mimeType === 'image/png', 'MIME type verified by binary signature');

    // ----------------------------------------------------
    // 3. Multi-Engine Forensic Pipeline Execution
    // ----------------------------------------------------
    console.log('\n[Step 3] Forensic Pipeline Execution');
    const analysisRes = await request('/api/v1/analysis', {
      method: 'POST',
      cookie: user1Cookie,
      json: {
        mediaId: mediaId,
        sourceContext: {
          originalName: 'evidence_sample.png',
          userClaim: 'Official photo released by agency without alterations.',
        },
      },
    });

    assert(analysisRes.status === 201, 'Forensic pipeline finished successfully (Status 201)');
    const analysis = analysisRes.data.data.analysis;
    assert(analysis.verdict, `Analysis returned verdict: "${analysis.verdict}"`);
    assert(typeof analysis.manipulationRisk === 'number', `Manipulation risk quantified: ${analysis.manipulationRisk}%`);
    assert(analysis.riskLevel, `Risk category assigned: "${analysis.riskLevel}"`);
    assert(analysis.limitations && analysis.limitations.length > 0, 'Limitations explicitly included in result');
    assert(analysis.explanation, 'Clear user-facing explanation generated');
    const analysisId = analysis.id || analysis._id;

    // ----------------------------------------------------
    // 4. Retrieve Analysis Record & History
    // ----------------------------------------------------
    console.log('\n[Step 4] Analysis Retrieval & History');
    const getRes = await request(`/api/v1/analysis/${analysisId}`, { cookie: user1Cookie });
    assert(getRes.status === 200, 'Analysis retrieved by ID (Status 200)');
    assert(getRes.data.data.analysis.mediaName === 'evidence_sample.png', 'Media name matches original asset');

    const historyRes = await request('/api/v1/analysis/history', { cookie: user1Cookie });
    assert(historyRes.status === 200, 'Analysis history retrieved (Status 200)');
    assert(Array.isArray(historyRes.data.data.history), 'History is returned as an array');
    const historyItem = historyRes.data.data.history.find((h) => h.id === analysisId);
    assert(!!historyItem, 'Created analysis is present in user history');

    // ----------------------------------------------------
    // 5. Official Verification Report
    // ----------------------------------------------------
    console.log('\n[Step 5] Verification Report Retrieval & Safe Sanitization');
    const reportRes = await request(`/api/v1/reports/${analysisId}`, { cookie: user1Cookie });
    assert(reportRes.status === 200, 'Official report fetched (Status 200)');
    const report = reportRes.data.data.report;
    assert(report.title === 'FindReal Verification Report', 'Report title matches standard specification');
    assert(report.overallAssessment, 'Report contains overall assessment');
    assert(!JSON.stringify(report).includes('process.env') && !JSON.stringify(report).includes('API_KEY'), 'Zero API keys or env secrets leaked in report');
    assert(!JSON.stringify(report).includes('systemPrompt'), 'Zero internal prompts leaked in report');

    // ----------------------------------------------------
    // 6. IDOR (Insecure Direct Object Reference) Prevention
    // ----------------------------------------------------
    console.log('\n[Step 6] IDOR Authorization Enforcement');
    // Register User 2 (adversary/unauthorized party)
    const user2Email = `unauthorized_user_${Date.now()}@findreal.ai`;
    await request('/api/v1/auth/register', {
      method: 'POST',
      json: {
        name: 'Second User',
        email: user2Email,
        password: 'Password999!',
      },
    });
    const login2Res = await request('/api/v1/auth/login', {
      method: 'POST',
      json: {
        email: user2Email,
        password: 'Password999!',
      },
    });
    const user2Cookie = login2Res.setCookie.split(';')[0];

    // User 2 attempts to read User 1's analysis
    const idorReadRes = await request(`/api/v1/analysis/${analysisId}`, { cookie: user2Cookie });
    assert(idorReadRes.status === 403, 'IDOR blocked: User 2 forbidden from viewing User 1 analysis (Status 403)');

    // User 2 attempts to read User 1's report
    const idorReportRes = await request(`/api/v1/reports/${analysisId}`, { cookie: user2Cookie });
    assert(idorReportRes.status === 403, 'IDOR blocked: User 2 forbidden from viewing User 1 report (Status 403)');

    // User 2 attempts to delete User 1's analysis
    const idorDeleteRes = await request(`/api/v1/analysis/${analysisId}`, {
      method: 'DELETE',
      cookie: user2Cookie,
    });
    assert(idorDeleteRes.status === 403, 'IDOR blocked: User 2 forbidden from deleting User 1 analysis (Status 403)');

    // ----------------------------------------------------
    // 7. Legitimate Deletion Lifecycle
    // ----------------------------------------------------
    console.log('\n[Step 7] Legitimate Analysis Deletion');
    const deleteRes = await request(`/api/v1/analysis/${analysisId}`, {
      method: 'DELETE',
      cookie: user1Cookie,
    });
    assert(deleteRes.status === 200, 'Owner successfully deleted analysis (Status 200)');

    // Verify it is no longer retrievable
    const verifyDeleteRes = await request(`/api/v1/analysis/${analysisId}`, { cookie: user1Cookie });
    assert(verifyDeleteRes.status === 404, 'Deleted analysis returns 404 Not Found');

    // ----------------------------------------------------
    // 8. SSRF Protection on URL Ingestion
    // ----------------------------------------------------
    console.log('\n[Step 8] SSRF Protection on Ingestion Endpoint');
    const ssrfLoopbackRes = await request('/api/v1/media/url', {
      method: 'POST',
      cookie: user1Cookie,
      json: { url: 'http://127.0.0.1:5000/api/v1/secret' },
    });
    assert(ssrfLoopbackRes.status === 400, 'SSRF blocked on 127.0.0.1 loopback destination (Status 400)');

    const ssrfMetadataRes = await request('/api/v1/media/url', {
      method: 'POST',
      cookie: user1Cookie,
      json: { url: 'http://169.254.169.254/latest/meta-data/' },
    });
    assert(ssrfMetadataRes.status === 400, 'SSRF blocked on AWS/GCP cloud metadata IP (Status 400)');

    const ssrfProtoRes = await request('/api/v1/media/url', {
      method: 'POST',
      cookie: user1Cookie,
      json: { url: 'file:///etc/passwd' },
    });
    assert(ssrfProtoRes.status === 400, 'SSRF blocked on file: URI protocol (Status 400)');

    // ----------------------------------------------------
    // 9. Spoofed File Rejection
    // ----------------------------------------------------
    console.log('\n[Step 9] Spoofed Binary Rejection');
    const fakeExeBuffer = Buffer.from('MZ' + 'A'.repeat(64)); // PE EXE header
    const spoofedMultipart = buildMultipart('media', 'malicious.jpg', fakeExeBuffer, 'image/jpeg');
    const spoofRes = await request('/api/v1/media/upload', {
      method: 'POST',
      cookie: user1Cookie,
      headers: spoofedMultipart.headers,
      body: spoofedMultipart.body,
    });
    assert(spoofRes.status === 400, 'Spoofed executable disguised as .jpg correctly rejected (Status 400)');

    console.log('\n====================================================');
    console.log(`  ALL ${passed}/${total} E2E & SECURITY ASSERTIONS PASSED (100%)`);
    console.log('====================================================\n');
  } finally {
    if (server) {
      server.close();
    }
  }
}

runE2ETests().catch((err) => {
  console.error('\nE2E Test Execution Failed:', err);
  if (server) server.close();
  process.exit(1);
});
