# 🏗️ LedgerZero AI — Technical Architecture

LedgerZero AI is designed from the ground up around **open-source AI, local open-weight inference, and an air-gapped agentic pipeline**. It delivers enterprise-grade receipt parsing, financial entity extraction, and IRS Schedule C tax write-off classification without sending a single byte of sensitive financial data over the internet.

```
+-----------------------------------------------------------------------------------------+
|                                    USER LAPTOP (AIR-GAPPED)                             |
|                                                                                         |
|  +--------------------+         +----------------------------------------------------+  |
|  | Modern Web UI / CLI| <-----> |                EXPRESS REST API SERVER             |  |
|  | (Vanilla JS, CSS3, |         |                  (Node.js / Python)                |  |
|  |  No Tracking)      |         +----------------------------------------------------+  |
|  +--------------------+                                   |                             |
|                                                           v                             |
|                                         +------------------------------------+          |
|                                         |       AGENTIC PIPELINE (CORE)      |          |
|                                         |                                    |          |
|                                         |  1. Local Ingestion & Parsing      |          |
|                                         |  2. Structured Entity Extractor    |          |
|                                         |  3. IRS Schedule C Categorizer     |          |
|                                         |  4. Anti-Duplicate & Audit Engine  |          |
|                                         +------------------------------------+          |
|                                            /                              \             |
|                                           v                                v            |
|                   +----------------------------------+          +--------------------+  |
|                   | LOCAL OPEN-WEIGHT INFERENCE      |          | EMBEDDED HEURISTIC |  |
|                   |  - Ollama Daemon (:11434)        |          | ENGINE (FALLBACK)  |  |
|                   |  - Llama 3.2 (Meta)              |          | - Regex Tokenizer  |  |
|                   |  - Qwen 2.5 (Alibaba)            |          | - Tax Match Table  |  |
|                   |  - Mistral 7B / Phi-3 Mini       |          | - < 5ms Latency    |  |
|                   +----------------------------------+          +--------------------+  |
|                                           \                                /            |
|                                            v                              v             |
|                                         +------------------------------------+          |
|                                         | LOCAL JSON DOCUMENT STORE & EXPORT |          |
|                                         |  - data/documents.json             |          |
|                                         |  - Accountant CSV / Schedule C     |          |
|                                         +------------------------------------+          |
+-----------------------------------------------------------------------------------------+
```

---

## 1. Why Open-Source AI is the Core Enabler

Closed-source proprietary APIs (such as OpenAI GPT-4o or Anthropic Claude) fail in three critical dimensions for freelance finance:

1. **Client Confidentiality & Non-Disclosure Agreements (NDAs):**
   Freelancers routinely invoice high-profile companies, venture-backed startups, or sensitive healthcare/legal clients. Uploading invoice line items, client project code names, hourly billing rates, and bank settlement details to public cloud API endpoints violates confidentiality agreements and European GDPR/US privacy protections.
2. **Unit Economics for Micro-SaaS:**
   Cloud AI APIs charge per input and output token. Running an image OCR + multi-page invoice prompt through GPT-4o costs between $0.03 and $0.08 per invoice. For a freelancer sorting 1,000 backlogged receipts, API costs alone would exceed $50. By running quantized open-weight models (`llama3.2:3b` or `qwen2.5:7b`) locally, the **marginal inference cost is exactly $0.00**. This enables selling a lifetime license for $49 or $12/month with 95%+ gross margin.
3. **True Offline Portability:**
   Freelancers and digital nomads work on long-haul flights, trains, remote cafes, and co-working spaces with spotty Wi-Fi. LedgerZero functions 100% offline with zero internet connectivity.

---

## 2. Multi-Agent Pipeline

The core processing engine is broken into four distinct, verifiable stages:

### Stage 1: Document Ingestion & Normalization (`src/utils/pdf_parser.js`)
- Accepts PDF streams, scanned text, plain text receipts, CSVs, or pasted invoices.
- Normalizes typography, strips non-printable control characters, and handles diverse date encodings (`YYYY-MM-DD`, `MM/DD/YYYY`, `DD Mon YYYY`).

### Stage 2: Structured Entity Extractor (`src/agents/extractor.js`)
- Interfaces with local Ollama daemon using JSON Schema enforcement (`format: 'json'`).
- Extracts:
  - `vendor`: Official merchant or contractor name.
  - `date`: Normalized ISO date.
  - `invoice_number`: Unique invoice identifier.
  - `currency`: ISO currency code (`USD`, `EUR`, `GBP`, `INR`, `CAD`).
  - `subtotal`, `tax_amount`, `total`.
  - `payment_method`: Payment channel (Credit Card, Wire/ACH, PayPal, Apple Pay, Cash).
  - `line_items`: Itemized breakdown of goods and services.
- If Ollama is not running, seamlessly delegates to the built-in deterministic heuristic engine (`src/engines/heuristic.js`).

### Stage 3: Tax Categorization Agent (`src/agents/categorizer.js`)
- Maps vendor text and line-item descriptions against IRS Form 1040 Schedule C expense lines:
  - **Software & SaaS Subscriptions:** 100% deductible (Line 48).
  - **Equipment & Hardware:** 100% deductible under Section 179 (Line 13).
  - **Contract Labor & Subcontractors:** 100% deductible (Line 11).
  - **Meals & Client Entertainment:** Capped at the statutory 50% limit (Line 24b).
  - **Travel & Transportation:** 100% deductible (Line 24a).
  - **Office Supplies & Rent:** 100% deductible (Lines 18 & 20b).
  - **Advertising & Marketing:** 100% deductible (Line 8).
  - **Legal & Professional Services:** 100% deductible (Line 17).
- Automatically calculates:
  $$\text{Deductible Amount} = \text{Total} \times \text{Deductible Percentage}$$
  $$\text{Estimated Cash Saved} = \text{Deductible Amount} \times 0.25 \text{ (Assumed Effective Tax Bracket)}$$

### Stage 4: Anti-Duplicate & IRS Audit Validator (`src/agents/validator.js`)
- **Deduplication Engine:** Compares incoming documents against local ledger by (Vendor + Date + Amount) and unique Invoice Number to prevent double-claiming deductions.
- **Anomaly Detection:** Flags future transaction dates, transactions above $5,000 requiring special documentation, and unverified merchant entities.
- Assigns an **IRS Audit Ready** compliance badge.

---

## 3. Supported Open-Weight Models

| Model | Size | RAM Required | Inference Speed (M-series Mac) | Best For |
|---|---|---|---|---|
| **Llama 3.2 (3B)** | 2.0 GB | 4 GB | ~55 tok/sec | Default balanced extraction & quick parsing |
| **Llama 3.2 (1B)** | 1.3 GB | 2 GB | ~90 tok/sec | Ultra-low power / battery-saving runs |
| **Qwen 2.5 (7B)** | 4.7 GB | 8 GB | ~38 tok/sec | Multi-lingual receipts & complex foreign currencies |
| **Mistral (7B)** | 4.1 GB | 8 GB | ~35 tok/sec | Complex itemized multi-page vendor bills |
| **Built-in Heuristic** | 0 MB | < 50 MB | < 5 ms | Instant zero-setup fallback (no daemon needed) |

---

## 4. Local Data Security Model

- **No Remote Telemetry:** Zero analytics trackers, Google Analytics, or third-party CDNs.
- **Local JSON Database:** Encapsulated in `./data/documents.json` on the user's filesystem.
- **Export Integrity:** Instant export to RFC 4180 compliant CSV and structured JSON for CPAs, QuickBooks, or TurboTax.
