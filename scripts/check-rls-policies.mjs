#!/usr/bin/env node
/**
 * US-237: audit + regression guard for permissive RLS policies.
 *
 * Flags `CREATE POLICY ... FOR ALL ... USING (true)` statements that are NOT
 * scoped `TO service_role`. Such a policy defaults to PUBLIC and, being
 * PERMISSIVE (policies are OR'd), overrides any company-scoped policy on the
 * table and leaks every tenant's rows to any authenticated user.
 *
 * All historical violations are listed for visibility, but only migrations
 * newer than BASELINE fail (exit 1) — the pre-existing backlog is grandfathered
 * (remediated at apply time by the pg_policies migration) while regressions are
 * blocked. As backlog tables are fixed, they drop off the list naturally.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(root, 'supabase', 'migrations');
// Guard introduced with the US-237 remediation migration; new migrations after
// this timestamp must scope permissive FOR ALL policies to service_role.
const BASELINE = '20260712120000';

const files = readdirSync(DIR).filter((f) => f.endsWith('.sql')).sort();
const re = /CREATE\s+POLICY\s+("[^"]+"|\S+)\s+ON\s+(\S+)([\s\S]*?);/gi;

const violations = [];
for (const f of files) {
  const txt = readFileSync(join(DIR, f), 'utf8');
  let m;
  while ((m = re.exec(txt))) {
    const body = m[3].toLowerCase();
    if (/for\s+all/.test(body) && /using\s*\(\s*true\s*\)/.test(body) && !/to\s+service_role/.test(body)) {
      violations.push({
        file: f,
        table: m[2].replace(/"/g, '').split('.').pop(),
        policy: m[1].replace(/"/g, ''),
      });
    }
  }
}

const ts = (f) => (f.match(/^(\d{14})_/) || [])[1] || '00000000000000';
const newViolations = violations.filter((v) => ts(v.file) > BASELINE);

console.log(
  `RLS permissive-policy audit (US-237): ${violations.length} historical "FOR ALL USING(true)" policies without TO service_role`,
);
for (const v of violations) console.log(`  ${v.table}  «${v.policy}»  ${v.file}`);
console.log(
  '\nNote: the remediation migration scopes verified-safe tables at apply time via pg_policies (live state), so this source list over-counts already-fixed policies (e.g. payment_failures).',
);

if (newViolations.length) {
  console.error(
    `\n❌ ${newViolations.length} NEW permissive "FOR ALL USING(true)" policy/policies without TO service_role (after baseline ${BASELINE}):`,
  );
  for (const v of newViolations) console.error(`   ${v.table} «${v.policy}» ${v.file}`);
  console.error('\nScope system/service policies TO service_role, or use a company_id-scoped USING clause.');
  process.exit(1);
}
console.log(`\n✅ No new permissive "FOR ALL USING(true)" policies (baseline ${BASELINE}).`);
