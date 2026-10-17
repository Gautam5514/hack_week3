# ⚡ LedgerZero AI — Complete Setup & Architecture Guide

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Open Source AI](https://img.shields.io/badge/Open--Source%20AI-Gemma%202%20%7C%20Llama%203.2%20%7C%20Qwen%202.5-green)](ARCHITECTURE.md)
[![Privacy](https://img.shields.io/badge/Privacy-100%25%20Air--Gapped%20%7C%20Zero%20Telemetry-emerald)](ARCHITECTURE.md)
[![Platform](https://img.shields.io/badge/Platform-macOS%20%7C%20Linux%20%7C%20Windows-purple)](README.md)

> **The 100% Local, Air-Gapped AI Financial Sorter for Freelancers**  
> *Turn messy shoeboxes of receipts and client invoices into IRS Schedule C tax write-offs without sending a single byte of confidential data over the internet.*

---

## 🎯 What Makes LedgerZero AI Unique?

Freelancers and independent software contractors routinely sign strict **Non-Disclosure Agreements (NDAs)** with enterprise clients. Uploading client invoices—which expose proprietary project names, billing rates, and banking details—to cloud-hosted AI APIs (like OpenAI or Anthropic) violates contracts and data privacy laws.

At the same time, cloud-based accounting apps like QuickBooks Self-Employed or Expensify charge $20–$35/month and monetize user data.

**LedgerZero AI flips the model:**
- **Zero Cloud Leakage:** All inference runs on your laptop's local CPU / Apple Silicon GPU.
- **Zero Token Fees:** Ingest 10,000 receipts for literally **$0.00**.
- **100% Offline Capability:** Process expense backlogs on flights, trains, or off-grid cafes with no WiFi.
- **Direct IRS Form 1040 Schedule C Mapping:** Automatically classifies expenses into official tax lines, flags duplicate write-offs, and calculates real cash savings.

---

## 📋 System Prerequisites

You only need **two core components** installed on your workstation:

| Prerequisite | Purpose | Status | Download / Verification |
|---|---|---|---|
| **Node.js (v18+)** | Powers the local Express backend, file ingestion, and accounting agents | **Required** | `node -v` • [Download Node.js](https://nodejs.org/) or run `brew install node` |
| **Modern Browser** | Safari, Chrome, Brave, or Edge for the local dashboard interface | **Required** | Access via `http://localhost:3030` |
| **Ollama** | Local runtime for open-weight models (Gemma 2, Llama 3.2, Qwen 2.5) | *Optional* | `curl http://localhost:11434` • [Download Ollama](https://ollama.com/) |

> 💡 **Note on Ollama:** If you don't have Ollama installed, LedgerZero AI automatically activates its **Built-in Offline Heuristic Engine** (< 5ms latency), so the entire application runs out of the box with zero external configuration!

---

## 🚀 Quickstart in 30 Seconds

### Step 1: Open Your Terminal
```bash
cd /Users/kunalkumar/Desktop/Gautam/hack3
```

### Step 2: Grant Execution Permissions & Launch
```bash
chmod +x start.sh test.sh
./start.sh
```

**The `start.sh` automation script will:**
1. Verify your Node.js runtime.
2. Confirm dependency integrity (`express`, `cors`).
3. Detect local Ollama open-weight model daemons.
4. Launch the local server on port `3030`.
5. Automatically open **`http://localhost:3030`** in your default web browser!

---

## 🧪 Comprehensive Test Suite Verification

LedgerZero AI includes **four automated test suites** guaranteeing mathematical precision, multi-currency handling, and defensive edge-case recovery:

```bash
./test.sh
# or run via npm
npm test
```

### Verified Test Suites:
- ✅ **Extraction Engine Suite (`tests/test_extraction.js`):** Tests deterministic entity extraction across AWS, Apple, WeWork, and Starbucks invoices.
- ✅ **Tax Categorizer Suite (`tests/test_categorizer.js`):** Enforces statutory deduction rules (e.g., 50% statutory cap on client business meals under IRC § 274(n)).
- ✅ **Industry Integration Suite (`tests/test_industry.js`):** Verifies multi-currency support (EUR, GBP, USD, INR), collision-free deduplication, and high-value audit flags (> $5,000).
- ✅ **Edge-Case & Security Suite (`tests/test_edge_cases.js`):** Tests CSV Formula Injection (CWE-1236) defense, corrupt file recovery, and boundary clamping.

---

## 💻 Terminal Command Line Interface (CLI)

For terminal enthusiasts and scriptable CI/CD workflows, LedgerZero provides a native CLI:

```bash
# Check local Ollama and open-weight model connectivity
node cli.js status

# Process an entire folder of backlogged receipts
node cli.js process ./samples/

# View real-time tax deduction analytics and cash savings
node cli.js stats

# Export sanitized, accountant-ready CSV
node cli.js export my_2026_tax_expenses.csv
```

---

## 🌐 Web Dashboard Tour & Capabilities

When you open **`http://localhost:3030`**, you'll find:

1. **⚡ Load Sample Invoices:** Instantly populates the ledger with five realistic sample transactions (Apple MacBook Pro workstation, AWS cloud infrastructure, WeWork coworking desk, Starbucks client sprint planning meal, and freelance consulting invoice).
2. **📥 Multi-Format Ingestion:** Drag and drop `.txt`, `.pdf`, `.png`, or `.jpg` receipt images, or paste raw text directly into the processing pane.
3. **🤖 Open-Weight Model Selector:** Seamlessly switch between **Google Gemma 2 (2B & 9B)**, **Meta Llama 3.2**, **Qwen 2.5**, or the **Built-in Offline Engine**.
4. **📊 Interactive SVG Category Chart:** Dynamic vector bar charts render visual category spend distributions with zero external charting dependencies.
5. **📋 IRS Form 1040 Schedule C Modal:** Inspect line-by-line tax deductions mapped to official IRS lines (Line 8, 10, 11, 13, 17, 18, 20b, 24a, 24b, 25, 48).
6. **🖨️ Printable Audit Pack:** Generates an accountant-ready HTML/PDF audit package with a single click at `/api/export/audit-pack`.
7. **📥 Export Center:** One-click downloads of RFC 4180 compliant CSV files with formula-injection protection for Excel, Numbers, and Google Sheets.

---

## 🔒 Enterprise-Grade Security Architecture

```
+-----------------------------------------------------------------------------------------+
|                                    USER WORKSTATION (AIR-GAPPED)                        |
|                                                                                         |
|   +--------------------+          +--------------------------------------------------+  |
|   | Responsive Web UI  | <----->  |           EXPRESS LOCAL REST API (:3030)         |  |
|   | (Zero Analytics)   |          |                (Node.js / Express)               |  |
|   +--------------------+          +--------------------------------------------------+  |
|                                                            |                            |
|                                                            v                            |
|                                          +------------------------------------+         |
|                                          |    MULTI-STAGE AGENT PIPELINE      |         |
|                                          |  • Document Parser (PDF/Text/Image)|         |
|                                          |  • LLM Entity Extractor (Gemma 2)  |         |
|                                          |  • Tax Categorizer (Schedule C)    |         |
|                                          |  • Audit & Deduplication Shield    |         |
|                                          +------------------------------------+         |
|                                             /                              \            |
|                                            v                                v           |
|                    +----------------------------------+          +--------------------+ |
|                    | LOCAL OPEN-WEIGHT INFERENCE      |          | OFFLINE HEURISTIC  | |
|                    |  - Google Gemma 2 (2B, 9B)       |          | ENGINE (FALLBACK)  | |
|                    |  - Meta Llama 3.2 (3B)           |          | - Regex Tokenizer  | |
|                    |  - Qwen 2.5 (7B)                 |          | - < 5ms Latency    | |
|                    +----------------------------------+          +--------------------+ |
|                                            \                                /           |
|                                             v                              v            |
|                                          +------------------------------------+         |
|                                          | LOCAL JSON STORE & EXPORT ENGINE   |         |
|                                          |  - data/documents.json             |         |
|                                          |  - Formula-Safe Accountant CSV     |         |
|                                          |  - Printable HTML/PDF Audit Pack   |         |
|                                          +------------------------------------+         |
+-----------------------------------------------------------------------------------------+
```

---

## 📄 License

Released under the **[MIT License](LICENSE)**. Copyright © 2026 Gautam Pandit.
