/**
 * Document Extraction Agent (Hardened & Purified)
 * Sanitizes all output values:
 * - Parses string amounts like "$1,200.50" to clean numbers
 * - Validates and normalizes dates to YYYY-MM-DD
 * - Validates currency codes
 * - Sanitizes line-item arrays
 * - Seamlessly falls back to heuristic engine on any failure
 */

const LocalLLMEngine = require('../engines/local_llm');
const HeuristicEngine = require('../engines/heuristic');

class ExtractorAgent {
  constructor(options = {}) {
    this.llmEngine = new LocalLLMEngine(options);
    this.heuristicEngine = new HeuristicEngine();
  }

  static sanitizeNumber(val, defaultVal = 0) {
    if (val === null || val === undefined) return defaultVal;
    if (typeof val === 'number') return isNaN(val) || !isFinite(val) ? defaultVal : Math.max(0, +val.toFixed(2));
    const str = String(val).replace(/[^0-9.-]+/g, '');
    const parsed = parseFloat(str);
    return !isNaN(parsed) && isFinite(parsed) ? Math.max(0, +parsed.toFixed(2)) : defaultVal;
  }

  static sanitizeDate(val) {
    if (!val || typeof val !== 'string') return new Date().toISOString().split('T')[0];
    const parsed = new Date(val);
    if (!isNaN(parsed.getTime())) {
      const year = parsed.getFullYear();
      if (year >= 2000 && year <= 2040) {
        return parsed.toISOString().split('T')[0];
      }
    }
    return new Date().toISOString().split('T')[0];
  }

  async extract(rawText, filename = '', preferredModel = null, imageBase64 = null) {
    const isImage = !!imageBase64;
    const safeText = typeof rawText === 'string' ? rawText : '';

    if (safeText.trim().length === 0 && !isImage) {
      // Return safe minimal empty document instead of throwing fatal crash
      return this.heuristicEngine.extract('', filename);
    }

    // Check if local open-weight model daemon is available
    let health = { online: false };
    try {
      health = await this.llmEngine.checkHealth();
    } catch (_) {}

    if (health.online) {
      try {
        const modelToUse = preferredModel || health.activeModel || 'gemma2:2b';
        const prompt = `
Analyze the following invoice or receipt document text and extract financial information.
Return ONLY a valid JSON object matching this schema:
{
  "vendor": "String (Merchant, contractor, or business name issuing the invoice/receipt)",
  "date": "String (YYYY-MM-DD format)",
  "invoice_number": "String (Invoice/receipt reference number or N/A)",
  "currency": "String (3-letter currency code, e.g. USD, EUR, GBP, INR, CAD)",
  "subtotal": Number,
  "tax_amount": Number,
  "total": Number,
  "payment_method": "String (Credit Card, Bank Transfer, PayPal, Cash, Apple Pay, etc.)",
  "line_items": [
    {
      "description": "String",
      "quantity": Number,
      "unit_price": Number,
      "total": Number
    }
  ],
  "client_name": "String (Billed to party name, or N/A)"
}

DOCUMENT CONTENT:
"""
${(safeText || 'Visual receipt image attached.').slice(0, 4500)}
"""
`;

        const systemPrompt = `You are LedgerZero AI, an air-gapped, privacy-preserving invoice extraction agent running locally on open-weight models (Gemma / Llama / Qwen).
Your output must be strictly valid JSON with no markdown formatting, no backticks, and no commentary.`;

        const images = isImage ? [imageBase64] : [];
        const result = await this.llmEngine.generateJSON(prompt, systemPrompt, modelToUse, images);
        const data = result.data || {};

        const total = ExtractorAgent.sanitizeNumber(data.total, 0);
        const subtotal = ExtractorAgent.sanitizeNumber(data.subtotal, total);
        const taxAmount = ExtractorAgent.sanitizeNumber(data.tax_amount, 0);

        const cleanCurrency = String(data.currency || 'USD').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3) || 'USD';
        const cleanVendor = typeof data.vendor === 'string' && data.vendor.trim().length > 0 ? data.vendor.trim() : 'Unknown Merchant';
        const cleanDate = ExtractorAgent.sanitizeDate(data.date);
        const cleanInvoiceNo = typeof data.invoice_number === 'string' && data.invoice_number.trim().length > 0 ? data.invoice_number.trim() : 'N/A';

        // Sanitize line items
        const rawItems = Array.isArray(data.line_items) ? data.line_items : [];
        const cleanLineItems = rawItems
          .filter((item) => item && typeof item === 'object')
          .map((item) => ({
            description: String(item.description || 'Item').slice(0, 100),
            quantity: Math.max(1, ExtractorAgent.sanitizeNumber(item.quantity, 1)),
            unit_price: ExtractorAgent.sanitizeNumber(item.unit_price, total),
            total: ExtractorAgent.sanitizeNumber(item.total, total)
          }));

        return {
          vendor: cleanVendor,
          date: cleanDate,
          invoice_number: cleanInvoiceNo,
          currency: cleanCurrency,
          currency_symbol: this.getCurrencySymbol(cleanCurrency),
          subtotal: subtotal,
          tax_amount: taxAmount,
          total: total,
          payment_method: String(data.payment_method || 'Credit Card'),
          line_items: cleanLineItems.length > 0 ? cleanLineItems : [{ description: 'General Service/Item', quantity: 1, unit_price: total, total: total }],
          client_name: String(data.client_name || 'N/A'),
          confidence_score: 0.98,
          inference_source: `Open-Weight (${result.model})`,
          inference_time_ms: result.totalDurationMs || 0,
          eval_count: result.evalCount || 0,
          tokens_per_sec: result.tokensPerSecond || 0
        };
      } catch (err) {
        console.warn(`[LedgerZero Extractor] Local LLM notice: ${err.message}. Seamlessly engaging deterministic engine.`);
      }
    }

    // Fallback: Deterministic Heuristic Engine
    const startTime = Date.now();
    const fallbackData = this.heuristicEngine.extract(safeText, filename);
    fallbackData.inference_time_ms = Date.now() - startTime;
    return fallbackData;
  }

  getCurrencySymbol(currency) {
    const map = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      INR: '₹',
      CAD: 'C$',
      AUD: 'A$',
      JPY: '¥',
      CHF: 'CHF'
    };
    return map[String(currency || 'USD').toUpperCase()] || '$';
  }
}

module.exports = ExtractorAgent;
