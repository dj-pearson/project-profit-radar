#!/bin/bash
# Count remaining TypeScript strict-mode errors (US-212 burn-down tracker).
#
# Runs the real type-check used by CI and reports the total plus a breakdown by
# error code so progress on the strict-mode backlog is measurable between
# sessions. NOTE: tsc on this project is slow (deep Supabase query types) — a
# full run can take 10-15 minutes.
#
# Usage: bash scripts/count-strict-violations.sh [path/to/saved-tsc-output.txt]
# If a saved tsc output file is passed, it is summarised instead of re-running.

set -uo pipefail
cd "$(dirname "$0")/.."

TMP="${1:-}"
if [ -z "$TMP" ]; then
  TMP="$(mktemp)"
  echo "Running tsc -p tsconfig.app.json --noEmit (this is slow)..."
  ./node_modules/.bin/tsc -p tsconfig.app.json --noEmit > "$TMP" 2>&1
fi

TOTAL=$(grep -c "error TS" "$TMP")
echo "=== TypeScript strict-mode backlog (US-212) ==="
echo "Total errors: $TOTAL"
echo ""
echo "=== By error code (top 15) ==="
grep -oE "error TS[0-9]+" "$TMP" | sort | uniq -c | sort -rn | head -15
echo ""
echo "=== Files with the most errors (top 15) ==="
grep -oE "^[^(]+\.tsx?" "$TMP" | sort | uniq -c | sort -rn | head -15

# Reference table of the common codes for context.
cat <<'LEGEND'

Legend:
  TS6133  declared but never read (unused local/import — noUnusedLocals)
  TS2339  property does not exist on type
  TS2345  argument type not assignable
  TS2322  type not assignable
  TS2769  no overload matches this call
  TS7006  parameter implicitly has 'any'
  TS18047 value is possibly 'null'
  TS2589  type instantiation excessively deep (usually a Supabase query)
LEGEND
