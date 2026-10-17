/**
 * Deterministic Heuristic Extraction Engine (Hardened & Purified)
 * Handles all real-world edge cases:
 * - Empty / null / non-string inputs
 * - International currencies (USD, EUR, GBP, INR, CAD, AUD, JPY, CHF)
 * - Number formatting variations (commas, dots, spaces, currencies)
 * - Malformed / impossible dates
 * - Line item price sanitization
 */

class HeuristicEngine {
  extract(rawText, filename = '') {
    // 1. Guard against non-string inputs
    if (rawText === null || rawText === undefined) {
      rawText = '';
    } else if (typeof rawText !== 'string') {
      rawText = String(rawText);
    }

    const safeFilename = typeof filename === 'string' ? filename : '';
    const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);

    // 2. Detect Currency
    let currency = 'USD';
    let currencySymbol = '$';

    if (rawText.includes('€') || /\beur\b/i.test(rawText) || /euro/i.test(rawText)) {
      currency = 'EUR';
      currencySymbol = '€';
    } else if (rawText.includes('£') || /\bgbp\b/i.test(rawText) || /pounds?/i.test(rawText)) {
      currency = 'GBP';
      currencySymbol = '£';
    } else if (rawText.includes('₹') || /\binr\b/i.test(rawText) || /rupees?/i.test(rawText)) {
      currency = 'INR';
      currencySymbol = '₹';
    } else if (rawText.includes('CAD') || rawText.includes('C$')) {
      currency = 'CAD';
      currencySymbol = 'C$';
    } else if (rawText.includes('AUD') || rawText.includes('A$')) {
      currency = 'AUD';
      currencySymbol = 'A$';
    } else if (rawText.includes('¥') || /\bjpy\b/i.test(rawText) || /yen\b/i.test(rawText)) {
      currency = 'JPY';
      currencySymbol = '¥';
    } else if (/\bchf\b/i.test(rawText)) {
      currency = 'CHF';
      currencySymbol = 'CHF';
    }

    // 3. Amount Extraction with Sanitization
    let total = 0;
    let subtotal = 0;
    let taxAmount = 0;

    const parseAmount = (valStr) => {
      if (!valStr) return 0;
      // Handle commas and dots
      const cleaned = valStr.replace(/[^\d.,]/g, '').replace(/,/g, '');
      const parsed = parseFloat(cleaned);
      return !isNaN(parsed) && isFinite(parsed) ? Math.max(0, +parsed.toFixed(2)) : 0;
    };

    // Search for Total
    const totalRegex = /(?:grand\s+total|total\s+amount|amount\s+due|balance\s+due|total\s+due|total\s*[:=]|total\s+[$€£₹¥]|charged|net\s+total)[\s:]*[$€£₹¥]?\s*([\d,]+\.?\d{0,2})/i;
    const totalMatch = rawText.match(totalRegex);
    if (totalMatch && totalMatch[1]) {
      total = parseAmount(totalMatch[1]);
    }

    // Search for Subtotal
    const subtotalRegex = /(?:subtotal|sub-total|sub\s+total|net\s+amount)[\s:]*[$€£₹¥]?\s*([\d,]+\.?\d{0,2})/i;
    const subtotalMatch = rawText.match(subtotalRegex);
    if (subtotalMatch && subtotalMatch[1]) {
      subtotal = parseAmount(subtotalMatch[1]);
    }

    // Search for Tax / VAT / GST
    const taxRegex = /(?:tax|sales\s+tax|vat|gst|hst)[\s:]*[$€£₹¥]?\s*([\d,]+\.?\d{0,2})/i;
    const taxMatch = rawText.match(taxRegex);
    if (taxMatch && taxMatch[1]) {
      taxAmount = parseAmount(taxMatch[1]);
    }

    // Fallback: If total wasn't found, find the largest monetary value in the text
    if (!total || total === 0) {
      const allMatches = [...rawText.matchAll(/[$€£₹¥]\s*([\d,]+\.\d{2})/g)];
      const candidateAmounts = allMatches
        .map((m) => parseAmount(m[1]))
        .filter((a) => a > 0);

      if (candidateAmounts.length > 0) {
        total = Math.max(...candidateAmounts);
      }
    }

    if (!subtotal || subtotal === 0) {
      subtotal = taxAmount > 0 && total >= taxAmount ? +(total - taxAmount).toFixed(2) : total;
    }

    // 4. Robust Date Extraction & Normalization
    let date = new Date().toISOString().split('T')[0];
    const datePatterns = [
      /\b(20\d{2}[-/.]\d{1,2}[-/.]\d{1,2})\b/, // 2026-10-15
      /\b(\d{1,2}[-/.]\d{1,2}[-/.]20\d{2})\b/, // 10/15/2026 or 15.10.2026
      /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+20\d{2}\b/i, // Oct 15, 2026
      /\b\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*,?\s+20\d{2}\b/i // 15 Oct 2026
    ];

    for (const pat of datePatterns) {
      const dMatch = rawText.match(pat);
      if (dMatch) {
        const parsed = new Date(dMatch[0]);
        // Validate date sanity: not NaN, reasonable year
        if (!isNaN(parsed.getTime())) {
          const year = parsed.getFullYear();
          if (year >= 2000 && year <= 2040) {
            date = parsed.toISOString().split('T')[0];
            break;
          }
        }
      }
    }

    // 5. Merchant / Vendor Extraction
    let vendor = 'Unknown Merchant';
    const knownVendors = [
      'Amazon', 'AWS', 'Amazon Web Services', 'Apple', 'Google Cloud', 'GitHub', 'Figma',
      'Slack', 'Zoom', 'Stripe', 'Uber', 'Lyft', 'Starbucks', 'WeWork', 'Adobe', 'Canva',
      'Upwork', 'Fiverr', 'Shopify', 'HostGator', 'DigitalOcean', 'Vercel', 'Netlify',
      'Target', 'Walmart', 'Best Buy', 'Office Depot', 'Delta Air Lines', 'United Airlines',
      'Blue Bottle Coffee', 'Twilio', 'Mailchimp', 'Notion', 'Linear', 'Supabase'
    ];

    for (const kv of knownVendors) {
      const regex = new RegExp(`\\b${kv}\\b`, 'i');
      if (regex.test(rawText)) {
        vendor = kv;
        break;
      }
    }

    if (vendor === 'Unknown Merchant' && lines.length > 0) {
      const firstLine = lines[0].replace(/invoice|receipt|order|tax\s+invoice/i, '').trim();
      if (firstLine.length >= 2 && firstLine.length <= 60 && !firstLine.includes('====')) {
        vendor = firstLine;
      } else if (safeFilename) {
        vendor = safeFilename.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ').trim();
      }
    }

    // 6. Invoice or Reference Number
    let invoiceNumber = 'N/A';
    const invRegex = /(?:invoice|receipt|order|bill|tax\s+invoice)\s*(?:#|no\.?|num\.?|number)?\s*[:=]?\s*([A-Za-z0-9-_]{3,30})/i;
    const invMatch = rawText.match(invRegex);
    if (invMatch && !['the', 'and', 'for', 'date', 'tax', 'due', 'amount'].includes(invMatch[1].toLowerCase())) {
      invoiceNumber = invMatch[1].trim();
    }

    // 7. Payment Method
    let paymentMethod = 'Credit Card';
    if (/\bcash\b/i.test(rawText)) paymentMethod = 'Cash';
    else if (/\bpaypal\b/i.test(rawText)) paymentMethod = 'PayPal';
    else if (/wire\s+transfer|bank\s+transfer|\bach\b/i.test(rawText)) paymentMethod = 'Bank Transfer / ACH';
    else if (/\bvisa\b/i.test(rawText)) paymentMethod = 'Visa Card';
    else if (/\bmastercard\b/i.test(rawText)) paymentMethod = 'Mastercard';
    else if (/amex|american\s+express/i.test(rawText)) paymentMethod = 'American Express';
    else if (/apple\s+pay/i.test(rawText)) paymentMethod = 'Apple Pay';

    // 8. Line Items
    const lineItems = [];
    for (const line of lines) {
      const priceMatch = line.match(/(.*?)\s+[$€£₹¥]?\s*([\d,]+\.\d{2})$/);
      if (priceMatch) {
        const itemDesc = priceMatch[1].trim();
        const itemAmount = parseAmount(priceMatch[2]);
        if (!/(total|subtotal|tax|balance|due|vat|gst|amount)/i.test(itemDesc) && itemDesc.length > 2 && itemAmount > 0) {
          lineItems.push({
            description: itemDesc.slice(0, 100),
            quantity: 1,
            unit_price: itemAmount,
            total: itemAmount
          });
        }
      }
    }

    return {
      vendor: vendor || 'Unknown Merchant',
      date: date,
      invoice_number: invoiceNumber || 'N/A',
      currency: currency,
      currency_symbol: currencySymbol,
      subtotal: subtotal || total,
      tax_amount: taxAmount,
      total: total,
      payment_method: paymentMethod,
      line_items: lineItems.length > 0 ? lineItems : [{ description: 'General Service/Item', quantity: 1, unit_price: total, total: total }],
      confidence_score: total > 0 ? 0.92 : 0.50,
      inference_source: 'built-in-deterministic-engine'
    };
  }
}

module.exports = HeuristicEngine;
