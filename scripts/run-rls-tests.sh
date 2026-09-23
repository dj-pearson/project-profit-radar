#!/usr/bin/env bash
# Run supabase/tests/rls/*.test.sql against a throwaway local Postgres.
#
# Each test file gets a fresh database with supabase/tests/rls/_bootstrap.sql
# applied, so files cannot leak state into each other. Needs the Postgres
# server binaries (initdb, pg_ctl); set PG_BIN if they are not on PATH.
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

fail=0
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
