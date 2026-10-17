# ⚡ LedgerZero AI

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Open Source AI](https://img.shields.io/badge/Open--Source%20AI-Gemma%202%20%7C%20Llama%203.2%20%7C%20Qwen%202.5-green)](ARCHITECTURE.md)
[![Privacy](https://img.shields.io/badge/Privacy-100%25%20Air--Gapped%20%7C%20Zero%20Telemetry-emerald)](ARCHITECTURE.md)
[![Platform](https://img.shields.io/badge/Platform-macOS%20%7C%20Linux%20%7C%20Windows-purple)](README.md)
[![Tests](https://img.shields.io/badge/Tests-Passing%20(100%25)-brightgreen)](tests/)

> **100% Local, Air-Gapped AI Invoice, Receipt & Tax Sorter for Freelancers**  
> *Built with open-weight models at its core (Google Gemma 2, Meta Llama 3.2, Qwen 2.5). Client invoices, contracts, and financial receipts never leave your laptop.*

---

## 📖 Table of Contents
- [✨ Why LedgerZero AI?](#-why-ledgerzero-ai)
- [🎯 The Problem It Solves](#-the-problem-it-solves)
- [💡 Why Open Innovation Matters Here](#-why-open-innovation-matters-here)
- [🛠️ Tech Stack & Architecture](#️-tech-stack--architecture)
- [🚀 Quickstart in 30 Seconds](#-quickstart-in-30-seconds)
- [💻 Command Line Interface (CLI)](#-command-line-interface-cli)
- [🌐 Web UI Dashboard](#-web-ui-dashboard)
- [📊 Tax Categorization & Schedule C Support](#-tax-categorization--schedule-c-support)
- [💼 Side Hustle Business Model & Pricing](#-side-hustle-business-model--pricing)
- [🧪 Running Tests](#-running-tests)
- [🤝 Contributing & License](#-contributing--license)

---

## ✨ Why LedgerZero AI?

Freelancers, independent software contractors, and boutique agencies handle sensitive financial documents daily: client invoices, subcontractor agreements, cloud hosting bills, and hardware receipts.

Existing tools fail freelancers:
- **Cloud Accounting SaaS (QuickBooks, Expensify):** Charge $20–$35/month recurring subscriptions and leak client billing telemetry to third-party cloud servers.
- **Cloud AI APIs (ChatGPT, Claude):** Violate strict **Client Non-Disclosure Agreements (NDAs)** and European GDPR. Ingesting client project names and billing rates into public AI servers breaches enterprise contracts.
- **Manual Logging:** Tedious, stressful, and results in freelancers losing an average of **$4,500 in unclaimed tax write-offs every year**.

**LedgerZero AI** changes the game: It runs **locally on your machine** powered by open-weight models (**Google Gemma 2**, **Meta Llama 3.2**, or **Qwen 2.5**) via Ollama, with a built-in deterministic offline engine. It extracts financial entities, categorizes expenses into **IRS Form 1040 Schedule C**, flags duplicate write-offs, and calculates your cash tax savings with **zero cloud dependencies**.

---

## 🎯 The Problem It Solves

```
+-----------------------------------------------------------------------------------------+
|                                    BEFORE LEDGERZERO                                    |
|  • Invoices & receipts scattered across emails, downloads, and shoeboxes.                |
|  • Paying $300+/year for QuickBooks or Expensify subscriptions.                          |
|  • Cannot use ChatGPT/Claude because enterprise client NDAs forbid uploading contracts.  |
|  • Stressful tax season with thousands of dollars in missed tax deductions.              |
+-----------------------------------------------------------------------------------------+
                                            │
                                            ▼
+-----------------------------------------------------------------------------------------+
|                                    AFTER LEDGERZERO                                     |
|  ✔ Drag & drop receipts or run 1 terminal command on your laptop.                        |
|  ✔ 100% Air-Gapped: Zero data ever leaves your computer (No WiFi required).             |
|  ✔ $0.00 in AI token costs (runs locally on your CPU/Apple Silicon GPU).                |
|  ✔ Instant 1-click export to Accountant CSV, QuickBooks format, or Schedule C summary.   |
|  ✔ Automatic calculation of deductible tax write-offs and direct cash saved.             |
+-----------------------------------------------------------------------------------------+
```

---

## 💡 Why Open Innovation Matters Here

1. **Air-Gapped Privacy & NDA Compliance:**
   Your financial records, client names, and billing rates never touch an external server. Complies with the strictest enterprise client NDAs, HIPAA, and GDPR.
2. **Runs Completely Offline:**
   Works seamlessly on airplanes, trains, or off-grid coffee shops without any internet connection.
3. **Zero Marginal Inference Cost:**
   Running proprietary models (like GPT-4o) through cloud APIs costs $0.03–$0.08 per receipt. For a freelancer sorting 1,000 backlogged receipts, that's $30–$80 in API fees! Open-weight models running on local hardware cost **exactly $0.00**.
4. **Model Freedom & Portability:**
   Swap models freely depending on your workload:
   - **Google Gemma 2 (2B & 9B):** Ultra-fast, highly accurate structured extraction with low memory footprint.
   - **Meta Llama 3.2 (3B):** Lightweight, energy-efficient parsing on battery power.
   - **Qwen 2.5 (7B):** Superior multilingual and foreign currency receipts (EUR, GBP, INR, JPY).
   - **Built-in Heuristic Engine:** Instant sub-5ms zero-setup runs.

---

## 🛠️ Tech Stack & Architecture

```
LedgerZero AI
├── backend/server.js       # Express REST API & static server (:3030)
├── public/                 # Responsive Web UI Dashboard
│   ├── index.html          # Clean dark-mode interface
│   ├── styles.css          # Modern typography & Tailwind-inspired styling
│   └── app.js              # Real-time agent pipeline controller
├── src/
│   ├── agents/
│   │   ├── extractor.js    # Structured LLM entity extractor (Gemma / Llama / Qwen)
│   │   ├── categorizer.js  # IRS Schedule C tax mapping engine
│   │   └── validator.js    # Deduplication & IRS audit check agent
│   ├── engines/
│   │   ├── local_llm.js    # Native Ollama / open-weight model client
│   │   └── heuristic.js    # Deterministic offline parser (< 5ms)
│   ├── utils/
│   │   ├── pdf_parser.js   # Local text & PDF ingestion
│   │   └── exporter.js     # CSV and tax summary generator
│   └── store.js            # Local JSON database (data/documents.json)
├── cli.js                  # Standalone Node.js CLI tool
├── cli.py                  # Standalone Python 3 CLI tool
├── samples/                # Realistic test receipts and invoices
└── tests/                  # Automated unit, categorizer, and industry test suites
```

---

## 🚀 Quickstart in 30 Seconds

### Prerequisites
- [Node.js](https://nodejs.org/) (v16+) or [Python 3](https://python.org/)
- *(Optional)* [Ollama](https://ollama.com/) running locally with `ollama run gemma2:2b` or `ollama run llama3.2`. *(If Ollama is not installed, the built-in offline heuristic engine activates automatically!)*

### Step 1: Install Dependencies
```bash
git clone https://github.com/Gautam5514/LedgerZero-AI.git # or cd hack3
cd hack3
npm install
```

### Step 2: Start the Web Dashboard
```bash
npm start
```
Open **[http://localhost:3030](http://localhost:3030)** in your browser!

### Step 3: Test with 1-Click Samples
Click the **"⚡ Load Sample Invoices"** button in the dashboard to immediately test realistic invoices (AWS Cloud, Apple MacBook workstation, Starbucks client meal, WeWork coworking rent, and developer contractor invoice).

---

## 💻 Command Line Interface (CLI)

For developers, power users, and terminal enthusiasts, LedgerZero provides full CLI tools in both Node.js and Python.

### Node.js CLI:
```bash
# Check local Ollama and model connectivity
node cli.js status

# Process an individual receipt or an entire folder of invoices
node cli.js process ./samples/receipt_aws_cloud.txt
node cli.js process ./samples/

# View tax deduction analytics and cash savings
node cli.js stats

# Export accountant-ready CSV
node cli.js export my_2026_tax_expenses.csv
```

### Python 3 CLI (Zero External Dependencies):
```bash
# Process receipts with standard Python
python3 cli.py process ./samples/

# View financial summary
python3 cli.py stats
```

---

## 🌐 Web UI Dashboard

The local web interface provides:
- **Interactive Drag-and-Drop Dropzone:** Ingest text, PDFs, CSVs, PNG/JPG receipt images, or paste raw invoice text.
- **Real-Time Agent Stepper:** Visualizes the 4-stage pipeline:
  1. Local Ingestion
  2. Open-Weight LLM Extraction
  3. IRS Schedule C Mapping
  4. Anti-Duplicate & Audit Verification
- **Visual Spend & Deduction SVG Chart:** Interactive category distribution bars rendered locally without external charting libraries.
- **IRS Form 1040 Schedule C Modal:** Line-by-line tax breakdown mapping write-offs to official tax lines.
- **Printable Audit Pack:** Generates an accountant-ready HTML/PDF audit package.
- **Live Tax Savings Metric Cards:** Displays Total Documented Spend, Allowable Deductions, Estimated Cash Back, and Cloud API Dollars Saved.
- **Interactive Ledger Table:** Filter by category, search by vendor/invoice number, and edit records with Human-in-the-Loop review.
- **Model Selector:** Seamlessly toggle between Google Gemma 2, Meta Llama 3.2, Qwen 2.5, Mistral, or the built-in offline engine.

---

## 📊 Tax Categorization & Schedule C Support

LedgerZero maps expenses directly to IRS Form 1040 Schedule C expense lines:

| Category | Schedule C Line | Deductible % | Example Expenses |
|---|---|---|---|
| **Software & SaaS Subscriptions** | Line 48 (Other Expenses) | **100%** | AWS, GitHub, Figma, Zoom, OpenAI API |
| **Equipment & Hardware** | Line 13 (Sec 179 Depreciation) | **100%** | MacBooks, 4K monitors, testing devices |
| **Contract Labor & Subcontractors** | Line 11 (Contract Labor) | **100%** | Payments to designers, QA testers, devs |
| **Meals & Client Entertainment** | Line 24b (Deductible Meals) | **50%** *(Statutory)* | Coffee meetings, client dinners |
| **Travel & Transportation** | Line 24a (Travel) | **100%** | Flights, Uber/Lyft to clients, hotels |
| **Office Supplies & Rent** | Line 18 / Line 20b | **100%** | WeWork desk, home office stationery |
| **Advertising & Marketing** | Line 8 (Advertising) | **100%** | Google/LinkedIn Ads, domain names, branding |
| **Legal & Professional Services** | Line 17 (Legal Services) | **100%** | CPA fees, contract review, trademarks |

---

## 💼 Side Hustle Business Model & Pricing

| Plan | Price | Target Customer | Features |
|---|---|---|---|
| **Community Edition** | **Free (MIT)** | Open-Source Devs | Full CLI, offline engine, unlimited parsing |
| **Pro Desktop License** | **$49 One-Time** | Freelancers & Contractors | Modern GUI, Schedule C Calculator, Audit Shield |
| **CPA / Agency Edition** | **$149 One-Time** | Boutique Bookkeepers | Multi-client vaults, white-label client reports |

*See [`BUSINESS_PLAN.md`](BUSINESS_PLAN.md) for full unit economics, customer discovery interviews, and go-to-market plan.*

---

## 🧪 Running Tests

Verify the local extraction, tax categorization, and industry end-to-end engines:

```bash
npm test
```

Expected output:
```
🧪 Running Test Suite: Document Extraction Engine...
  ✓ Test 1 Passed: AWS Cloud receipt correctly extracted ($404.49)
  ✓ Test 2 Passed: Starbucks client meal receipt correctly extracted ($28.77)
  ✓ Test 3 Passed: Apple hardware receipt correctly extracted ($4,309.15)
  ✓ Test 4 Passed: WeWork rent invoice correctly extracted ($545.00)
🎉 All Extraction Engine tests passed successfully!

🧪 Running Test Suite: Tax Categorizer Agent...
  ✓ Test 1 Passed: AWS mapped to Software & SaaS (100% write-off = $100 tax saved)
  ✓ Test 2 Passed: Starbucks correctly capped at 50% statutory meal deduction ($6.25 saved)
  ✓ Test 3 Passed: Apple workstation mapped to Section 179 Equipment ($875 tax saved)
  ✓ Test 4 Passed: WeWork rent mapped to Schedule C Line 20b ($150 tax saved)
🎉 All Tax Categorizer tests passed successfully!

🧪 Running Industry-Grade Verification Suite...
  ✓ EUR & GBP multi-currency extraction verified
  ✓ Statutory 50% meal deduction verified
  ✓ Duplicate invoice reference caught successfully
  ✓ High-value expense (> $5,000) flagged for IRS audit documentation
  ✓ CSV export and Schedule C summary math verified
🎉 ALL INDUSTRY-GRADE TESTS PASSED WITH 100% SUCCESS!
```

---

## 🤝 Contributing & License

Contributions, issues, and feature requests are welcome!

Released under the **[MIT License](LICENSE)**. Copyright © 2026 Gautam Pandit.
