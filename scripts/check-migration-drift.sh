#!/usr/bin/env bash
# Migration drift check (US-248 AC3).
#
# Fails when the remote migration history and supabase/migrations disagree.
# Drift in either direction matters:
#
#   remote entry with no local file   someone applied SQL that is not in the
#                                     repo, or a migration file was deleted.
#                                     This is what produced the 193-entry
#                                     repair-migrations.ps1 reconciliation.
#   local file not applied remotely   a deploy did not finish, and the app is
#                                     running against a schema it does not
#                                     expect.
#
# Needs SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF, so it cannot run in a
# PR build from a fork. Run it after every deploy; wire it to a schedule once
# those secrets are available to CI.
set -euo pipefail

if ! command -v supabase >/dev/null 2>&1; then
  echo "supabase CLI not found - skipping drift check." >&2
  echo "Install it (https://supabase.com/docs/guides/cli) to run this." >&2
  exit 0
fi

: "${SUPABASE_PROJECT_REF:?set SUPABASE_PROJECT_REF to the project to check}"

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  echo "SUPABASE_ACCESS_TOKEN is not set - run 'supabase login' or export it." >&2
  exit 1
fi

echo "Checking migration drift against ${SUPABASE_PROJECT_REF}..."
listing="$(supabase migration list --project-ref "$SUPABASE_PROJECT_REF" 2>&1)" || {
  echo "$listing" >&2
  echo "Could not read the remote migration history." >&2
  exit 1
}

echo "$listing"

# `supabase migration list` prints LOCAL | REMOTE | TIME. A row with one side
# blank is drift. The pipe-delimited shape is what the CLI emits; if that
# changes this check fails loudly rather than passing silently.
if ! grep -qE '^\s*Local\s*\|\s*Remote' <<<"$listing"; then
  echo "Unrecognised output from 'supabase migration list' - refusing to report clean." >&2
  exit 1
fi

drift="$(awk -F'|' '
  NR > 2 && NF >= 2 {
    gsub(/[[:space:]]/, "", $1); gsub(/[[:space:]]/, "", $2);
    if ($1 == "" && $2 != "") print "  remote-only: " $2;
    if ($2 == "" && $1 != "") print "  local-only:  " $1;
  }' <<<"$listing")"

if [[ -n "$drift" ]]; then
  echo ""
  echo "❌ Migration drift detected:"
  echo "$drift"
  echo ""
  echo "   A remote-only entry means SQL ran that is not in this repo."
  echo "   A local-only entry means a deploy did not finish."
  echo "   Do NOT reach for 'supabase migration repair' - see"
  echo "   docs/RUNBOOK_MIGRATION_DEPLOY.md."
  exit 1
fi

echo ""
echo "✅ No migration drift."
