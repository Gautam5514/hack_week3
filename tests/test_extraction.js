/**
 * Test Suite: Document Extraction Engine
 * Verifies local deterministic and open-weight extraction accuracy.
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const HeuristicEngine = require('../src/engines/heuristic');
const DocumentParser = require('../src/utils/pdf_parser');

async function runTests() {
  console.log('🧪 Running Test Suite: Document Extraction Engine...');
  const engine = new HeuristicEngine();
  const samplesDir = path.join(__dirname, '..', 'samples');

  // Test 1: AWS Cloud Receipt Extraction
  {
    const file = path.join(samplesDir, 'receipt_aws_cloud.txt');
    const text = DocumentParser.parseFile(file);
    const result = engine.extract(text, 'receipt_aws_cloud.txt');

    assert.strictEqual(result.vendor, 'AWS', 'Vendor should be AWS');
    assert.strictEqual(result.total, 404.49, 'Total amount should be $404.49');
    assert.strictEqual(result.subtotal, 372.80, 'Subtotal should be $372.80');
    assert.strictEqual(result.currency, 'USD', 'Currency should be USD');
    console.log('  ✓ Test 1 Passed: AWS Cloud receipt correctly extracted ($404.49)');
  }

  // Test 2: Starbucks Meeting Receipt
  {
    const file = path.join(samplesDir, 'receipt_coffee_client_meeting.txt');
    const text = DocumentParser.parseFile(file);
    const result = engine.extract(text, 'receipt_coffee_client_meeting.txt');

    assert.strictEqual(result.vendor, 'Starbucks', 'Vendor should be Starbucks');
    assert.strictEqual(result.total, 28.77, 'Total amount should be $28.77');
    console.log('  ✓ Test 2 Passed: Starbucks client meal receipt correctly extracted ($28.77)');
  }

  // Test 3: Apple Hardware Receipt
  {
    const file = path.join(samplesDir, 'receipt_apple_hardware.txt');
    const text = DocumentParser.parseFile(file);
    const result = engine.extract(text, 'receipt_apple_hardware.txt');

    assert.strictEqual(result.vendor, 'Apple', 'Vendor should be Apple');
    assert.strictEqual(result.total, 4309.15, 'Total should be $4309.15');
    console.log('  ✓ Test 3 Passed: Apple hardware receipt correctly extracted ($4,309.15)');
  }

  // Test 4: WeWork Coworking Receipt
  {
    const file = path.join(samplesDir, 'receipt_wework_coworking.txt');
    const text = DocumentParser.parseFile(file);
    const result = engine.extract(text, 'receipt_wework_coworking.txt');

    assert.strictEqual(result.vendor, 'WeWork', 'Vendor should be WeWork');
    assert.strictEqual(result.total, 545.00, 'Total should be $545.00');
    console.log('  ✓ Test 4 Passed: WeWork rent invoice correctly extracted ($545.00)');
  }

  console.log('🎉 All Extraction Engine tests passed successfully!\n');
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
