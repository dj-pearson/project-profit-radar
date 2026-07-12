#!/usr/bin/env bash
# Guard: build artifacts, backups, and env dumps must not be tracked (US-261).
#
# .gitignore already excludes these, but `git add -f` can force them in. This
# fails (exit 1) if any tracked file matches a cruft pattern, so a 957KB
# tsc-output.txt, a *.backup, an .env_backup, or a crash dump can't creep back.
set -euo pipefail

patterns='^tsc-output\.txt$|\.backup$|^backup_.*\.sql$|^\.env_backup$|\.crash$|^Crash/'
hits="$(git ls-files | grep -E "$patterns" || true)"

if [[ -n "$hits" ]]; then
  echo "❌ Tracked build/backup/env cruft (should be gitignored, not committed):"
  echo "$hits" | sed 's/^/   - /'
  echo ""
  echo "Run: git rm --cached <file>  (and confirm it's covered by .gitignore)."
  exit 1
fi

echo "✅ No tracked build/backup/env cruft."
