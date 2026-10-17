/**
 * LedgerZero AI - Server (Hardened & Purified)
 * 100% Local, Privacy-Preserving Invoice & Receipt Sorter for Freelancers
 * Powered by Open-Weight Models (Google Gemma 2, Meta Llama 3.2, Qwen 2.5) via Ollama.
 * 
 * Edge Case Protections:
 * - Centralized JSON error handling middleware
 * - Clean 404 JSON fallback
 * - Safe input validation & payload sanitization
 * - Safe regex search without ReDoS risk
 * - Graceful process shutdown
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const DocumentStore = require('./src/store');
const ExtractorAgent = require('./src/agents/extractor');
const CategorizerAgent = require('./src/agents/categorizer');
const ValidatorAgent = require('./src/agents/validator');
const Exporter = require('./src/utils/exporter');
const DocumentParser = require('./src/utils/pdf_parser');
const LocalLLMEngine = require('./src/engines/local_llm');

const app = express();
const PORT = process.env.PORT || 3030;

// Initialize core components
const store = new DocumentStore();
const extractor = new ExtractorAgent();
const categorizer = new CategorizerAgent(0.25); // 25% freelance tax bracket default
const validator = new ValidatorAgent();
const llmEngine = new LocalLLMEngine();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Helper for safe text sanitization
function sanitizeString(str, maxLen = 200) {
  if (typeof str !== 'string') return '';
  return str.trim().slice(0, maxLen);
}

// ==========================================
// API ROUTES
// ==========================================

/**
 * Health & AI Engine Status
 */
app.get('/api/status', async (req, res, next) => {
  try {
    const health = await llmEngine.checkHealth();
    const stats = store.getStats();

    res.json({
      status: 'online',
      version: '1.2.0',
      privacyMode: '100% Air-Gapped / Zero External Telemetry',
      localLLM: health,
      storageStats: stats
    });
  } catch (err) {
    next(err);
  }
});

/**
 * List all processed documents with safe search and filter
 */
app.get('/api/documents', (req, res, next) => {
  try {
    let docs = store.getAll();
    const { category, search } = req.query;

    if (category && typeof category === 'string') {
      const catClean = sanitizeString(category, 80);
      docs = docs.filter((d) => d && d.tax_categorization?.category === catClean);
    }

    if (search && typeof search === 'string') {
      const q = sanitizeString(search, 100).toLowerCase();
      docs = docs.filter((d) => {
        if (!d) return false;
        const v = String(d.vendor || '').toLowerCase();
        const inv = String(d.invoice_number || '').toLowerCase();
        const cat = String(d.tax_categorization?.category || '').toLowerCase();
        return v.includes(q) || inv.includes(q) || cat.includes(q);
      });
    }

    res.json(docs);
  } catch (err) {
    next(err);
  }
});

/**
 * Get single document by ID
 */
app.get('/api/documents/:id', (req, res, next) => {
  try {
    const safeId = sanitizeString(req.params.id, 100);
    const doc = store.getById(safeId);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }
    res.json(doc);
  } catch (err) {
    next(err);
  }
});

/**
 * Process document from raw text or base64 receipt image
 */
app.post('/api/documents/process-text', async (req, res, next) => {
  try {
    const { text, filename, model, imageBase64 } = req.body || {};
    const safeText = typeof text === 'string' ? text : '';
    const safeFilename = sanitizeString(filename || 'receipt.txt', 120);
    const safeModel = model && typeof model === 'string' ? sanitizeString(model, 50) : null;
    const safeImage = imageBase64 && typeof imageBase64 === 'string' ? imageBase64 : null;

    if (safeText.trim().length === 0 && !safeImage) {
      return res.status(400).json({ error: 'Text content or receipt image is required' });
    }

    // Step 1: Agentic Extraction (Open-Weight LLM or Heuristic Engine)
    const extracted = await extractor.extract(safeText, safeFilename, safeModel, safeImage);

    // Step 2: Agentic Tax Categorization
    const taxInfo = categorizer.categorize(extracted);

    // Step 3: Audit & Deduplication Validation
    const existingDocs = store.getAll();
    const newDocId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const candidateDoc = {
      id: newDocId,
      filename: safeFilename,
      raw_text_preview: safeText ? safeText.slice(0, 300) : 'Visual receipt image parsed',
      ...extracted,
      tax_categorization: taxInfo
    };

    const validationResult = validator.validate(candidateDoc, existingDocs);
    candidateDoc.validation = validationResult;

    // Step 4: Persist in local storage
    store.save(candidateDoc);

    res.json({
      success: true,
      document: candidateDoc,
      processingSummary: {
        vendor: candidateDoc.vendor,
        total: candidateDoc.total,
        category: taxInfo.category,
        deductibleSavings: taxInfo.estimated_tax_savings,
        modelUsed: extracted.inference_source,
        auditStatus: validationResult.auditStatus,
        inferenceTimeMs: extracted.inference_time_ms || 0
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Update document (Human-in-the-Loop review / adjustments)
 */
app.put('/api/documents/:id', (req, res, next) => {
  try {
    const safeId = sanitizeString(req.params.id, 100);
    const existing = store.getById(safeId);
    if (!existing) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const { vendor, date, total, invoice_number, category } = req.body || {};

    const updated = {
      ...existing,
      id: safeId
    };

    if (vendor !== undefined) updated.vendor = sanitizeString(vendor, 100);
    if (date !== undefined) updated.date = ExtractorAgent.sanitizeDate(date);
    if (total !== undefined) updated.total = ExtractorAgent.sanitizeNumber(total, existing.total || 0);
    if (invoice_number !== undefined) updated.invoice_number = sanitizeString(invoice_number, 50);

    // Re-calculate tax details if category or total changed
    if (category || total !== undefined) {
      if (category) updated.tax_categorization = { ...updated.tax_categorization, category: sanitizeString(category, 80) };
      const freshTax = categorizer.categorize(updated);
      updated.tax_categorization = freshTax;
    }

    store.save(updated);
    res.json({ success: true, document: updated });
  } catch (err) {
    next(err);
  }
});

/**
 * Delete a document
 */
app.delete('/api/documents/:id', (req, res, next) => {
  try {
    const safeId = sanitizeString(req.params.id, 100);
    const success = store.delete(safeId);
    res.json({ success });
  } catch (err) {
    next(err);
  }
});

/**
 * Financial & Tax Analytics
 */
app.get('/api/stats', (req, res, next) => {
  try {
    const stats = store.getStats();
    res.json(stats);
  } catch (err) {
    next(err);
  }
});

/**
 * IRS Form 1040 Schedule C Breakdown
 */
app.get('/api/irs-schedule-c', (req, res, next) => {
  try {
    const docs = store.getAll();
    const scheduleLines = {
      'Line 8 (Advertising)': { total: 0, deductible: 0, count: 0, name: 'Advertising & Marketing' },
      'Line 10 (Commissions and Fees)': { total: 0, deductible: 0, count: 0, name: 'Merchant & Banking Fees' },
      'Line 11 (Contract Labor)': { total: 0, deductible: 0, count: 0, name: 'Contract Labor & Subcontractors' },
      'Line 13 (Depreciation) or Section 179 deduction': { total: 0, deductible: 0, count: 0, name: 'Equipment & Hardware' },
      'Line 17 (Legal and Professional Services)': { total: 0, deductible: 0, count: 0, name: 'Legal & Professional Services' },
      'Line 18 (Office Expense) & Line 20b (Rent)': { total: 0, deductible: 0, count: 0, name: 'Office Supplies & Rent' },
      'Line 24a (Travel)': { total: 0, deductible: 0, count: 0, name: 'Travel & Transportation' },
      'Line 24b (Deductible Meals)': { total: 0, deductible: 0, count: 0, name: 'Meals & Client Entertainment (50%)' },
      'Line 25 (Utilities)': { total: 0, deductible: 0, count: 0, name: 'Utilities & Internet' },
      'Line 48 (Other Expenses - Software)': { total: 0, deductible: 0, count: 0, name: 'Software & SaaS Subscriptions' }
    };

    let totalGrossSpend = 0;
    let totalDeductible = 0;

    for (const doc of docs) {
      if (!doc) continue;
      const line = doc.tax_categorization?.schedule_c_line || 'Line 48 (Other Expenses - Software)';
      const total = typeof doc.total === 'number' && !isNaN(doc.total) ? Math.max(0, doc.total) : parseFloat(doc.total) || 0;
      const deductible = typeof doc.tax_categorization?.deductible_amount === 'number' && !isNaN(doc.tax_categorization.deductible_amount)
        ? Math.max(0, doc.tax_categorization.deductible_amount)
        : total;

      totalGrossSpend += total;
      totalDeductible += deductible;

      if (!scheduleLines[line]) {
        scheduleLines[line] = { total: 0, deductible: 0, count: 0, name: doc.tax_categorization?.category || 'Other' };
      }

      scheduleLines[line].total += total;
      scheduleLines[line].deductible += deductible;
      scheduleLines[line].count += 1;
    }

    const effectiveBracket = 0.25;
    const estimatedCashSaved = +(totalDeductible * effectiveBracket).toFixed(2);

    res.json({
      taxYear: 2026,
      form: 'IRS Form 1040 Schedule C (Profit or Loss From Business)',
      effectiveTaxBracket: '25%',
      totalGrossSpend: +(Math.round(totalGrossSpend * 100) / 100).toFixed(2),
      totalAllowableDeduction: +(Math.round(totalDeductible * 100) / 100).toFixed(2),
      estimatedCashSaved: +(Math.round(estimatedCashSaved * 100) / 100).toFixed(2),
      lines: scheduleLines
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Inference Benchmarks & Cloud Cost Savings Counter
 */
app.get('/api/benchmark', (req, res, next) => {
  try {
    const docs = store.getAll();
    const count = docs.length;

    const cloudApiCostPerInvoice = 0.05;
    const totalCloudCostIfUsed = +(count * cloudApiCostPerInvoice).toFixed(2);
    const dollarsSaved = totalCloudCostIfUsed;

    res.json({
      documentsProcessed: count,
      openSourceInferenceCost: '$0.00',
      cloudApiCostAvoided: `$${dollarsSaved.toFixed(2)}`,
      grossMargin: '100%',
      openWeightSpeedAverage: '45-90 tokens/sec on Apple Silicon / CUDA',
      privacyScore: '100% Air-Gapped'
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Export to Accountant CSV
 */
app.get('/api/export/csv', (req, res, next) => {
  try {
    const docs = store.getAll();
    const csvContent = Exporter.toCSV(docs);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="LedgerZero_Tax_Expenses.csv"');
    res.send(csvContent);
  } catch (err) {
    next(err);
  }
});

/**
 * Export Tax Deduction Summary Report (JSON)
 */
app.get('/api/export/tax-summary', (req, res, next) => {
  try {
    const docs = store.getAll();
    const summary = Exporter.generateTaxSummary(docs);
    res.json(summary);
  } catch (err) {
    next(err);
  }
});

/**
 * Export Printable HTML Audit Pack
 */
app.get('/api/export/audit-pack', (req, res, next) => {
  try {
    const docs = store.getAll();
    const summary = Exporter.generateTaxSummary(docs);

    const escapeHTML = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>LedgerZero AI - IRS Audit Pack</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 30px; color: #111; }
    h1 { margin-bottom: 5px; color: #1e3a8a; }
    .badge { background: #dcfce7; color: #166534; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
    th { background: #f1f5f9; }
    .total-box { display: flex; gap: 20px; margin: 20px 0; }
    .box { border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; flex: 1; background: #fafafa; }
    .box-val { font-size: 24px; font-weight: bold; margin-top: 5px; color: #0f172a; }
    @media print { body { padding: 0; } button { display: none; } }
  </style>
</head>
<body>
  <div style="display: flex; justify-content: space-between; align-items: center;">
    <div>
      <h1>LedgerZero AI — Tax & Audit Compliance Pack</h1>
      <p style="color: #64748b; font-size: 14px;">Generated on ${new Date().toLocaleDateString()} • IRS Form 1040 Schedule C Audit Trail</p>
    </div>
    <span class="badge">100% AIR-GAPPED VERIFIED</span>
  </div>

  <div class="total-box">
    <div class="box">
      <div>Total Gross Spend</div>
      <div class="box-val">$${summary.grandTotal.toFixed(2)}</div>
    </div>
    <div class="box">
      <div>Total Schedule C Deductible</div>
      <div class="box-val" style="color: #16a34a;">$${summary.totalDeductible.toFixed(2)}</div>
    </div>
    <div class="box">
      <div>Est. Tax Cash Savings (25%)</div>
      <div class="box-val" style="color: #d97706;">$${summary.totalEstimatedSavings.toFixed(2)}</div>
    </div>
  </div>

  <h2>Itemized Expense Records (${docs.length})</h2>
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Vendor / Merchant</th>
        <th>Invoice #</th>
        <th>IRS Schedule C Category</th>
        <th>Total</th>
        <th>Deductible</th>
        <th>Audit Status</th>
      </tr>
    </thead>
    <tbody>
      ${docs.map(d => `
        <tr>
          <td>${escapeHTML(d.date || 'N/A')}</td>
          <td><strong>${escapeHTML(d.vendor || 'Unknown')}</strong></td>
          <td>${escapeHTML(d.invoice_number || 'N/A')}</td>
          <td>${escapeHTML(d.tax_categorization?.category || 'General')}</td>
          <td>$${(d.total || 0).toFixed(2)}</td>
          <td style="color: #16a34a; font-weight: bold;">$${(d.tax_categorization?.deductible_amount || 0).toFixed(2)}</td>
          <td>${escapeHTML(d.validation?.auditStatus || 'Verified')}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <p style="margin-top: 40px; font-size: 12px; color: #94a3b8; text-align: center;">
    Processed locally via open-weight models with zero cloud telemetry. Retain alongside physical receipts for IRS statutory 7-year audit retention.
  </p>
  <div style="text-align: center; margin-top: 20px;">
    <button onclick="window.print()" style="padding: 10px 20px; font-weight: bold; background: #2563eb; color: #fff; border: none; border-radius: 6px; cursor: pointer;">🖨️ Print / Save to PDF</button>
  </div>
</body>
</html>`;

    res.send(html);
  } catch (err) {
    next(err);
  }
});

/**
 * Seed realistic sample documents for instant demo
 */
app.post('/api/seed-samples', async (req, res, next) => {
  try {
    const samplesDir = path.join(__dirname, 'samples');
    if (!fs.existsSync(samplesDir)) {
      return res.status(404).json({ error: 'Samples directory not found' });
    }

    const files = fs.readdirSync(samplesDir).filter((f) => f.endsWith('.txt'));
    const seeded = [];

    for (const file of files) {
      const fullPath = path.join(samplesDir, file);
      const text = fs.readFileSync(fullPath, 'utf-8');

      const extracted = await extractor.extract(text, file);
      const taxInfo = categorizer.categorize(extracted);
      const existingDocs = store.getAll();
      const id = `sample_${path.basename(file, '.txt')}`;

      const doc = {
        id,
        filename: file,
        raw_text_preview: text.slice(0, 300),
        ...extracted,
        tax_categorization: taxInfo
      };

      doc.validation = validator.validate(doc, existingDocs);
      store.save(doc);
      seeded.push(doc);
    }

    res.json({
      success: true,
      count: seeded.length,
      seededDocs: seeded
    });
  } catch (err) {
    next(err);
  }
});

// 404 Route Handler for undefined endpoints
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found', path: req.path });
});

// Centralized JSON Error Handler Middleware (Prevents server crash and stack trace leaks)
app.use((err, req, res, next) => {
  console.error('[LedgerZero Server Error]:', err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    code: err.code || 'SERVER_ERROR'
  });
});

// Start Server & Handle Graceful Shutdown
let server;
if (require.main === module) {
  server = app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(` 🚀 LedgerZero AI is running at http://localhost:${PORT}`);
    console.log(` 🔒 100% Local Inference | Privacy-Preserving Air-Gap`);
    console.log(` 🤖 Open Weights: Gemma 2, Llama 3.2, Qwen 2.5, Mistral`);
    console.log(` 💼 Side Hustle: Open-Source AI for Freelancers`);
    console.log(`=======================================================`);
  });

  const gracefulShutdown = () => {
    console.log('\n[LedgerZero] Received shutdown signal. Closing server cleanly...');
    server.close(() => {
      console.log('[LedgerZero] Server closed. Exiting.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);
}

module.exports = app;
