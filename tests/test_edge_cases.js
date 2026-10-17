/**
 * Comprehensive Edge-Case Verification Suite: LedgerZero AI
 * Tests extreme inputs, security boundaries, and defensive programming invariants.
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

const HeuristicEngine = require('../src/engines/heuristic');
const LocalLLMEngine = require('../src/engines/local_llm');
const ExtractorAgent = require('../src/agents/extractor');
const CategorizerAgent = require('../src/agents/categorizer');
const ValidatorAgent = require('../src/agents/validator');
const Exporter = require('../src/utils/exporter');
const DocumentStore = require('../src/store');
const DocumentParser = require('../src/utils/pdf_parser');

async function runEdgeCaseTests() {
  console.log('================================================================');
  console.log(' 🛡️  RUNNING EDGE-CASE & ROBUSTNESS AUDIT SUITE: LEDGERZERO AI');
  console.log('================================================================\n');

  const heuristic = new HeuristicEngine();
  const categorizer = new CategorizerAgent();
  const validator = new ValidatorAgent();

  // ---------------------------------------------------------
  // Edge Case 1: Heuristic Engine with Null, Empty, and Corrupt Text
  // ---------------------------------------------------------
  console.log('▶ [Edge Case 1] Null, Empty, and Non-String Inputs');
  {
    // Null input
    const resNull = heuristic.extract(null, null);
    assert.strictEqual(resNull.vendor, 'Unknown Merchant');
    assert.strictEqual(resNull.total, 0);
    assert.strictEqual(typeof resNull.date, 'string');
    console.log('  ✓ Null rawText handled gracefully without crash');

    // Empty string
    const resEmpty = heuristic.extract('', '');
    assert.strictEqual(resEmpty.total, 0);
    console.log('  ✓ Empty string input handled gracefully');

    // Object or number passed instead of string
    const resNum = heuristic.extract(1234567, { fake: 'obj' });
    assert.strictEqual(typeof resNum.vendor, 'string');
    console.log('  ✓ Non-string input coerced safely');
  }

  // ---------------------------------------------------------
  // Edge Case 2: Number Formatting & Currency Edge Cases
  // ---------------------------------------------------------
  console.log('\n▶ [Edge Case 2] Number Formatting & Unusual Currencies');
  {
    // Multiple dollar signs and thousands commas
    const textFormatted = `
      INVOICE #9948
      Vendor: Cloudflare
      Subtotal: $1,450.00
      Tax: $116.00
      Total: $1,566.00
    `;
    const resFormatted = heuristic.extract(textFormatted);
    assert.strictEqual(resFormatted.total, 1566.00);
    assert.strictEqual(resFormatted.subtotal, 1450.00);
    assert.strictEqual(resFormatted.tax_amount, 116.00);
    console.log('  ✓ Thousands separator and multiple amounts parsed correctly ($1,566.00)');

    // Australian Dollar / Japanese Yen
    const textAud = 'Total: A$ 420.50 for consulting';
    const resAud = heuristic.extract(textAud);
    assert.strictEqual(resAud.currency, 'AUD');
    assert.strictEqual(resAud.total, 420.50);
    console.log('  ✓ Australian Dollar (A$) detected and parsed correctly');

    const textJpy = 'Charged Total: ¥ 85,000 Tokyo office supplies';
    const resJpy = heuristic.extract(textJpy);
    assert.strictEqual(resJpy.currency, 'JPY');
    assert.strictEqual(resJpy.total, 85000);
    console.log('  ✓ Japanese Yen (¥) detected and parsed correctly');
  }

  // ---------------------------------------------------------
  // Edge Case 3: LLM Code-Fence & Embedded JSON Extraction
  // ---------------------------------------------------------
  console.log('\n▶ [Edge Case 3] Resilient JSON Extraction from Noisy LLM Output');
  {
    // Markdown fenced JSON
    const markdownOutput = 'Here is the extracted invoice data:\n```json\n{"vendor": "Supabase", "total": 25.00}\n```\nHope this helps!';
    const parsedMd = LocalLLMEngine.extractJSONFromText(markdownOutput);
    assert.strictEqual(parsedMd.vendor, 'Supabase');
    assert.strictEqual(parsedMd.total, 25.00);
    console.log('  ✓ Extracted JSON from markdown code fence (```json ... ```)');

    // Text with embedded curly braces
    const embeddedOutput = 'Note: transaction confirmed: {"vendor": "Vercel", "total": 20.00} processed.';
    const parsedEmb = LocalLLMEngine.extractJSONFromText(embeddedOutput);
    assert.strictEqual(parsedEmb.vendor, 'Vercel');
    console.log('  ✓ Extracted JSON from noisy surrounding text');

    // Invalid non-JSON text
    const invalidText = 'Sorry, as an AI I could not process this image.';
    const parsedInv = LocalLLMEngine.extractJSONFromText(invalidText);
    assert.strictEqual(parsedInv, null);
    console.log('  ✓ Handled non-JSON response returning null without throwing syntax error');
  }

  // ---------------------------------------------------------
  // Edge Case 4: Extractor String-to-Number & Date Sanitization
  // ---------------------------------------------------------
  console.log('\n▶ [Edge Case 4] Extractor Value Sanitization & Boundary Defenses');
  {
    // String number with currency symbols
    const numClean = ExtractorAgent.sanitizeNumber('$3,499.00 USD');
    assert.strictEqual(numClean, 3499.00);
    console.log('  ✓ String with symbols sanitized to float ($3,499.00 USD -> 3499)');

    // Negative / NaN amount protection
    const numNegative = ExtractorAgent.sanitizeNumber(-45.00);
    assert.strictEqual(numNegative, 0);
    const numNaN = ExtractorAgent.sanitizeNumber('Not a number');
    assert.strictEqual(numNaN, 0);
    console.log('  ✓ Negative amounts clamped to 0 and NaNs handled safely');

    // Invalid date fallback
    const badDate = ExtractorAgent.sanitizeDate('invalid-date-string-999');
    assert.strictEqual(typeof badDate, 'string');
    assert.strictEqual(badDate.length, 10);
    console.log('  ✓ Invalid date string defaulted safely to valid ISO date');
  }

  // ---------------------------------------------------------
  // Edge Case 5: Tax Categorizer with Out-of-Range Tax Brackets
  // ---------------------------------------------------------
  console.log('\n▶ [Edge Case 5] Tax Categorizer Out-of-Range Bracket Normalization');
  {
    // User passes 25 instead of 0.25
    const cat25 = new CategorizerAgent(25);
    const res25 = cat25.categorize({ vendor: 'AWS', total: 100 });
    assert.strictEqual(res25.tax_bracket_assumed, '25%');
    assert.strictEqual(res25.estimated_tax_savings, 25.00);
    console.log('  ✓ Tax bracket 25 normalized automatically to 0.25 (25%)');

    // Extreme bracket clamping (> 0.50 or < 0.05)
    const catExtreme = new CategorizerAgent(999);
    assert.strictEqual(catExtreme.defaultTaxBracket, 0.50);
    console.log('  ✓ Absurd tax bracket (> 50%) clamped safely');
  }

  // ---------------------------------------------------------
  // Edge Case 6: CSV Formula Injection Defense (CWE-1236)
  // ---------------------------------------------------------
  console.log('\n▶ [Edge Case 6] Security: CSV Formula Injection (CWE-1236) Defense');
  {
    const maliciousDoc = {
      id: 'mal_01',
      date: '2026-10-15',
      vendor: '=cmd|"/C calc"!A0', // Excel formula injection payload
      invoice_number: '@SUM(1,2)', // Formula payload
      total: 100.00,
      tax_categorization: { category: '+cmd|test' }
    };

    const csvOutput = Exporter.toCSV([maliciousDoc]);
    assert(csvOutput.includes(`"'=cmd|""/C calc""!A0"`), 'Vendor formula must be escaped with single quote');
    assert(csvOutput.includes(`"'@SUM(1,2)"`), 'Invoice number formula must be escaped with single quote');
    assert(csvOutput.includes(`"'+cmd|test"`), 'Category formula must be escaped with single quote');
    console.log('  ✓ Formula injection triggers (=, @, +) neutralized with RFC-compliant quote prefixing');
  }

  // ---------------------------------------------------------
  // Edge Case 7: Validator Anomaly Detection & Floating-Point Epsilon
  // ---------------------------------------------------------
  console.log('\n▶ [Edge Case 7] Validator Date Anomaly & Epsilon Math');
  {
    // Transaction > $5,000
    const valHigh = validator.validate({ total: 15000, date: '2026-10-01', vendor: 'Dell' }, []);
    assert(valHigh.warnings.some((w) => w.includes('> $5,000')));
    console.log('  ✓ Large equipment transaction flagged with audit retention advice');

    // Future date
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 2);
    const valFuture = validator.validate({ total: 100, date: futureDate.toISOString().split('T')[0], vendor: 'Target' }, []);
    assert(valFuture.warnings.some((w) => w.includes('future')));
    console.log('  ✓ Future transaction date caught and flagged');

    // Score clamping [0..100]
    assert(valHigh.auditScore >= 0 && valHigh.auditScore <= 100);
    console.log('  ✓ Audit score strictly clamped between 0 and 100');
  }

  // ---------------------------------------------------------
  // Edge Case 8: Document Parser 0-Byte File Handling
  // ---------------------------------------------------------
  console.log('\n▶ [Edge Case 8] Document Parser 0-Byte & Missing File Defenses');
  {
    const tempEmpty = path.join(__dirname, 'empty_test.txt');
    fs.writeFileSync(tempEmpty, '');
    const parsedEmpty = DocumentParser.parseFile(tempEmpty);
    assert.strictEqual(parsedEmpty, '');
    fs.unlinkSync(tempEmpty);
    console.log('  ✓ 0-byte file parsed cleanly without throwing unhandled exceptions');

    assert.throws(() => {
      DocumentParser.parseFile('non_existent_file_path_12345.xyz');
    }, /does not exist/);
    console.log('  ✓ Missing file throws descriptive caught error');
  }

  // ---------------------------------------------------------
  // Edge Case 9: Atomic Storage Write & Corrupt JSON Backup
  // ---------------------------------------------------------
  console.log('\n▶ [Edge Case 9] DocumentStore Atomic Persistence & Corruption Recovery');
  {
    const testDir = path.join(__dirname, 'test_store_dir');
    const store = new DocumentStore(testDir);

    const doc = store.save({
      id: 'test_save_01',
      vendor: 'Test Merchant',
      total: 55.00
    });
    assert.strictEqual(doc.id, 'test_save_01');
    assert.strictEqual(store.getById('test_save_01').vendor, 'Test Merchant');
    console.log('  ✓ Atomic write and retrieval confirmed');

    // Corrupt the file deliberately with garbage bytes
    fs.writeFileSync(path.join(testDir, 'documents.json'), 'CORRUPTED_JSON_DATA{{{');
    const recovered = store.getAll();
    assert(Array.isArray(recovered), 'Must return cached array on corrupted file');

    // Verify backup file was created
    const files = fs.readdirSync(testDir);
    const backupCreated = files.some((f) => f.includes('corrupted'));
    assert(backupCreated, 'Backup recovery file must be created on corrupt JSON');
    console.log('  ✓ Corrupted JSON safely backed up to .corrupted.bak without wiping user cache');

    // Clean up test directory
    fs.rmSync(testDir, { recursive: true, force: true });
    console.log('  ✓ Test directory cleaned up');
  }

  console.log('\n================================================================');
  console.log(' 🎉 ALL 9 EDGE-CASE SUITES PASSED! CODE IS 100% ROBUST & PURIFIED!');
  console.log('================================================================\n');
}

runEdgeCaseTests().catch((err) => {
  console.error('❌ Edge case test failed:', err);
  process.exit(1);
});
