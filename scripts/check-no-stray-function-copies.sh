#!/usr/bin/env bash
# Guard: no stray backup/duplicate copies committed under supabase/functions/.
#
# Supabase deploys the `index.ts` in each function directory. Personal backup
# copies (index-N-DPEARSON.ts, *.bak, index-copy.ts, index 2.ts) are dead
# weight that diverge from the real handler and — for billing-critical functions
# like check-subscription — invite deploying or editing the wrong file. This
# guard fails (exit 1) if any such file is tracked. (US-239)
set -euo pipefail

FN_DIR="supabase/functions"
[[ -d "$FN_DIR" ]] || { echo "check-no-stray-function-copies: $FN_DIR not found, skipping."; exit 0; }

# Patterns that indicate a backup/duplicate rather than a real module.
mapfile -t hits < <(find "$FN_DIR" -type f \
  \( -name '*-N-*.ts' -o -name '*.bak' -o -name '*.orig' \
     -o -name 'index-copy.ts' -o -name '*[[:space:]][0-9].ts' \) 2>/dev/null || true)

if (( ${#hits[@]} > 0 )); then
  echo "❌ Stray backup/duplicate files in $FN_DIR:"
  for f in "${hits[@]}"; do echo "   - $f"; done
  echo ""
  echo "Each function dir should contain a single index.ts. Remove backup copies."
  exit 1
fi

echo "✅ No stray backup/duplicate files under $FN_DIR."
