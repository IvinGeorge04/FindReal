require('../src/config/resolveModules');
const path = require('path');
const fs = require('fs');
const assert = require('assert');
const { runForensicPipeline } = require('../src/services/pipeline.service');

async function testRealAnalysis() {
  console.log('=== Testing Real Media Analysis After Fact Checks Removal ===\n');

  // Locate sample test file
  let testFile = path.join(__dirname, '..', '..', 'frontend', 'public', 'FindRealicon.png');
  if (!fs.existsSync(testFile)) {
    testFile = path.join(__dirname, '..', '..', 'frontend', 'FindRealicon.png');
  }
  assert(fs.existsSync(testFile), `Test file must exist at ${testFile}`);

  const media = {
    filePath: testFile,
    type: 'image',
    mimeType: 'image/png',
    originalName: 'FindRealicon.png',
  };

  console.log(`[Pipeline] Running forensic pipeline on: ${testFile}`);
  const report = await runForensicPipeline(media, {});

  console.log('\n--- Analysis Results ---');
  console.log(`Verdict: ${report.verdict}`);
  console.log(`Manipulation Risk: ${report.manipulationRisk}%`);
  console.log(`Risk Level: ${report.riskLevel}`);
  console.log(`Confidence: ${report.confidenceScore}%`);
  console.log(`Evidence Items: ${report.evidenceItems?.length}`);
  console.log(`Limitations: ${report.limitations?.length}`);
  console.log(`Explanation: ${report.explanation}`);

  console.log('\n--- Evidence Availability ---');
  console.log(Object.keys(report.evidenceAvailability));

  // Assertions:
  assert.ok(report.verdict, 'Verdict must be generated');
  assert.strictEqual(typeof report.manipulationRisk, 'number', 'Manipulation risk must be a number');
  assert.ok(report.explanation, 'Explanation must be generated');

  // Fact check must be completely gone
  assert.strictEqual(report.evidenceAvailability.factCheck, undefined, 'factCheck must not exist in evidenceAvailability');
  assert.strictEqual(report.rawSignals.factCheck, undefined, 'factCheck must not exist in rawSignals');
  assert.ok(report.evidenceAvailability.sourceContext, 'sourceContext must exist in evidenceAvailability');
  assert.strictEqual(report.evidenceAvailability.sourceContext.status, 'NOT_PROVIDED', 'sourceContext must be NOT_PROVIDED');

  const hasFactCheckInEvidence = report.evidenceItems?.some(
    (item) => item.category === 'FACT_CHECK' || item.source === 'FACT_CHECK'
  );
  assert.strictEqual(hasFactCheckInEvidence, false, 'No evidence item should be FACT_CHECK');

  console.log('\n✓ All assertions passed: Pipeline runs cleanly without Fact Checks!');
}

testRealAnalysis().catch((err) => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
