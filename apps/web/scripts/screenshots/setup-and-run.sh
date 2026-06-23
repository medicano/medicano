#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=== Setup: instalando dependências ==="
npm init -y
npm install playwright
npx playwright install chromium

echo ""
echo "=== Rodando captura de screenshots ==="
node capture.js
