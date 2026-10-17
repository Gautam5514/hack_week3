/**
 * Tax & Accounting Export Utility (Hardened & Purified)
 * Generates CSV, JSON, and Schedule C Tax Deduction Summaries.
 * 
 * Edge Case Protections:
 * - CWE-1236 Defense: Neutralizes CSV formula injection (=, +, -, @, \t, \r)
 * - Safe null/undefined coercion
 * - RFC 4180 quotation and carriage return escaping
 * - Non-array input defense
 */

class Exporter {
  /**
   * Neutralize formula injection risk in spreadsheet processors (Excel, Sheets, Numbers)
   */
  static sanitizeForCSV(val) {
    if (val === null || val === undefined) return '';
    let str = String(val);

    // If starts with formula trigger characters, prepend a single quote
    const formulaTriggers = ['=', '+', '-', '@', '\t', '\r'];
    if (str.length > 0 && formulaTriggers.includes(str.charAt(0))) {
      str = "'" + str;
    }

    return str;
  }

  /**
   * Escape and quote a single CSV field following RFC 4180
   */
  static escapeCSVField(val) {
    const sanitized = Exporter.sanitizeForCSV(val);
    const escaped = sanitized.replace(/"/g, '""');
    return `"${escaped}"`;
  }

  /**
   * Convert list of processed expense documents to standard accountant CSV
   */
  static toCSV(documents = []) {
    const docs = Array.isArray(documents) ? documents : [];

    const headers = [
      'Document ID',
      'Date',
      'Vendor / Merchant',
      'Invoice / Receipt #',
      'Category (Schedule C)',
      'Schedule C Line',
      'Currency',
      'Total Amount',
      'Tax Amount',
      'Deductible %',
      'Deductible Amount',
      'Estimated Tax Savings (25%)',
      'Payment Method',
      'Audit Status',
      'AI Model Source'
    ];

    const rows = docs.map((doc) => {
      const d = doc || {};
      const tax = d.tax_categorization || {};
      const totalNum = typeof d.total === 'number' && !isNaN(d.total) ? d.total : parseFloat(d.total) || 0;
      const taxNum = typeof d.tax_amount === 'number' && !isNaN(d.tax_amount) ? d.tax_amount : parseFloat(d.tax_amount) || 0;
      const dedNum = typeof tax.deductible_amount === 'number' && !isNaN(tax.deductible_amount) ? tax.deductible_amount : totalNum;
      const savNum = typeof tax.estimated_tax_savings === 'number' && !isNaN(tax.estimated_tax_savings) ? tax.estimated_tax_savings : 0;

      return [
        Exporter.escapeCSVField(d.id || ''),
        Exporter.escapeCSVField(d.date || ''),
        Exporter.escapeCSVField(d.vendor || 'Unknown'),
        Exporter.escapeCSVField(d.invoice_number || 'N/A'),
        Exporter.escapeCSVField(tax.category || 'Uncategorized'),
        Exporter.escapeCSVField(tax.schedule_c_line || 'N/A'),
        Exporter.escapeCSVField(d.currency || 'USD'),
        Exporter.escapeCSVField(totalNum.toFixed(2)),
        Exporter.escapeCSVField(taxNum.toFixed(2)),
        Exporter.escapeCSVField(`${tax.deductible_percentage !== undefined ? tax.deductible_percentage : 100}%`),
        Exporter.escapeCSVField(dedNum.toFixed(2)),
        Exporter.escapeCSVField(savNum.toFixed(2)),
        Exporter.escapeCSVField(d.payment_method || 'Unknown'),
        Exporter.escapeCSVField(d.validation?.auditStatus || 'OK'),
        Exporter.escapeCSVField(d.inference_source || 'Local AI')
      ];
    });

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  }

  /**
   * Generate Schedule C Tax Summary Report
   */
  static generateTaxSummary(documents = []) {
    const docs = Array.isArray(documents) ? documents : [];
    const categoryTotals = {};
    let grandTotal = 0;
    let totalDeductible = 0;
    let totalEstimatedSavings = 0;

    for (const d of docs) {
      if (!d) continue;
      const cat = d.tax_categorization?.category || 'Uncategorized';
      const scheduleLine = d.tax_categorization?.schedule_c_line || 'Other Expenses';
      const total = typeof d.total === 'number' && !isNaN(d.total) ? Math.max(0, d.total) : parseFloat(d.total) || 0;
      const deductible = typeof d.tax_categorization?.deductible_amount === 'number' && !isNaN(d.tax_categorization.deductible_amount)
        ? Math.max(0, d.tax_categorization.deductible_amount)
        : total;
      const savings = typeof d.tax_categorization?.estimated_tax_savings === 'number' && !isNaN(d.tax_categorization.estimated_tax_savings)
        ? Math.max(0, d.tax_categorization.estimated_tax_savings)
        : 0;

      if (!categoryTotals[cat]) {
        categoryTotals[cat] = {
          count: 0,
          scheduleLine,
          totalSpent: 0,
          deductibleAmount: 0,
          estimatedSavings: 0
        };
      }

      categoryTotals[cat].count += 1;
      categoryTotals[cat].totalSpent += total;
      categoryTotals[cat].deductibleAmount += deductible;
      categoryTotals[cat].estimatedSavings += savings;

      grandTotal += total;
      totalDeductible += deductible;
      totalEstimatedSavings += savings;
    }

    return {
      generatedAt: new Date().toISOString(),
      documentCount: docs.length,
      grandTotal: +(Math.round(grandTotal * 100) / 100).toFixed(2),
      totalDeductible: +(Math.round(totalDeductible * 100) / 100).toFixed(2),
      totalEstimatedSavings: +(Math.round(totalEstimatedSavings * 100) / 100).toFixed(2),
      effectiveSavingsRate: grandTotal > 0 ? +((totalEstimatedSavings / grandTotal) * 100).toFixed(1) : 0,
      breakdown: Object.entries(categoryTotals).map(([name, data]) => ({
        category: name,
        scheduleLine: data.scheduleLine,
        count: data.count,
        totalSpent: +(Math.round(data.totalSpent * 100) / 100).toFixed(2),
        deductibleAmount: +(Math.round(data.deductibleAmount * 100) / 100).toFixed(2),
        estimatedSavings: +(Math.round(data.estimatedSavings * 100) / 100).toFixed(2)
      }))
    };
  }
}

module.exports = Exporter;
