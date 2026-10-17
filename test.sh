#!/bin/bash

# ==========================================================
# 🧪 LedgerZero AI — Automated Test Suite Runner
# ==========================================================

echo "=========================================================="
echo " 🧪 RUNNING COMPLETE TEST SUITE FOR LEDGERZERO AI"
echo "=========================================================="

if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required to run tests."
    exit 1
fi

echo ""
echo "▶ 1. Entity Extraction Unit Tests..."
node tests/test_extraction.js
if [ $? -ne 0 ]; then
    echo "❌ Test 1 failed!"
    exit 1
fi

echo ""
echo "▶ 2. Tax Categorizer & Statutory Limit Tests..."
node tests/test_categorizer.js
if [ $? -ne 0 ]; then
    echo "❌ Test 2 failed!"
    exit 1
fi

echo ""
echo "▶ 3. Industry-Grade Multi-Currency & Deduplication Tests..."
node tests/test_industry.js
if [ $? -ne 0 ]; then
    echo "❌ Test 3 failed!"
    exit 1
fi

echo ""
echo "▶ 4. Edge-Case, Security & Data Recovery Tests..."
node tests/test_edge_cases.js
if [ $? -ne 0 ]; then
    echo "❌ Test 4 failed!"
    exit 1
fi

echo ""
echo "=========================================================="
echo " 🏆 ALL 4 TEST SUITES PASSED WITH 100% SUCCESS!"
echo "=========================================================="
