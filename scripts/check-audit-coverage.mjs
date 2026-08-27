#!/usr/bin/env node
/**
 * Audit-trail coverage guard (US-244).
 *
 * CLAUDE.md Security rule 4: log critical actions to the audit trail. This
 * tracks which edge functions performing critical mutations actually write one,
 * and fails if a covered function loses its audit call.
 *
 * CRITICAL is the list of functions whose actions a dispute, a SOC2 review or
 * an incident post-mortem would ask about: money moving, credentials being
 * minted or replaced, access being granted, security being downgraded, data
 * being deleted. Add to it as more are identified; only remove a name when the
 * function itself goes away.
 *
 * The writer is _shared/audit-log.ts. It discovers the audit_logs column shape
 * at runtime and never throws, because audit_logs has three competing CREATE
 * TABLE definitions in the migration history and an insert with the wrong shape
 * would otherwise break the very mutation it is recording.
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const FN = join(root, 'supabase', 'functions');

// Functions whose critical actions must reach the audit trail.
const CRITICAL = new Map([
  ['process-refund', 'money leaving the business'],
  ['handle-chargeback', 'forfeiting a dispute'],
  ['store-stripe-keys', 'replacing payment credentials'],
  ['api-management', 'minting an API credential'],
  ['invite-team-member', 'granting company access at a chosen role'],
  ['disable-mfa', 'downgrading account security'],
  // Instrumented 2026-08-27. Two of these have no session user — create-root-admin
  // is gated by ADMIN_CREATION_SECRET and process-dsar-fulfillment runs from cron
  // — so their rows carry a null actor and say so in the description.
  ['data-subject-delete', 'erasing a subject\'s data (GDPR)'],
  ['process-dsar-fulfillment', 'fulfilling a data-subject request'],
  ['create-root-admin', 'creating a platform superuser'],
  ['change-subscription', 'changing what a customer pays'],
  ['manage-complimentary-subscription', 'granting a free subscription'],
  ['process-invoice-payment', 'taking a payment'],
]);

const WRITES_AUDIT = /\bwriteAuditLog\s*\(|from\(\s*['"]audit_logs['"]\s*\)/;

const covered = [];
const missing = [];
const gone = [];
for (const [name, why] of CRITICAL) {
  const idx = join(FN, name, 'index.ts');
  if (!existsSync(idx)) { gone.push(name); continue; }
  (WRITES_AUDIT.test(readFileSync(idx, 'utf8')) ? covered : missing).push({ name, why });
}

// Anything else already writing the trail, for visibility.
const extra = readdirSync(FN, { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name !== '_shared' && !CRITICAL.has(d.name))
  .filter((d) => existsSync(join(FN, d.name, 'index.ts')))
  .filter((d) => WRITES_AUDIT.test(readFileSync(join(FN, d.name, 'index.ts'), 'utf8')))
  .map((d) => d.name);

const BASELINE_COVERED = 12;

console.log('Audit-trail coverage guard (US-244)');
console.log(`  critical functions tracked: ${CRITICAL.size}`);
console.log(`  instrumented:               ${covered.length} (baseline ${BASELINE_COVERED})`);
console.log(`  still to instrument:        ${missing.length}`);
console.log(`  other functions logging:    ${extra.length}${extra.length ? ` (${extra.join(', ')})` : ''}`);

if (missing.length) {
  console.log('\n  Backlog:');
  for (const m of missing) console.log(`    - ${m.name}: ${m.why}`);
}

if (gone.length) {
  console.error(`\n✖ Tracked function(s) no longer exist — update CRITICAL in ${relative(root, fileURLToPath(import.meta.url))}: ${gone.join(', ')}`);
  process.exit(1);
}

if (covered.length < BASELINE_COVERED) {
  const lost = [...CRITICAL.keys()].filter((n) => missing.some((m) => m.name === n)).slice(0, CRITICAL.size);
  console.error(`\n✖ Audit coverage regressed: ${covered.length} instrumented, baseline is ${BASELINE_COVERED}.`);
  console.error(`  Check these for a removed writeAuditLog(): ${lost.join(', ')}`);
  process.exit(1);
}

if (covered.length > BASELINE_COVERED) {
  console.log(`\n  ${covered.length - BASELINE_COVERED} newly instrumented — raise BASELINE_COVERED to ${covered.length}.`);
}

console.log(`\n✔ No audit-coverage regression (${covered.length}/${CRITICAL.size} critical functions instrumented).`);
