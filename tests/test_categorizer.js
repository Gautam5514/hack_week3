/**
 * Test Suite: Tax Categorization & Deduction Engine
 * Verifies IRS Schedule C mapping and tax deduction calculations.
 */

const assert = require('assert');
const CategorizerAgent = require('../src/agents/categorizer');

async function runTests() {
  console.log('🧪 Running Test Suite: Tax Categorizer Agent...');
  const categorizer = new CategorizerAgent(0.25); // 25% freelance tax bracket

  // Test 1: AWS Expense -> Software & SaaS Subscriptions (100% deductible)
  {
    const sample = {
      vendor: 'AWS',
      total: 400.00,
      payment_method: 'Credit Card',
      line_items: [{ description: 'EC2 Cloud Compute and S3 Storage' }]
    };
    const result = categorizer.categorize(sample);
    assert.strictEqual(result.category, 'Software & SaaS Subscriptions');
    assert.strictEqual(result.deductible_percentage, 100);
    assert.strictEqual(result.deductible_amount, 400.00);
    assert.strictEqual(result.estimated_tax_savings, 100.00); // 25% of $400
    console.log('  ✓ Test 1 Passed: AWS mapped to Software & SaaS (100% write-off = $100 tax saved)');
  }

  // Test 2: Starbucks Meeting -> Meals & Entertainment (50% statutory deduction)
  {
    const sample = {
      vendor: 'Starbucks',
      total: 50.00,
      payment_method: 'Apple Pay',
      line_items: [{ description: 'Coffee and breakfast client meeting' }]
    };
    const result = categorizer.categorize(sample);
    assert.strictEqual(result.category, 'Meals & Client Entertainment');
    assert.strictEqual(result.deductible_percentage, 50);
    assert.strictEqual(result.deductible_amount, 25.00); // 50% limit
    assert.strictEqual(result.estimated_tax_savings, 6.25); // 25% of $25
    console.log('  ✓ Test 2 Passed: Starbucks correctly capped at 50% statutory meal deduction ($6.25 saved)');
  }

  // Test 3: Apple MacBook -> Equipment & Hardware (Section 179)
  {
    const sample = {
      vendor: 'Apple Store',
      total: 3500.00,
      payment_method: 'Amex',
      line_items: [{ description: '16-inch MacBook Pro M4 Max workstation' }]
    };
    const result = categorizer.categorize(sample);
    assert.strictEqual(result.category, 'Equipment & Hardware');
    assert.strictEqual(result.deductible_percentage, 100);
    assert.strictEqual(result.deductible_amount, 3500.00);
    assert.strictEqual(result.estimated_tax_savings, 875.00); // 25% of $3500
    console.log('  ✓ Test 3 Passed: Apple workstation mapped to Section 179 Equipment ($875 tax saved)');
  }

  // Test 4: Coworking Desk -> Office Supplies & Rent
  {
    const sample = {
      vendor: 'WeWork',
      total: 600.00,
      payment_method: 'ACH Transfer',
      line_items: [{ description: 'Dedicated desk coworking membership' }]
    };
    const result = categorizer.categorize(sample);
    assert.strictEqual(result.category, 'Office Supplies & Rent');
    assert.strictEqual(result.deductible_amount, 600.00);
    assert.strictEqual(result.estimated_tax_savings, 150.00);
    console.log('  ✓ Test 4 Passed: WeWork rent mapped to Schedule C Line 20b ($150 tax saved)');
  }

  console.log('🎉 All Tax Categorizer tests passed successfully!\n');
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
