#!/usr/bin/env node
/**
 * US-237: audit + regression guard for permissive RLS policies.
 *
 * Flags two shapes, both of which default to PUBLIC when no `TO` clause is
 * given and, being PERMISSIVE (policies are OR'd), override any company-scoped
 * policy on the same table:
 *
 *   1. `FOR ALL ... USING (true)` without `TO service_role` — leaks every
 *      tenant's rows to any authenticated user.
 *   2. `... WITH CHECK (true)` without `TO service_role` — lets any client,
 *      including anon, write rows it should not. US-306 found audit_logs open
 *      this way: two INSERT policies named "System can insert audit logs" and
 *      "site_audit_logs_insert", neither scoped, so the audit trail was
 *      forgeable. rate_limit_state was open the same way, meaning a client
 *      could reset the counter throttling it.
 *
 * The naming is what hid this for so long. A policy called "System can ..."
 * reads as service-only and grants PUBLIC unless it says `TO service_role`.
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
// The WITH CHECK (true) shape was only added to this guard with US-306, so it
// carries its own baseline: the historical backlog is listed for visibility,
// and only migrations after the two US-306 remediations fail. Several of the
// backlog entries are deliberate public-write endpoints (lead capture, demo
// requests, unsubscribe, calculator sessions) and must NOT be closed blindly.
const WRITE_BASELINE = '20260827090000';

const files = readdirSync(DIR).filter((f) => f.endsWith('.sql')).sort();
const re = /CREATE\s+POLICY\s+("[^"]+"|\S+)\s+ON\s+(\S+)([\s\S]*?);/gi;

const violations = [];
const writeViolations = [];
for (const f of files) {
  const txt = readFileSync(join(DIR, f), 'utf8');
  let m;
  while ((m = re.exec(txt))) {
    const body = m[3].toLowerCase();
    // AS RESTRICTIVE policies are AND'd with the permissive ones rather than
    // OR'd, so they can only ever narrow access. `USING (true)` on a
    // restrictive policy is a no-op for reads, not a grant - the deny lives in
    // its WITH CHECK. Flagging them would push authors towards dropping the
    // very policies that close these holes (US-306).
    if (/as\s+restrictive/.test(body)) continue;
    const scoped = /to\s+service_role/.test(body);
    const entry = {
      file: f,
      table: m[2].replace(/"/g, '').split('.').pop(),
      policy: m[1].replace(/"/g, ''),
    };
    if (/for\s+all/.test(body) && /using\s*\(\s*true\s*\)/.test(body) && !scoped) {
      violations.push(entry);
    } else if (/with\s+check\s*\(\s*true\s*\)/.test(body) && !scoped) {
      writeViolations.push(entry);
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
const newWriteViolations = writeViolations.filter((v) => ts(v.file) > WRITE_BASELINE);

console.log(
  `\nRLS open-write audit (US-306): ${writeViolations.length} historical "WITH CHECK (true)" policies without TO service_role`,
);
for (const v of writeViolations) {
  console.log(`  ${v.table}  \u00ab${v.policy}\u00bb  ${v.file}`);
}

if (newWriteViolations.length > 0) {
  console.error(
    `\n\u274c ${newWriteViolations.length} NEW permissive "WITH CHECK (true)" policy/policies without TO service_role (after baseline ${WRITE_BASELINE}):`,
  );
  for (const v of newWriteViolations) console.error(`   ${v.table} \u00ab${v.policy}\u00bb ${v.file}`);
  console.error(
    '\nA policy with no TO clause grants PUBLIC, including anon. Scope it TO service_role,',
  );
  console.error(
    'give it a real WITH CHECK predicate, or - if the write is genuinely public (lead capture,',
  );
  console.error('unsubscribe) - say so in a comment on the policy so the next reader does not have to guess.');
  process.exit(1);
}

console.log(`\n✅ No new permissive "FOR ALL USING(true)" policies (baseline ${BASELINE}).`);
console.log(`✅ No new permissive "WITH CHECK (true)" policies (baseline ${WRITE_BASELINE}).`);
