#!/usr/bin/env node
/**
 * Edge-function auth guard (US-198).
 *
 * Supabase enforces a valid JWT for functions with verify_jwt = true (the
 * default). Functions set to verify_jwt = false in supabase/config.toml bypass
 * that platform check, so each must either be genuinely public (and verify its
 * own caller — e.g. a Stripe signature) or apply its own auth guard
 * (initializeAuthContext / withAuth / requireSystemOrAdmin).
 *
 * This script:
 *   - parses config.toml for verify_jwt = false functions,
 *   - classifies each as PUBLIC (allowlisted), GUARDED (calls a guard), or
 *     NEEDS_GUARD,
 *   - FAILS (exit 1) if any function in ENFORCED regresses to NEEDS_GUARD,
 *   - WARNS (exit 0) for the remaining NEEDS_GUARD backlog.
 *
 * As functions are hardened, move them into ENFORCED so they can't regress.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const fnDir = join(root, 'supabase', 'functions');
const configPath = join(root, 'supabase', 'config.toml');

// Genuinely public functions: they verify their own caller (webhook signature,
// OAuth state, a dedicated secret) or are intentionally anonymous endpoints.
const PUBLIC_ALLOWLIST = new Set([
  'stripe-webhook',          // Stripe signature verification
  'gsc-oauth-callback',
  'google-calendar-callback',
  'outlook-calendar-callback',
  'webhook-verify',
  'api-auth',                // issues/validates API auth
  'create-root-admin',       // gated by ADMIN_CREATION_SECRET
  'email-unsubscribe',       // public one-click link
  'capture-lead',            // public marketing form
  'handle-demo-request',     // public marketing form
  'handle-sales-contact',    // public marketing/sales form
  'track-referral',          // public referral-tracking pixel/endpoint
  'process-referral-signup', // public signup-flow referral attribution
]);

// Substrings whose presence indicates the function applies its own guard.
const GUARD_TOKENS = [
  'initializeAuthContext',
  'requireSystemOrAdmin',
  'withAuth(',
  'constructEvent(',        // Stripe signature verification
  'verifyApiKey',
  'ADMIN_CREATION_SECRET',
  'CRON_SECRET',
];

// Functions we have hardened — a regression here fails CI.
const ENFORCED = new Set([
  'dos-protection',
  'calculate-health-scores',
  // US-198 cron/system sweep — all now apply requireSystemOrAdmin + scoped CORS.
  'check-renewal-notifications',
  'cron-social-scheduler',
  'enhanced-blog-ai-fixed',
  'process-behavioral-triggers',
  'process-blog-generation-queue',
  'process-dsar-fulfillment',
  'process-dunning',
  'process-expiring-complimentary',
  'process-funnel-queue',
  'run-scheduled-audit',
  'schedule-custom-reports',
  'schedule-trial-emails',
  'send-renewal-notification',
  'send-scheduled-emails',
  'trial-management',
  // User-authenticated (initializeAuthContext) functions whose CORS was also
  // tightened off wildcard in the US-198 sweep.
  'blog-ai',
  'payment-reminders',
  'send-intervention-email',
]);

// Wildcard CORS literals that must NOT appear in a non-public function.
const WILDCARD_CORS = [
  `"Access-Control-Allow-Origin": "*"`,
  `'Access-Control-Allow-Origin': '*'`,
];

const config = readFileSync(configPath, 'utf8');
// Match [functions.NAME] ... verify_jwt = false blocks.
const noJwt = new Set();
const re = /\[functions\.([a-z0-9-_]+)\]([^[]*)/gi;
let m;
while ((m = re.exec(config)) !== null) {
  const name = m[1];
  if (/verify_jwt\s*=\s*false/.test(m[2])) noJwt.add(name);
}

const guarded = [];
const publicFns = [];
const needsGuard = [];
const corsViolations = [];

for (const name of [...noJwt].sort()) {
  if (PUBLIC_ALLOWLIST.has(name)) { publicFns.push(name); continue; }
  const idx = join(fnDir, name, 'index.ts');
  const src = existsSync(idx) ? readFileSync(idx, 'utf8') : '';
  if (GUARD_TOKENS.some((t) => src.includes(t))) guarded.push(name);
  else needsGuard.push(name);
  // Non-public functions must not ship a wildcard CORS origin.
  if (WILDCARD_CORS.some((t) => src.includes(t))) corsViolations.push(name);
}

console.log(`Edge-function auth guard (US-198)`);
console.log(`  verify_jwt=false functions: ${noJwt.size}`);
console.log(`  public (allowlisted):       ${publicFns.length}`);
console.log(`  guarded:                    ${guarded.length}`);
console.log(`  needs guard (backlog):      ${needsGuard.length}`);
console.log(`  wildcard-CORS violations:   ${corsViolations.length}`);

const regressions = [...ENFORCED].filter((n) => needsGuard.includes(n));
// CORS is only enforced on functions we have hardened (ENFORCED); legacy
// backlog functions are reported but don't fail until they're hardened.
const enforcedCorsViolations = corsViolations.filter((n) => ENFORCED.has(n));

if (needsGuard.length) {
  console.log(`\n  Backlog (verify_jwt=false, no guard yet) — harden with requireSystemOrAdmin:`);
  for (const n of needsGuard) console.log(`    - ${n}`);
}

let failed = false;

if (regressions.length) {
  console.error(`\n✖ ENFORCED functions regressed (must be guarded): ${regressions.join(', ')}`);
  failed = true;
}

if (enforcedCorsViolations.length) {
  console.error(`\n✖ ENFORCED functions ship wildcard CORS (use getCorsHeaders): ${enforcedCorsViolations.join(', ')}`);
  failed = true;
}

if (failed) process.exit(1);

console.log(`\n✔ No regressions in ENFORCED set (${ENFORCED.size} functions guarded, scoped CORS).`);
