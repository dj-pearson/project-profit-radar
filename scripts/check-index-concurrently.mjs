#!/usr/bin/env node
/**
 * US-249: guard that new indexes on pre-existing tables use CONCURRENTLY.
 *
 * A plain `CREATE INDEX` takes a lock that blocks writes on the table for the
 * whole build — on a large production table (projects, time_entries, deals)
 * that stalls requests. CREATE INDEX CONCURRENTLY builds without the write
 * lock. CLAUDE.md prescribes it; the DB audit found 0 of ~1900 index statements
 * using it.
 *
 * Exemptions: the statement is CONCURRENTLY, OR the target table is CREATEd in
 * the same migration (brand new → no traffic to block).
 *
 * Historical statements are listed for visibility; only migrations newer than
 * BASELINE fail (exit 1), grandfathering the backlog while blocking regressions.
 *
 * NOTE: CREATE INDEX CONCURRENTLY cannot run inside a transaction block, so such
 * a migration must not be wrapped in BEGIN/COMMIT.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(root, 'supabase', 'migrations');
const BASELINE = '20260712130000';

const files = readdirSync(DIR).filter((f) => f.endsWith('.sql')).sort();
const violations = [];

/**
 * Comments are not statements. Without this, a migration that EXPLAINS why it
 * does or does not build an index is reported as building one: the regex below
 * matches `CREATE INDEX` in prose and then scans forward past it to the `ON`
 * of the real, already-CONCURRENTLY statement. Two migrations tripped this on
 * the same day, and the workaround - rewording the comment - is the wrong way
 * round, since it makes the guard shape what people are allowed to write down.
 *
 * Strips `-- line` comments and block comments, leaving string literals alone
 * (an index name or a partial-index predicate can legitimately contain '--').
 */
function stripSqlComments(sql) {
  let out = '';
  let i = 0;
  let quote = null; // "'" or '"' while inside a literal or quoted identifier
  while (i < sql.length) {
    const c = sql[i];
    const next = sql[i + 1];
    if (quote) {
      out += c;
      if (c === quote) quote = sql[i + 1] === quote ? quote : null;
      i += 1;
      continue;
    }
    if (c === "'" || c === '"') {
      quote = c;
      out += c;
      i += 1;
      continue;
    }
    if (c === '-' && next === '-') {
      while (i < sql.length && sql[i] !== '\n') i += 1;
      continue;
    }
    if (c === '/' && next === '*') {
      i += 2;
      while (i < sql.length && !(sql[i] === '*' && sql[i + 1] === '/')) i += 1;
      i += 2;
      continue;
    }
    out += c;
    i += 1;
  }
  return out;
}

for (const f of files) {
  const sql = stripSqlComments(readFileSync(join(DIR, f), 'utf8'));
  const created = new Set(
    [...sql.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?["']?([\w.]+)/gi)].map((m) =>
      m[1].replace(/^public\./, '').replace(/["']/g, ''),
    ),
  );
  for (const stmt of sql.split(';')) {
    const m = stmt.match(/create\s+(?:unique\s+)?index\s+(concurrently\s+)?(?:if\s+not\s+exists\s+)?[\s\S]*?\bon\s+(?:public\.)?["']?([\w.]+)/i);
    if (!m) continue;
    if (m[1]) continue; // CONCURRENTLY present
    const table = m[2].replace(/^public\./, '').replace(/["']/g, '');
    if (created.has(table)) continue; // new table in same migration
    violations.push({ file: f, table });
  }
}

const ts = (f) => (f.match(/^(\d{14})_/) || [])[1] || '00000000000000';
const fresh = violations.filter((v) => ts(v.file) > BASELINE);

console.log(
  `Index-CONCURRENTLY audit (US-249): ${violations.length} historical non-concurrent CREATE INDEX on pre-existing tables`,
);
// summarize by table to keep output bounded
const byTable = {};
for (const v of violations) byTable[v.table] = (byTable[v.table] || 0) + 1;
for (const [t, n] of Object.entries(byTable).sort((a, b) => b[1] - a[1]).slice(0, 20)) {
  console.log(`  ${String(n).padStart(3)}  ${t}`);
}

if (fresh.length) {
  console.error(`\n❌ ${fresh.length} NEW non-concurrent CREATE INDEX on pre-existing tables after baseline ${BASELINE}:`);
  for (const v of fresh) console.error(`   ${v.table}  ${v.file}`);
  console.error('\nUse CREATE INDEX CONCURRENTLY IF NOT EXISTS (outside a transaction) on existing tables.');
  process.exit(1);
}
console.log(`\n✅ No new non-concurrent indexes on pre-existing tables (baseline ${BASELINE}).`);
