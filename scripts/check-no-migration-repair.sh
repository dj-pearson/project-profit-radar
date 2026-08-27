#!/usr/bin/env bash
# Guard: `supabase migration repair` must not appear in a script or workflow
# (US-248 AC4).
#
# repair edits the remote migration history to match whatever you assert. A
# deploy should do the opposite - change the database to match the history in
# the repo. Using it routinely is how the two diverged far enough to need a
# 193-entry hand-written reconciliation (repair-migrations.ps1) and a 345-entry
# mark-applied.ps1 that recorded migrations as applied WITHOUT RUNNING THEM.
#
# It is a recovery tool. Reaching for it is an incident, and belongs in a
# runbook with a human reading each step - see docs/RUNBOOK_MIGRATION_DEPLOY.md.
#
# The two historical scripts are exempt until US-248 AC2 deletes them; they are
# the reconciliation itself, not a deploy step.
set -euo pipefail

# Scoped to things that RUN: scripts, workflows, and package manifests. Prose
# that describes the problem - this file, the runbook, the PRD - is not a deploy
# path, and an exempt list that has to grow every time someone writes about it
# would rot.
# Two kinds of exemption, both bounded:
#   - the historical reconciliation scripts, until AC2 deletes them;
#   - this guard and its sibling drift check, which necessarily contain the
#     phrase in their own match pattern and error text. A guard cannot be
#     forbidden from naming the thing it guards against.
# Everything else is scoped by file type below, and comments are stripped, so
# documenting the rule elsewhere does not require an entry here.
EXEMPT='^(repair-migrations\.ps1|mark-applied\.ps1|scripts/check-no-migration-repair\.sh|scripts/check-migration-drift\.sh)$'

# Comments are excluded, not exempted by filename. This script and the drift
# check both explain in prose why repair is forbidden, and an exempt list that
# grew every time someone documented the rule is the thing this avoids. A line
# starting with #, // or * is not a command.
hits=""
while IFS= read -r -d '' f; do
  [[ "$f" =~ $EXEMPT ]] && continue
  if grep -vE '^[[:space:]]*(#|//|\*|/\*)' "$f" 2>/dev/null \
     | grep -qE 'migration[[:space:]]+repair|migration:repair'; then
    hits+="$f"$'\n'
  fi
done < <(git ls-files -z -- '*.sh' '*.ps1' '*.bash' '*.zsh' '*.mjs' '*.cjs' '*.js' '*.ts' \
    '.github/workflows/*.yml' '.github/workflows/*.yaml' 'package.json' 'Makefile')
hits="${hits%$'\n'}"

if [[ -n "$hits" ]]; then
  echo "❌ 'supabase migration repair' appears in:"
  echo "$hits" | sed 's/^/   - /'
  echo ""
  echo "   repair edits history to match your assertion; a deploy should change"
  echo "   the database to match the history in the repo. It is a recovery tool,"
  echo "   and its use is an incident, not a step."
  echo ""
  echo "   See docs/RUNBOOK_MIGRATION_DEPLOY.md."
  exit 1
fi

echo "✅ No 'supabase migration repair' outside the historical reconciliation scripts."
