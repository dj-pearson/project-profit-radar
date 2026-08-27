#!/usr/bin/env bash
# Guard: build artifacts, backups, and database dumps must not be tracked
# (US-261, hardened under US-286).
#
# .gitignore already excludes these, but `git add -f` can force them in. This
# fails (exit 1) if any tracked file matches a cruft pattern.
#
# The original pattern was `\.backup$`, which matches `foo.backup` and NOT
# `foo.backup.gz`. Three of the four production cluster dumps in this repo's
# history are `.backup.gz`, so this guard would have stopped exactly one of
# them, while the US-286 runbook described it as already blocking re-commits.
# It also anchored `^backup_.*\.sql$` to the start of the path, so anything in
# a subdirectory slipped through, and it had no pattern for a directory called
# `backup/` or `backups/` at all.
#
# A 20 MB dump of auth.users, auth.refresh_tokens and pgsodium.key is the worst
# thing that can enter a git history: removing it needs a coordinated rewrite
# and rotation of every credential it held. Match generously here.
set -euo pipefail

patterns='(^|/)(backup|backups)/'                      # any backup directory
patterns+='|\.backup(\.gz|\.bz2|\.zst|\.xz)?$'         # foo.backup and compressed forms
patterns+='|\.(dump|pgdump)(\.gz|\.bz2|\.zst|\.xz)?$'  # pg_dump output
patterns+='|\.sql\.(gz|bz2|zst|xz)$'                   # compressed SQL
patterns+='|(^|/)backup_.*\.sql$'                      # backup_2025.sql, at any depth
patterns+='|(^|/)db_cluster'                           # the exact shape that got in
patterns+='|(^|/)tsc-output\.txt$'
patterns+='|(^|/)\.env_backup$'
patterns+='|\.crash$|(^|/)Crash/'

hits="$(git ls-files | grep -E "$patterns" || true)"

if [[ -n "$hits" ]]; then
  echo "❌ Tracked build/backup/dump cruft (should be gitignored, not committed):"
  echo "$hits" | sed 's/^/   - /'
  echo ""
  echo "   If this is a database dump, do NOT just delete the file and commit:"
  echo "   the blob stays in history and every credential in it is compromised."
  echo "   See docs/RUNBOOK_DB_DUMP_INCIDENT.md."
  echo ""
  echo "Run: git rm --cached <file>  (and confirm it's covered by .gitignore)."
  exit 1
fi

echo "✅ No tracked build/backup/dump cruft."
