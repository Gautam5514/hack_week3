#!/bin/bash

# ==========================================================
# ⚡ LedgerZero AI — 1-Click Startup Script
# ==========================================================

echo "=========================================================="
echo " 🚀 Starting LedgerZero AI (100% Local Financial Intelligence)"
echo "=========================================================="

# 1. Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed."
    echo "👉 Please install Node.js (v18+) from: https://nodejs.org/"
    exit 1
fi

NODE_VER=$(node -v)
echo "✓ Node.js detected: $NODE_VER"

# 2. Check dependencies
if [ ! -d "node_modules" ]; then
    echo "📦 Installing required dependencies (express, cors)..."
    npm install
fi

# 3. Check Ollama (Optional)
if curl -s http://127.0.0.1:11434/api/tags > /dev/null 2>&1; then
    echo "✓ Local Ollama daemon detected at :11434 (Open-weights active!)"
else
    echo "ℹ️  Ollama not running on port 11434."
    echo "   Running with Built-in Offline Heuristic Engine (< 5ms latency)."
    echo "   (To enable LLM models, install Ollama from https://ollama.com and run: ollama run gemma2:2b)"
fi

# 4. Start Server
echo ""
echo "🌟 Launching Web Dashboard at: http://localhost:3030"
echo "   Press Ctrl+C to stop the server."
echo "=========================================================="

# Auto-open browser on macOS
if [[ "$OSTYPE" == "darwin"* ]]; then
    (sleep 1.5 && open "http://localhost:3030") &
fi

npm start
