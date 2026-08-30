#!/usr/bin/env node
/**
 * Guard: an endpoint anyone can reach must not write to the database unthrottled.
 *
 * check-rate-limit-coverage (US-243) asks a different question - which functions
 * SPEND MONEY per call, a model provider or an SMS - and all of those are
 * covered. It was never asked about unauthenticated writes, so three public
 * marketing endpoints wrote 5, 5 and 2 rows per request with no ceiling while
 * capture-lead, reached from the same forms, had limited by IP since it was
 * written. Anyone with a loop could fill the leads, demo_requests,
 * sales_contact_requests and referral tables.
 *
 * Scope is the PUBLIC_BY_DESIGN set in check-unauthenticated-edge-functions.mjs,
 * read from that file so the two lists cannot drift apart. If a function is
 * anonymous and it writes, it needs a limit.
 *
 * The OAuth and SAML callbacks are exempt, and the reason is not that they are
 * safe - it is that a per-IP ceiling is the wrong instrument for them. A
 * callback is entered by redirect from the identity provider, so a company
 * behind one NAT can legitimately produce a burst of them, and 10/min/IP would
 * lock out real users mid-login. They are protected instead by the state or
 * code they verify, which an attacker cannot forge. If they ever need
 * throttling it should be keyed on something other than the client IP.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const FUNCTIONS = join(root, 'supabase', 'functions');

/** Anonymous writers exempt from an IP ceiling, each with why. */
const EXEMPT = new Map([
  ['google-calendar-callback', 'OAuth callback, entered by redirect from Google. Verifies the OAuth state; an IP ceiling would break a company behind one NAT mid-login.'],
  ['outlook-calendar-callback', 'OAuth callback from Microsoft. Same reasoning as the Google one.'],
  ['gsc-oauth-callback', 'Search Console OAuth callback. Same reasoning.'],
  ['sso-oauth-callback', 'SSO OAuth callback, verifies the pending state row it issued. Throttling by IP would lock out an office logging in together.'],
  ['sso-saml-callback', 'SAML assertion consumer, verifies the signed assertion and the pending request. Same reasoning.'],
  ['sso-saml-init', 'Starts the SAML redirect and writes one pending-request row. Entered from the login page; throttling by IP hits shared-NAT offices first.'],
  ['verify-domain', 'Writes the result of a DNS TXT lookup it performs itself. The work is bounded by DNS, not by the caller, and the row is keyed to a domain the caller must already control.'],
]);

const WRITE = /\.(insert|update|upsert|delete)\s*\(/g;
// checkRateLimits (plural) is api-auth's own per-API-key limiter - per minute,
// hour and day against the key rather than the IP, which is the right
// instrument for a key endpoint and stricter than the shared helper. Matching
// only the singular name reported it as unthrottled on the first run.
const LIMITED = /checkRateLimits?\s*\(|enforceRateLimit\s*\(/;

const guardSrc = readFileSync(join(root, 'scripts', 'check-unauthenticated-edge-functions.mjs'), 'utf8');
const start = guardSrc.indexOf('const PUBLIC_BY_DESIGN');
const end = guardSrc.indexOf(']);', start);
if (start === -1 || end === -1) {
  console.error('✖ Could not read PUBLIC_BY_DESIGN out of check-unauthenticated-edge-functions.mjs.');
  console.error('  That list is this guard\'s scope - fix the parser before trusting a pass.');
  process.exit(1);
}
const anonymous = [...guardSrc.slice(start, end).matchAll(/'([a-z0-9-]+)'/g)].map((m) => m[1]);
if (anonymous.length < 10) {
  console.error(`✖ Only ${anonymous.length} anonymous functions parsed - the list moved. Fix the parser.`);
  process.exit(1);
}

const offenders = [];
for (const name of anonymous) {
  const file = join(FUNCTIONS, name, 'index.ts');
  if (!existsSync(file)) continue;
  const src = readFileSync(file, 'utf8');
  const writes = (src.match(WRITE) || []).length;
  if (writes === 0 || LIMITED.test(src)) continue;
  offenders.push({ name, writes, exempt: EXEMPT.has(name) });
}

const unexpected = offenders.filter((o) => !o.exempt);
const stale = [...EXEMPT.keys()].filter((n) => !offenders.some((o) => o.name === n));

console.log('Anonymous-write guard (US-241 follow-up)');
console.log(`  anonymous functions:        ${anonymous.length}`);
console.log(`  of those, write unthrottled: ${offenders.length} (${EXEMPT.size} exempt with a reason)`);
for (const o of offenders) console.log(`    [${o.exempt ? 'exempt' : 'NEW'}] ${o.name} (${o.writes} write${o.writes > 1 ? 's' : ''})`);

if (unexpected.length) {
  console.error('\n✖ These are reachable by anyone and write to the database with no rate limit:');
  for (const o of unexpected) console.error(`    ${o.name} - ${o.writes} write(s)`);
  console.error('\n  Add checkRateLimit with RATE_LIMITS.AUTH, keyed on getClientIP, before the');
  console.error('  first write - capture-lead is the worked example. If an IP ceiling is the');
  console.error('  wrong instrument (a provider redirect, say), add it to EXEMPT with the reason.');
  process.exit(1);
}

if (stale.length) {
  console.error(`\n✖ ${stale.length} exemption(s) no longer needed: ${stale.join(', ')}`);
  console.error('  Remove them from EXEMPT - the list only shrinks.');
  process.exit(1);
}

console.log(`\n✔ Every anonymous writer is throttled or exempt with a reason.`);
