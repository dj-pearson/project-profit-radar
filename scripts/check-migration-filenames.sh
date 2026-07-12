#!/usr/bin/env bash
# Guard: every file in supabase/migrations/ must be a real, ordered migration.
#
# `supabase db push` applies EVERY *.sql in supabase/migrations/ in filename
# sort order. A file without a 14-digit timestamp prefix (e.g. a ROLLBACK_ or
# FIX_ script) sorts unpredictably — often AFTER every real migration — and can
# silently execute destructive DDL on the next push. Rollback/one-off SQL
# belongs in scripts/, never in the migrations directory.
#
# Fails (exit 1) if any file in supabase/migrations/ does not match
# ^[0-9]{14}_.*\.sql$. Run in CI and pre-commit.
set -euo pipefail

MIGRATIONS_DIR="supabase/migrations"
pattern='^[0-9]{14}_.+\.sql$'
bad=()

if [[ ! -d "$MIGRATIONS_DIR" ]]; then
  echo "check-migration-filenames: $MIGRATIONS_DIR not found, skipping."
  exit 0
fi

while IFS= read -r -d '' f; do
  base="$(basename "$f")"
  if [[ ! "$base" =~ $pattern ]]; then
    bad+=("$f")
  fi
done < <(find "$MIGRATIONS_DIR" -maxdepth 1 -type f -name '*.sql' -print0)

if (( ${#bad[@]} > 0 )); then
  echo "❌ Non-migration SQL files found in $MIGRATIONS_DIR:"
  for f in "${bad[@]}"; do echo "   - $f"; done
  echo ""
  echo "These will be applied by 'supabase db push'. Migrations must be named"
  echo "YYYYMMDDHHMMSS_snake_case.sql. Move rollback/one-off SQL to scripts/."
  exit 1
fi

echo "✅ All files in $MIGRATIONS_DIR use a valid 14-digit timestamp prefix."
