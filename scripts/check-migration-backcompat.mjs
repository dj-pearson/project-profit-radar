#!/usr/bin/env node
/**
 * US-250: backward-compatibility guard for migrations.
 *
 * CLAUDE.md forbids single-release tightening/destructive schema changes on
 * columns/tables a client at MIN_SUPPORTED_*_VERSION still uses:
 *   - ALTER COLUMN ... SET NOT NULL   (older writes that omit it start failing)
 *   - DROP COLUMN / DROP TABLE        (older readers break)
 *   - RENAME COLUMN / RENAME TO       (no client knows the new name yet)
 * These must be split across ≥2 releases (add nullable + dual-write → backfill →
 * enforce). A change on a table CREATEd in the SAME migration is exempt (it is
 * brand new, so no deployed client depends on it).
 *
 * All historical violations are listed for visibility, but only migrations
 * newer than BASELINE fail (exit 1) — the pre-existing backlog is grandfathered
 * while regressions are blocked.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(root, 'supabase', 'migrations');
const BASELINE = '20260712130000';

const RISKY = [
  { re: /\bset\s+not\s+null\b/i, kind: 'SET NOT NULL' },
  { re: /\bdrop\s+column\b/i, kind: 'DROP COLUMN' },
  { re: /\bdrop\s+table\b/i, kind: 'DROP TABLE' },
  { re: /\brename\s+column\b/i, kind: 'RENAME COLUMN' },
  { re: /\brename\s+to\b/i, kind: 'RENAME TO' },
];

const tableOf = (stmt) => {
  const m = stmt.match(/\b(?:alter|drop)\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?["']?([\w.]+)/i);
  return m ? m[1].replace(/^public\./, '').replace(/["']/g, '') : null;
};

const files = readdirSync(DIR).filter((f) => f.endsWith('.sql')).sort();
const violations = [];

for (const f of files) {
  const sql = readFileSync(join(DIR, f), 'utf8');
  // tables created in this same file are exempt (brand new)
  const created = new Set(
    [...sql.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?["']?([\w.]+)/gi)].map((m) =>
      m[1].replace(/^public\./, '').replace(/["']/g, ''),
    ),
  );
  for (const stmt of sql.split(';')) {
    for (const { re, kind } of RISKY) {
      if (re.test(stmt)) {
        const t = tableOf(stmt) || '(unknown)';
        if (created.has(t)) continue; // new table in same migration
        violations.push({ file: f, kind, table: t });
      }
    }
  }
}

const ts = (f) => (f.match(/^(\d{14})_/) || [])[1] || '00000000000000';
const fresh = violations.filter((v) => ts(v.file) > BASELINE);

console.log(
  `Migration backward-compat audit (US-250): ${violations.length} historical tightening/destructive statements on pre-existing tables`,
);
for (const v of violations) console.log(`  ${v.kind.padEnd(14)} ${v.table.padEnd(32)} ${v.file}`);

if (fresh.length) {
  console.error(`\n❌ ${fresh.length} NEW backward-incompatible statement(s) after baseline ${BASELINE}:`);
  for (const v of fresh) console.error(`   ${v.kind} on ${v.table}  ${v.file}`);
  console.error('\nSplit across releases: add nullable + dual-write → backfill → enforce/drop later.');
  process.exit(1);
}
console.log(`\n✅ No new backward-incompatible migrations (baseline ${BASELINE}).`);
