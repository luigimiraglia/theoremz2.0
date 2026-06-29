#!/bin/bash
# Genera e pusha le prossime 5 lezioni pending dal queue.
# Uso: bash scripts/run-batch.sh
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/.."

for i in 1 2 3 4 5; do
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  Batch: lezione $i/5"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  node scripts/generate-lesson.mjs --push
done

echo ""
echo "✅ Batch completato: 5 lezioni generate e pushate."
