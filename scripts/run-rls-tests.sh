#!/usr/bin/env bash
# Run supabase/tests/rls/*.test.sql against a throwaway local Postgres.
#
# Each test file gets a fresh database with supabase/tests/rls/_bootstrap.sql
# applied, so files cannot leak state into each other. Needs the Postgres
# server binaries (initdb, pg_ctl); set PG_BIN if they are not on PATH.
#
# supabase/tests/rls/replayed/*.test.sql run against the schema the migrations
# actually build (US-394): replayed/_supabase.sql stands in for the platform,
# then every file in supabase/migrations is applied into one template database
# and each test gets a clone of it. See replay_migrations below for how files
# that do not apply are handled.
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
dir="$root/supabase/tests/rls"

if [ -z "${PG_BIN:-}" ]; then
  if command -v initdb >/dev/null 2>&1; then PG_BIN="$(dirname "$(command -v initdb)")"
  else PG_BIN="$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)"; fi
fi
[ -x "$PG_BIN/initdb" ] || { echo "initdb not found; set PG_BIN" >&2; exit 2; }

tmp="$(mktemp -d)"
cleanup() { "$PG_BIN/pg_ctl" -D "$tmp/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$tmp"; }
trap cleanup EXIT

# initdb refuses to run as root.
run() { if [ "$(id -u)" = 0 ]; then su postgres -s /bin/bash -c "$*"; else bash -c "$*"; fi; }
[ "$(id -u)" = 0 ] && chown postgres "$tmp"

run "'$PG_BIN/initdb' -D '$tmp/data' -U postgres -A trust >/dev/null"
run "'$PG_BIN/pg_ctl' -D '$tmp/data' -o \"-k $tmp -c listen_addresses=''\" -l '$tmp/log' -w start >/dev/null"

psql_() { psql -h "$tmp" -U postgres -X -q -v ON_ERROR_STOP=1 "$@"; }

# Migrations that do not apply to a database built from the repo alone
# (US-248: tables typed into the production SQL editor, ALTER before CREATE,
# policies that already exist). The number may fall, never rise: a new
# migration that does not replay would silently drop out of every replayed
# test. When it falls, lower it here.
MAX_UNAPPLIED_MIGRATIONS=138

# Apply every migration, each in its own transaction the way supabase db push
# does (CREATE INDEX CONCURRENTLY files run outside one, as they must), then
# retry the failures in order until a pass makes no progress. The retry is for
# the backdated files: 20250115* and 20250202* sort before the tables they
# alter but were applied after them. A retried file lands after everything
# that followed it, though, so it can reinstate a policy a later migration
# replaced; a final settle pass runs the whole directory once more in order so
# the latest definition wins again (files that are not re-runnable fail and
# roll back, changing nothing). A file that fails is rolled back whole, never
# half-applied. pg_cron, pg_net and pgsodium are not in stock Postgres; their
# CREATE EXTENSION lines are dropped and _supabase.sql stubs what the
# migrations call.
apply_migration() {  # db file -> exit status; the first ERROR line on stdout
  local one=-1 err
  grep -qi 'concurrently' "$2" && one=
  sed -E 's/^[[:space:]]*CREATE EXTENSION IF NOT EXISTS (pg_cron|pg_net|pgsodium)[^;]*;/-- (stripped by run-rls-tests.sh)/I' "$2" > "$tmp/cur.sql"
  err="$(psql_ -d "$1" $one -f "$tmp/cur.sql" 2>&1 >/dev/null)" && return 0
  echo "$err" | grep -m1 'ERROR' | sed -E 's/.*ERROR: +//'
  return 1
}

replay_migrations() {
  local db="$1" todo="$tmp/todo" next="$tmp/next" errs="$tmp/replay-errors" f err n
  psql_ -d "$db" -f "$dir/replayed/_supabase.sql" >/dev/null 2>&1 || { psql_ -d "$db" -f "$dir/replayed/_supabase.sql"; return 1; }
  ls "$root"/supabase/migrations/*.sql > "$todo"
  while :; do
    : > "$next"; : > "$errs"
    while read -r f; do
      if ! err="$(apply_migration "$db" "$f")"; then
        echo "$f" >> "$next"
        echo "  $(basename "$f"): $err" >> "$errs"
      fi
    done < "$todo"
    cmp -s "$todo" "$next" && break
    cp "$next" "$todo"
  done
  for f in "$root"/supabase/migrations/*.sql; do apply_migration "$db" "$f" >/dev/null || true; done
  psql_ -d "$db" -f "$dir/replayed/_helpers.sql" >/dev/null
  n="$(wc -l < "$next")"
  echo "replayed $(ls "$root"/supabase/migrations/*.sql | wc -l) migrations; $n did not apply (ceiling $MAX_UNAPPLIED_MIGRATIONS)"
  if [ "$n" -gt "$MAX_UNAPPLIED_MIGRATIONS" ] || [ -n "${RLS_REPLAY_VERBOSE:-}" ]; then cat "$errs"; fi
  if [ "$n" -gt "$MAX_UNAPPLIED_MIGRATIONS" ]; then
    echo "FAIL more migrations fail to replay than before; the new failure is in the list above" >&2
    return 1
  fi
}

fail=0
if compgen -G "$dir/replayed/*.test.sql" >/dev/null; then
  psql_ -d postgres -c "CREATE DATABASE rls_replay" >/dev/null
  if replay_migrations rls_replay; then
    for f in "$dir"/replayed/*.test.sql; do
      db="r_$(basename "$f" .test.sql | tr -c 'a-z0-9_\n' '_')"
      psql_ -d postgres -c "CREATE DATABASE $db TEMPLATE rls_replay" >/dev/null
      if out="$(cd "$root" && psql_ -d "$db" -f "$f" 2>&1)"; then
        echo "PASS replayed/$(basename "$f")"
        echo "$out" | grep -o 'ok - .*' | sed 's/^/  /'
      else
        echo "FAIL replayed/$(basename "$f")"
        echo "$out" | sed 's/^/  /'
        fail=1
      fi
    done
  else
    fail=1
  fi
fi

for f in "$dir"/*.test.sql; do
  db="t_$(basename "$f" .test.sql | tr -c 'a-z0-9_\n' '_')"
  psql_ -d postgres -c "CREATE DATABASE $db" >/dev/null
  if psql_ -d "$db" -f "$dir/_bootstrap.sql" >/dev/null && \
     out="$(cd "$root" && psql_ -d "$db" -f "$f" 2>&1)"; then
    echo "PASS $(basename "$f")"
    echo "$out" | grep -o 'ok - .*' | sed 's/^/  /'
  else
    echo "FAIL $(basename "$f")"
    echo "$out" | sed 's/^/  /'
    fail=1
  fi
done
exit $fail
