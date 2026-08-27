#!/usr/bin/env node
/**
 * US-296 AC2: nothing that grants access may be built from Math.random().
 *
 * Math.random() is not a CSPRNG. V8 implements it as xorshift128+, whose
 * internal state can be recovered from a small number of consecutive outputs -
 * so anything derived from it is predictable to someone who can observe or
 * brute-force a little of the sequence.
 *
 * What this found when it was written:
 *
 *   WebhookManagement.tsx  the webhook SIGNING SECRET, on a live admin page.
 *                          That secret is the only thing distinguishing a real
 *                          delivery from a forged one.
 *   useSecurity.ts         generateBackupCodes() and generateTOTPSecret().
 *   MFASetupDialog.tsx     ten "backup codes" shown to the user as recovery
 *   TwoFactorAuth.tsx      codes, never sent to the server, authenticating
 *                          nothing. Both files are now deleted.
 *
 * Use src/lib/security/secureRandom.ts, which draws from crypto.getRandomValues
 * and rejection-samples so the alphabet stays unbiased.
 *
 * Deliberately narrow: Math.random() for jitter, animation, retry backoff or a
 * demo value is fine and common, so this fires only when the value is named
 * like a credential or is being assigned to one.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ROOTS = [join(root, 'src'), join(root, 'supabase', 'functions')];

const files = [];
const walk = (d) => {
  for (const e of readdirSync(d)) {
    const f = join(d, e);
    if (statSync(f).isDirectory()) walk(f);
    else if (/\.(ts|tsx)$/.test(f) && !/\.(test|spec)\./.test(f)) files.push(f);
  }
};
for (const r of ROOTS) walk(r);

/** Identifiers whose value is a credential. */
const CREDENTIAL = /(secret|token|backupcode|backup_code|recoverycode|recovery_code|apikey|api_key|password|passphrase|nonce|salt|otp|totp|privatekey|private_key|sessionid|session_id|csrf)/i;

/**
 * Correlation ids that merely LOOK like credentials.
 *
 * `session_id` is the ambiguous one: a session token authenticates, an
 * analytics session id only groups events. The pattern deliberately still
 * matches both - it is better to require a written exemption than to loosen the
 * pattern and miss a real session token. Each entry says why it is not a
 * credential; anything added here without a reason is the reason this list
 * exists.
 */
const ALLOWED = new Map([
  [
    'src/components/legal/CookieConsentManager.tsx:200',
    'analytics session id - groups consent events, grants nothing',
  ],
  [
    'src/lib/consent/consentStore.ts:243',
    'consent session id - correlates a consent record for an anonymous visitor, and is the value the anon RLS policy on consent_ledger keys on for grouping, not for authorisation',
  ],
  [
    'src/lib/profitabilityCalculations.ts:415',
    'calculator run id - a label on a calculation',
  ],
  [
    'src/services/errorLoggingService.ts:61',
    'error correlation id - printed in a toast so a user can quote it to support',
  ],
  [
    'src/utils/realUserMonitoring.ts:72',
    'RUM session id - telemetry grouping',
  ],
  [
    'src/utils/realUserMonitoring.ts:80',
    'RUM session id - telemetry grouping',
  ],
]);

const problems = [];
const allowed = [];
for (const f of files) {
  const rel = relative(root, f).split('\\').join('/');
  const lines = readFileSync(f, 'utf8').split('\n');
  lines.forEach((line, i) => {
    if (!line.includes('Math.random')) return;
    if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;

    // Either the line names a credential, or it is inside a function whose name
    // does. Looking back a few lines catches the multi-line generator shape:
    //   const generateBackupCodes = () => {
    //     codes.push(Math.random()...)
    const context = lines.slice(Math.max(0, i - 6), i + 1).join('\n');
    if (!CREDENTIAL.test(context)) return;

    const key = `${rel}:${i + 1}`;
    if (ALLOWED.has(key)) {
      allowed.push(`${key}  ${ALLOWED.get(key)}`);
      return;
    }
    problems.push(`${key}  ${line.trim().slice(0, 96)}`);
  });
}

console.log('Insecure-random guard (US-296)');
console.log(`  credential values built from Math.random(): ${problems.length}`);
console.log(`  correlation ids exempted with a reason:     ${allowed.length}`);
for (const a of allowed) console.log(`    ${a}`);

const stale = [...ALLOWED.keys()].filter((k) => !allowed.includes(`${k}  ${ALLOWED.get(k)}`));
if (stale.length) {
  console.log(
    `\n  ${stale.length} exemption(s) no longer match a Math.random() line - the code moved or was` +
      ` fixed. Remove from ALLOWED in ${relative(root, fileURLToPath(import.meta.url))}: ${stale.join(', ')}`,
  );
}

if (problems.length) {
  console.error('\n\u2716 Math.random() is being used to build something that grants access:');
  for (const p of problems) console.error(`    ${p}`);
  console.error(
    '\nMath.random() is not a CSPRNG - V8 implements it as xorshift128+ and its state',
  );
  console.error(
    'is recoverable from a handful of outputs, so the value is predictable. Use',
  );
  console.error(
    'secureSecret / secureRecoveryCode / secureTotpSecret from',
  );
  console.error('src/lib/security/secureRandom.ts, or crypto.getRandomValues directly.');
  process.exit(1);
}

console.log('\n\u2714 No credential values built from Math.random().');
