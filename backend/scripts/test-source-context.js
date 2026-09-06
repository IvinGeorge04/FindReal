require('../src/config/resolveModules');
const assert = require('assert');
const sourceContextService = require('../src/services/sourceContext.service');
const aggregationService = require('../src/services/aggregation.service');
const { runForensicPipeline } = require('../src/services/pipeline.service');
const path = require('path');

async function testSourceContextCases() {
  console.log('--- Testing Source Context State Taxonomy ---');

  // CASE 1 — Direct file upload with no source information
  console.log('\n[TEST CASE 1] Direct file upload with no source information:');
  const case1Input = {
    originalName: 'test-photo.jpg',
    mediaType: 'image',
    userClaim: null,
  };
  const case1Result = sourceContextService.resolveSourceContext(case1Input);
  console.log('Result:', case1Result);
  assert.strictEqual(case1Result.status, 'NOT_PROVIDED', 'Case 1 status must be NOT_PROVIDED');
  assert.strictEqual(case1Result.hasContext, false, 'Case 1 hasContext must be false');
  assert.strictEqual(case1Result.message, 'No source context provided.');
  assert.strictEqual(
    case1Result.note,
    'This file was uploaded directly and does not contain a verified origin URL, publisher attribution, or contextual source information.'
  );

  // Check aggregation for Case 1
  const case1Agg = aggregationService.aggregateEvidenceAndAssessRisk({
    sourceContext: case1Result,
  });
  console.log('Case 1 Aggregation availability:', case1Agg.evidenceAvailability.sourceContext);
  assert.strictEqual(case1Agg.evidenceAvailability.sourceContext.status, 'NOT_PROVIDED');
  assert.strictEqual(case1Agg.evidenceAvailability.sourceContext.message, 'No source context provided.');

  // CASE 2 — User provides a valid source URL
  console.log('\n[TEST CASE 2] User provides a valid source URL:');
  const case2Input = {
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    publisher: 'Rick Astley Official',
    notes: 'Official music video upload',
  };
  const case2Result = sourceContextService.resolveSourceContext(case2Input);
  console.log('Result:', case2Result);
  assert.strictEqual(case2Result.status, 'AVAILABLE', 'Case 2 status must be AVAILABLE');
  assert.strictEqual(case2Result.hasContext, true, 'Case 2 hasContext must be true');
  assert.strictEqual(case2Result.platform, 'YouTube');
  assert.strictEqual(case2Result.domain, 'www.youtube.com');
  assert.strictEqual(case2Result.publisher, 'Rick Astley Official');

  // Check aggregation for Case 2
  const case2Agg = aggregationService.aggregateEvidenceAndAssessRisk({
    sourceContext: case2Result,
  });
  console.log('Case 2 Aggregation availability:', case2Agg.evidenceAvailability.sourceContext);
  assert.strictEqual(case2Agg.evidenceAvailability.sourceContext.status, 'AVAILABLE');

  // CASE 3 — External source-context service actually fails
  console.log('\n[TEST CASE 3] External source-context service actually fails:');
  const case3Input = {
    serviceFailed: true,
    message: 'Source context service unavailable.',
    note: 'The external source-context service could not be reached or encountered an error.',
  };
  const case3Result = sourceContextService.resolveSourceContext(case3Input);
  console.log('Result:', case3Result);
  assert.strictEqual(case3Result.status, 'UNAVAILABLE', 'Case 3 status must be UNAVAILABLE');
  assert.strictEqual(case3Result.hasContext, false, 'Case 3 hasContext must be false');
  assert.strictEqual(case3Result.message, 'Source context service unavailable.');
  assert.strictEqual(
    case3Result.note,
    'The external source-context service could not be reached or encountered an error.'
  );

  // Check aggregation for Case 3
  const case3Agg = aggregationService.aggregateEvidenceAndAssessRisk({
    sourceContext: case3Result,
  });
  console.log('Case 3 Aggregation availability:', case3Agg.evidenceAvailability.sourceContext);
  assert.strictEqual(case3Agg.evidenceAvailability.sourceContext.status, 'UNAVAILABLE');
  assert.strictEqual(case3Agg.evidenceAvailability.sourceContext.message, 'Source context service unavailable.');

  // CASE 4 — Verify UI texts avoid "Source context unavailable"
  console.log('\n[TEST CASE 4] Verify "Source context unavailable" is not emitted for missing context:');
  assert.notStrictEqual(case1Result.message, 'Source context unavailable.');
  assert.notStrictEqual(case1Agg.evidenceAvailability.sourceContext.message, 'Source context unavailable.');

  console.log('\nALL 4 TEST CASES PASSED SUCCESSFULLY!');
}

testSourceContextCases().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
