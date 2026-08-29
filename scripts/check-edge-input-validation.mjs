#!/usr/bin/env node
/**
 * Edge-function input-validation guard (US-241).
 *
 * CLAUDE.md's Security rule 2: validate all inputs with Zod. A function that
 * reads req.json() without a schema hands unvalidated attacker-controlled JSON
 * to Postgres.
 *
 * This counts functions that call req.json() but never run it through a Zod
 * schema, and fails if the count grows or a new name appears. VALIDATED is the
 * set already converted — it only ever grows. UNVALIDATED is the backlog — it
 * only ever shrinks.
 *
 * Converting a function means:
 *   const parsed = await validateBody(req, MySchema, { name: 'my-fn' });
 *   if (!parsed.ok) return parsed.response;
 * See supabase/functions/_shared/validate-body.ts for the report/enforce
 * staging — schemas ship in report mode first so an older client that sends an
 * unexpected shape is logged rather than rejected.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const fnDir = join(root, 'supabase', 'functions');

const READS_BODY = /\b(?:req|request)\s*\.\s*json\s*\(\s*\)/;
const USES_HELPER = /\bvalidateBody\s*\(|\bvalidateRequest\s*\(/;
const HAS_SCHEMA = /\bz\s*\.\s*object\s*\(|\bz\s*\.\s*discriminatedUnion\s*\(|\bz\s*\.\s*union\s*\(/;

const stripComments = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');

// A function is validated if it routes its body through a helper or parses it
// with a Zod schema. A converted function stops calling req.json() directly —
// validateBody() reads it — so the backlog is "still reads the body raw".
const validated = [];
const unvalidated = [];
for (const d of readdirSync(fnDir, { withFileTypes: true })) {
  if (!d.isDirectory() || d.name === '_shared') continue;
  const idx = join(fnDir, d.name, 'index.ts');
  if (!existsSync(idx)) continue;
  const src = stripComments(readFileSync(idx, 'utf8'));
  const takesBody = READS_BODY.test(src) || USES_HELPER.test(src);
  if (!takesBody) continue;
  if (USES_HELPER.test(src) || HAS_SCHEMA.test(src)) validated.push(d.name);
  else unvalidated.push(d.name);
}
const reads = [...validated, ...unvalidated];

// Functions already converted. Never remove a name from here.
const VALIDATED = new Set([
  'analyze-support-ticket',
  'schedule-trial-emails',
  'track-usage',
  'billing-automation',
  'manage-complimentary-subscription',
  'process-referral-signup',
  'handle-chargeback',
  'change-orders', 'change-subscription', 'create-stripe-checkout', 'disable-mfa',
  'dos-protection', 'execute-workflow', 'generate-invoice', 'geofencing',
  'invite-team-member', 'process-invoice-payment', 'projects', 'reset-password-otp',
  'send-auth-otp', 'send-notification', 'setup-mfa', 'signup-with-otp',
  'sso-ldap-auth', 'sso-manage', 'sso-oauth-init', 'sso-saml-init',
  'time-tracking', 'verify-auth-otp', 'verify-mfa-login', 'verify-mfa-setup',
]);
const BASELINE = 119;

console.log('Edge-function input-validation guard (US-241)');
console.log(`  functions taking a JSON body:  ${reads.length}`);
console.log(`  with a Zod schema:            ${validated.length}`);
console.log(`  backlog (baseline ${BASELINE}):     ${unvalidated.length}`);

const regressed = [...VALIDATED].filter((n) => unvalidated.includes(n));
if (regressed.length) {
  console.error(`\n✖ These lost their input schema: ${regressed.join(', ')}`);
  process.exit(1);
}

if (unvalidated.length > BASELINE) {
  const added = unvalidated.filter((n) => !VALIDATED.has(n)).slice(-(unvalidated.length - BASELINE));
  console.error(`\n✖ New function(s) read req.json() with no Zod schema. Use validateBody() from _shared/validate-body.ts:`);
  for (const n of added) console.error(`    - ${n}`);
  process.exit(1);
}

if (unvalidated.length < BASELINE) {
  console.error(
    `\n✖ ${BASELINE - unvalidated.length} converted since the baseline, and that has to be ` +
      `locked in: set BASELINE to ${unvalidated.length} in ` +
      `${relative(root, fileURLToPath(import.meta.url))} and add them to VALIDATED.`,
  );
  console.error(
    '  A baseline nobody lowers stops being a gate. US-212 let one drift to 1860 against a real ' +
      'count of 669 - permitting 1191 new errors - precisely because a count below it only ' +
      'printed a suggestion.',
  );
  process.exit(1);
}

console.log(`\n✔ No new unvalidated request bodies (${unvalidated.length} in the backlog).`);
