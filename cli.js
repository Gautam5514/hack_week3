#!/usr/bin/env node

/**
 * LedgerZero AI - Command Line Interface
 * Run local invoice & receipt processing directly from the terminal
 * 
 * Usage:
 *   node cli.js process <file_or_dir> [--model <model_name>]
 *   node cli.js stats
 *   node cli.js export [--format csv|json] [--out <filepath>]
 *   node cli.js status
 */

const fs = require('fs');
const path = require('path');
const DocumentStore = require('./src/store');
const ExtractorAgent = require('./src/agents/extractor');
const CategorizerAgent = require('./src/agents/categorizer');
const ValidatorAgent = require('./src/agents/validator');
const Exporter = require('./src/utils/exporter');
const DocumentParser = require('./src/utils/pdf_parser');
const LocalLLMEngine = require('./src/engines/local_llm');

const store = new DocumentStore();
const extractor = new ExtractorAgent();
const categorizer = new CategorizerAgent(0.25);
const validator = new ValidatorAgent();
const llmEngine = new LocalLLMEngine();

const args = process.argv.slice(2);
const command = args[0] || 'help';

async function main() {
  switch (command) {
    case 'status': {
      console.log('\n⚡ LedgerZero AI System Status');
      console.log('----------------------------------------');
      const health = await llmEngine.checkHealth();
      console.log(`Local Inference Provider: ${health.provider || 'Local Heuristic Engine'}`);
      console.log(`Daemon Reachable:         ${health.online ? '✓ Yes (Ollama Online)' : '✗ Offline (Heuristic active)'}`);
      if (health.models) {
        console.log(`Installed Models:         ${health.models.join(', ')}`);
        console.log(`Active Model:             ${health.activeModel}`);
      }
      const stats = store.getStats();
      console.log(`Documents in Local Store: ${stats.totalDocuments}`);
      console.log('----------------------------------------\n');
      break;
    }

    case 'process': {
      const targetPath = args[1];
      if (!targetPath) {
        console.error('Error: Please specify a file or directory to process.');
        console.log('Example: node cli.js process ./samples/receipt_aws_cloud.txt');
        process.exit(1);
      }

      const fullPath = path.resolve(targetPath);
      if (!fs.existsSync(fullPath)) {
        console.error(`Error: File or directory not found: ${fullPath}`);
        process.exit(1);
      }

      const isDir = fs.statSync(fullPath).isDirectory();
      const filesToProcess = isDir
        ? fs.readdirSync(fullPath).filter((f) => !f.startsWith('.')).map((f) => path.join(fullPath, f))
        : [fullPath];

      console.log(`\n⚡ Processing ${filesToProcess.length} document(s) with 100% Local AI...`);
      console.log('========================================================================');

      for (const file of filesToProcess) {
        try {
          const filename = path.basename(file);
          const rawText = DocumentParser.parseFile(file);

          process.stdout.write(`Ingesting ${filename}... `);
          const extracted = await extractor.extract(rawText, filename);
          const taxInfo = categorizer.categorize(extracted);
          const existingDocs = store.getAll();

          const docId = `cli_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
          const doc = {
            id: docId,
            filename,
            raw_text_preview: rawText.slice(0, 200),
            ...extracted,
            tax_categorization: taxInfo
          };

          doc.validation = validator.validate(doc, existingDocs);
          store.save(doc);

          console.log(`✓ DONE`);
          console.log(`   Vendor:      ${doc.vendor}`);
          console.log(`   Date:        ${doc.date}`);
          console.log(`   Total:       $${doc.total.toFixed(2)}`);
          console.log(`   Category:    ${taxInfo.category} (${taxInfo.schedule_c_line})`);
          console.log(`   Deductible:  $${taxInfo.deductible_amount.toFixed(2)} (Tax savings: ~$${taxInfo.estimated_tax_savings.toFixed(2)})`);
          console.log(`   Audit Check: ${doc.validation.auditStatus}\n`);
        } catch (err) {
          console.log(`✗ FAILED: ${err.message}`);
        }
      }
      break;
    }

    case 'stats': {
      const stats = store.getStats();
      console.log('\n📊 LedgerZero Financial & Tax Summary');
      console.log('==============================================');
      console.log(`Total Documents Logged:   ${stats.totalDocuments}`);
      console.log(`Total Documented Spend:   $${stats.totalSpent.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
      console.log(`Schedule C Deductions:    $${stats.totalDeductible.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
      console.log(`Estimated Tax Cash Saved: $${stats.totalTaxSavings.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
      console.log('----------------------------------------------');
      console.log('Category Breakdown:');
      for (const [cat, count] of Object.entries(stats.categoryCounts)) {
        console.log(`  • ${cat.padEnd(35)} : ${count} items`);
      }
      console.log('==============================================\n');
      break;
    }

    case 'export': {
      const docs = store.getAll();
      const csv = Exporter.toCSV(docs);
      const outFile = args[1] || 'LedgerZero_Tax_Export.csv';
      fs.writeFileSync(path.resolve(outFile), csv, 'utf-8');
      console.log(`\n✓ Successfully exported ${docs.length} documents to: ${outFile}\n`);
      break;
    }

    default:
      console.log(`
LedgerZero AI - 100% Local Air-Gapped Invoice & Receipt Sorter
Usage:
  node cli.js status                  Check local Ollama / model connectivity
  node cli.js process <file_or_dir>   Extract & categorize receipts
  node cli.js stats                   Print tax deduction analytics
  node cli.js export [output.csv]     Export accountant-ready CSV
      `);
      break;
  }
}

main().catch(console.error);
