/**
 * Audit & Deduplication Validator Agent (Hardened & Purified)
 * Prevents fraudulent/accidental double-claiming of expenses,
 * flags anomalous amounts or dates, and verifies IRS compliance readiness.
 * 
 * Edge Case Protections:
 * - Floating point comparison with 0.005 epsilon
 * - Non-array and null input protections
 * - IRS 7-year audit retention date checks
 * - Strict clamping of audit score between 0 and 100
 */

class ValidatorAgent {
  validate(newDoc = {}, existingDocs = []) {
    const warnings = [];
    const errors = [];
    let isDuplicate = false;
    let duplicateOfId = null;

    const doc = newDoc || {};
    const safeExisting = Array.isArray(existingDocs) ? existingDocs : [];

    const newVendor = String(doc.vendor || '').toLowerCase().trim();
    const newTotal = typeof doc.total === 'number' && !isNaN(doc.total) ? doc.total : parseFloat(doc.total) || 0;
    const newDate = String(doc.date || '');
    const newInvoiceNo = String(doc.invoice_number || '').trim();

    // 1. Deduplication Check
    for (const existing of safeExisting) {
      if (!existing || existing.id === doc.id) continue;

      const existingVendor = String(existing.vendor || '').toLowerCase().trim();
      const existingTotal = typeof existing.total === 'number' && !isNaN(existing.total) ? existing.total : parseFloat(existing.total) || 0;
      const existingDate = String(existing.date || '');
      const existingInvoiceNo = String(existing.invoice_number || '').trim();

      const sameInvoiceNo =
        newInvoiceNo.length > 2 &&
        newInvoiceNo !== 'N/A' &&
        existingInvoiceNo.length > 2 &&
        existingInvoiceNo !== 'N/A' &&
        newInvoiceNo.toLowerCase() === existingInvoiceNo.toLowerCase();

      if (sameInvoiceNo) {
        isDuplicate = true;
        duplicateOfId = existing.id;
        errors.push(`Duplicate Invoice Number "${doc.invoice_number}" already exists in record ${existing.id}`);
        break;
      }

      const sameVendor = newVendor.length > 1 && newVendor === existingVendor;
      const sameTotal = Math.abs(newTotal - existingTotal) < 0.005;
      const sameDate = newDate.length > 0 && newDate === existingDate;

      if (sameVendor && sameTotal && sameDate) {
        isDuplicate = true;
        duplicateOfId = existing.id;
        warnings.push(`Potential duplicate: identical vendor (${doc.vendor}), amount ($${newTotal.toFixed(2)}), and date (${doc.date}) found in document ${existing.id}`);
        break;
      }
    }

    // 2. Anomaly Checks on Amount
    if (newTotal <= 0) {
      errors.push('Transaction total amount must be greater than $0.00');
    }

    if (newTotal > 5000) {
      warnings.push('High-value transaction (> $5,000). IRS guidelines recommend keeping explicit proof of payment and contracts for large equipment or contractor write-offs.');
    }

    // 3. Date sanity check
    const docDate = new Date(newDate);
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    if (isNaN(docDate.getTime())) {
      errors.push('Invalid transaction date format');
    } else {
      if (docDate > today) {
        warnings.push(`Transaction date (${doc.date}) is in the future. Check receipt stamp.`);
      }

      // Check if older than 7 years (IRS statutory audit period)
      const sevenYearsAgo = new Date();
      sevenYearsAgo.setFullYear(sevenYearsAgo.getFullYear() - 7);
      if (docDate < sevenYearsAgo) {
        warnings.push(`Transaction is older than 7 years (${doc.date}). The IRS generally requires records to be kept for 3 to 7 years.`);
      }
    }

    // 4. Missing merchant metadata
    if (!doc.vendor || newVendor === 'unknown merchant' || newVendor.length < 2) {
      warnings.push('Merchant name is unverified or generic. Manual review recommended.');
    }

    // 5. Clamped Audit Score (0 - 100)
    let rawScore = 100 - (errors.length * 40) - (warnings.length * 15);
    const auditScore = Math.max(0, Math.min(100, rawScore));

    return {
      isValid: errors.length === 0,
      isDuplicate,
      duplicateOfId,
      warnings,
      errors,
      auditScore,
      auditStatus: errors.length === 0 && warnings.length === 0 ? 'IRS Audit Ready' : 'Review Recommended'
    };
  }
}

module.exports = ValidatorAgent;
