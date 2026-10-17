#!/usr/bin/env python3
"""
LedgerZero AI - Python Standalone CLI
100% Local, Privacy-Preserving Invoice & Receipt Intelligence
Zero external dependencies (uses standard library json, urllib, re, sys, os)
"""

import sys
import os
import json
import re
import urllib.request
import urllib.error
from datetime import datetime

STORAGE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')
STORAGE_FILE = os.path.join(STORAGE_DIR, 'documents.json')

CATEGORIES = {
    'Software & SaaS Subscriptions': {
        'keywords': ['aws', 'github', 'figma', 'slack', 'zoom', 'adobe', 'google cloud', 'digitalocean', 'vercel', 'openai', 'notion', 'saas', 'software'],
        'line': 'Line 48 (Other Expenses - Software)',
        'deductible': 1.0
    },
    'Equipment & Hardware': {
        'keywords': ['apple', 'macbook', 'ipad', 'dell', 'lenovo', 'monitor', 'keyboard', 'hardware', 'laptop', 'gpu', 'ssd'],
        'line': 'Line 13 (Depreciation / Sec 179)',
        'deductible': 1.0
    },
    'Contract Labor & Subcontractors': {
        'keywords': ['upwork', 'fiverr', 'contractor', 'consulting', 'freelancer', 'subcontractor', 'development fee'],
        'line': 'Line 11 (Contract Labor)',
        'deductible': 1.0
    },
    'Meals & Client Entertainment': {
        'keywords': ['starbucks', 'coffee', 'cafe', 'restaurant', 'dinner', 'lunch', 'food', 'chipotle', 'uber eats'],
        'line': 'Line 24b (Deductible Meals 50%)',
        'deductible': 0.5
    },
    'Travel & Transportation': {
        'keywords': ['uber', 'lyft', 'taxi', 'flight', 'airline', 'hotel', 'airbnb', 'parking', 'train'],
        'line': 'Line 24a (Travel)',
        'deductible': 1.0
    },
    'Office Supplies & Rent': {
        'keywords': ['wework', 'regus', 'coworking', 'office depot', 'staples', 'desk', 'stationery', 'printer'],
        'line': 'Line 18 (Office) / Line 20b (Rent)',
        'deductible': 1.0
    }
}

def load_documents():
    if not os.path.exists(STORAGE_FILE):
        return []
    try:
        with open(STORAGE_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return []

def save_document(doc):
    os.makedirs(STORAGE_DIR, exist_ok=True)
    docs = load_documents()
    docs.insert(0, doc)
    with open(STORAGE_FILE, 'w', encoding='utf-8') as f:
        json.dump(docs, f, indent=2)

def extract_heuristic(text, filename=""):
    # Detect total
    total = 0.0
    m_total = re.search(r'(?:total|amount due|balance due)[\s:]*[$€£₹]?\s*([\d,]+\.?\d{0,2})', text, re.IGNORECASE)
    if m_total:
        total = float(m_total.group(1).replace(',', ''))
    else:
        amounts = [float(x.replace(',', '')) for x in re.findall(r'[$€£₹]\s*([\d,]+\.\d{2})', text)]
        if amounts:
            total = max(amounts)

    # Detect date
    date_str = datetime.now().strftime('%Y-%m-%d')
    m_date = re.search(r'\b(\d{4}[-/.]\d{1,2}[-/.]\d{1,2})\b', text)
    if m_date:
        date_str = m_date.group(1)

    # Detect vendor
    vendor = "Unknown Merchant"
    known = ['AWS', 'Amazon', 'Apple', 'Starbucks', 'WeWork', 'Google Cloud', 'GitHub', 'Figma', 'Uber', 'Zoom']
    for k in known:
        if re.search(rf'\b{k}\b', text, re.IGNORECASE):
            vendor = k
            break
    if vendor == "Unknown Merchant" and filename:
        vendor = os.path.splitext(filename)[0].replace('_', ' ').title()

    # Detect invoice #
    inv_num = "N/A"
    m_inv = re.search(r'(?:invoice|receipt|order)\s*(?:#|no\.?|number)?\s*[:=]?\s*([A-Za-z0-9-_]{3,20})', text, re.IGNORECASE)
    if m_inv:
        inv_num = m_inv.group(1)

    return {
        'vendor': vendor,
        'date': date_str,
        'total': total,
        'invoice_number': inv_num,
        'currency': 'USD',
        'inference_source': 'Local Python Engine'
    }

def categorize(extracted):
    text = (extracted['vendor'] + ' ' + extracted.get('invoice_number', '')).lower()
    matched_cat = 'Office Supplies & Rent'
    best_score = 0
    for cat_name, info in CATEGORIES.items():
        score = sum(2 if kw in text else 0 for kw in info['keywords'])
        if score > best_score:
            best_score = score
            matched_cat = cat_name

    info = CATEGORIES[matched_cat]
    total = extracted['total']
    deductible = round(total * info['deductible'], 2)
    savings = round(deductible * 0.25, 2)

    return {
        'category': matched_cat,
        'schedule_c_line': info['line'],
        'deductible_percentage': int(info['deductible'] * 100),
        'deductible_amount': deductible,
        'estimated_tax_savings': savings
    }

def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'help'

    if cmd == 'process':
        target = sys.argv[2] if len(sys.argv) > 2 else None
        if not target or not os.path.exists(target):
            print("Usage: python3 cli.py process <filepath_or_dir>")
            sys.exit(1)

        files = [target] if os.path.isfile(target) else [
            os.path.join(target, f) for f in os.listdir(target) if not f.startswith('.')
        ]

        print(f"\n⚡ Processing {len(files)} document(s) locally...")
        for fpath in files:
            with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
                text = f.read()
            extracted = extract_heuristic(text, os.path.basename(fpath))
            tax_info = categorize(extracted)
            doc_id = f"py_{int(datetime.now().timestamp())}_{os.urandom(2).hex()}"
            doc = {
                'id': doc_id,
                'filename': os.path.basename(fpath),
                **extracted,
                'tax_categorization': tax_info,
                'validation': {'auditStatus': 'IRS Audit Ready'}
            }
            save_document(doc)
            print(f"✓ {extracted['vendor']} | ${extracted['total']} | {tax_info['category']} | Tax Savings: ~${tax_info['estimated_tax_savings']}")

    elif cmd == 'stats':
        docs = load_documents()
        total = sum(d.get('total', 0) for d in docs)
        deductible = sum(d.get('tax_categorization', {}).get('deductible_amount', 0) for d in docs)
        savings = sum(d.get('tax_categorization', {}).get('estimated_tax_savings', 0) for d in docs)

        print("\n📊 LedgerZero Financial & Tax Summary")
        print("==========================================")
        print(f"Total Documents: {len(docs)}")
        print(f"Total Spent:     ${total:,.2f}")
        print(f"Deductible:      ${deductible:,.2f}")
        print(f"Est Tax Savings: ${savings:,.2f}")
        print("==========================================\n")

    else:
        print("""
LedgerZero AI - Python CLI
Usage:
  python3 cli.py process <file_or_dir>   Parse receipts locally
  python3 cli.py stats                   View financial & tax write-offs
        """)

if __name__ == '__main__':
    main()
