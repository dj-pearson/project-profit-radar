#!/usr/bin/env node
/**
 * Edge-function response-envelope guard (US-274).
 *
 * CLAUDE.md's Conventions section fixes the API response shape at
 * `{ success, data?, error?, timestamp }`, and the iOS app parses against it.
 * Most functions do not produce it: they hand-roll
 * `new Response(JSON.stringify({ ...whatever this endpoint felt like }))`, so
 * the client special-cases dozens of ad-hoc shapes.
 *
 * WHAT THIS CHECKS, AND WHY IT IS NOT "USES successResponse".
 *
 * The obvious guard is "every function calls successResponse/errorResponse".
 * That guard would be wrong, and following it would break the app. Those
 * helpers nest the payload: `{ data: <payload>, success, timestamp }`.
 * check-subscription currently returns `{ subscribed, subscription_tier,
 * subscription_end, billing_period }` at the top level, and both clients read
 * those keys directly. Moving them under `data` REMOVES fields a client at
 * MIN_SUPPORTED_IOS_VERSION reads, which CLAUDE.md's Backward Compatibility
 * section lists under "never do in a single release".
 *
 * So this guard checks the part that is additive and safe today: every JSON
 * response carries `success` and `timestamp` at the top level, alongside
 * whatever it already returns. Adding an optional field to a response is on the
 * "always safe" list. The `data`-nesting half of US-274 is a later release
 * step, once clients read the new shape and the old top-level keys can go.
 *
 * A response is compliant if it is produced by a shared responder
 * (successResponse, errorResponse, rateLimitResponse, and the validate-body
 * path that returns parsed.response) or if its literal object carries both
 * keys.
 *
 * NOT COUNTED: responses that are not JSON at all (redirects, XML sitemaps,
 * plain text), and the provider-webhook acknowledgements in ACK_ONLY below -
 * Stripe and friends specify what a webhook endpoint may return, and wrapping
 * that in our envelope is not ours to decide (AC4).
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const fnDir = join(root, 'supabase', 'functions');

/** Lower as functions are converted. It never goes up. */
const BASELINE = 695;

/**
 * Provider webhooks whose response body the provider specifies (AC4). Stripe
 * reads the status code and ignores the body, but an endpoint that starts
 * answering `{success:false}` on a signature failure is one misreading away
 * from a provider treating it as delivered.
 */
const ACK_ONLY = new Set([
  'stripe-webhook',
  'webhook-verify',
]);

const stripComments = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');

/**
 * Walk from `open` (index of the character after `JSON.stringify(`) to its
 * matching close paren, respecting nesting and string literals. Regex cannot
 * do this: half these bodies contain nested objects and template literals.
 */
function matchParen(src, open) {
  let depth = 1;
  let i = open;
  let quote = null;
  while (i < src.length) {
    const c = src[i];
    if (quote) {
      if (c === '\\') i++;
      else if (c === quote) quote = null;
    } else if (c === '"' || c === "'" || c === '`') {
      quote = c;
    } else if (c === '(' || c === '{' || c === '[') {
      depth++;
    } else if (c === ')' || c === '}' || c === ']') {
      depth--;
      if (depth === 0) return i;
    }
    i++;
  }
  return -1;
}

/** Top-level `key:` names in an object literal body, ignoring nested ones. */
function topLevelKeys(objBody) {
  const keys = [];
  let depth = 0;
  let quote = null;
  let token = '';
  for (let i = 0; i < objBody.length; i++) {
    const c = objBody[i];
    if (quote) {
      if (c === '\\') i++;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
    if (c === '{' || c === '[' || c === '(') { depth++; token = ''; continue; }
    if (c === '}' || c === ']' || c === ')') { depth--; token = ''; continue; }
    if (depth !== 0) continue;
    if (c === ':') { const k = token.trim(); if (/^\w+$/.test(k)) keys.push(k); token = ''; continue; }
    if (c === ',') { token = ''; continue; }
    token += c;
  }
  return keys;
}

const offenders = [];
let compliant = 0;
let scanned = 0;
let functions = 0;

for (const d of readdirSync(fnDir, { withFileTypes: true })) {
  if (!d.isDirectory() || d.name === '_shared') continue;
  const idx = join(fnDir, d.name, 'index.ts');
  if (!existsSync(idx)) continue;
  if (ACK_ONLY.has(d.name)) continue;

  const src = stripComments(readFileSync(idx, 'utf8'));
  functions++;

  // Shared responders are compliant by construction.
  for (const _ of src.matchAll(/\b(?:successResponse|errorResponse|rateLimitResponse)\s*\(/g)) {
    compliant++;
    scanned++;
  }

  // Only JSON.stringify inside `new Response(...)`. The same call also builds
  // outbound fetch bodies and log lines - counting those put 1,215 "responses"
  // across 189 functions and made the number meaningless.
  for (const m of src.matchAll(/new\s+Response\s*\(\s*JSON\.stringify\s*\(/g)) {
    const open = m.index + m[0].length;
    const close = matchParen(src, open);
    if (close === -1) continue;
    const arg = src.slice(open, close).trim();
    scanned++;

    // `JSON.stringify(someVariable)` - the shape is not visible here. Treated
    // as an offender rather than skipped: an invisible shape is exactly the
    // thing the iOS app has to special-case.
    const objStart = arg.indexOf('{');
    const keys = objStart === 0 ? topLevelKeys(arg.slice(1, arg.lastIndexOf('}'))) : [];

    if (keys.includes('success') && keys.includes('timestamp')) {
      compliant++;
    } else {
      const line = src.slice(0, m.index).split('\n').length;
      offenders.push(`${d.name}:${line}`);
    }
  }
}

// Abort BEFORE printing a count. A broken parser reports zero offenders, which
// reads as the cleanest result this guard could ever produce; printing that
// number first and the abort second invites somebody to copy it into BASELINE.
// Same failure the TypeScript ratchet had (US-258).
if (scanned < 100) {
  console.error(
    `✖ Only ${scanned} responses found across ${functions} functions. The parser is broken - ` +
      'fix it before trusting a number from this guard. No count has been compared to the baseline.',
  );
  process.exit(1);
}

console.log('Edge-function response-envelope guard (US-274)');
console.log(`  functions scanned:            ${functions}`);
console.log(`  JSON responses seen:          ${scanned}`);
console.log(`  carry success + timestamp:    ${compliant}`);
console.log(`  missing the envelope:         ${offenders.length} (baseline ${BASELINE})`);
console.log(`  provider webhooks exempt:     ${ACK_ONLY.size} (${[...ACK_ONLY].join(', ')})`);

if (offenders.length > BASELINE) {
  // Scan order is alphabetical by function, so this is a sample of the backlog
  // rather than "the new ones" - the guard holds a count, not a name list, and
  // cannot tell which entry is new.
  const shown = offenders.slice(-8).join(', ');
  console.error('');
  console.error(
    `❌ ${offenders.length - BASELINE} new JSON response(s) without success + timestamp. ` +
      `The iOS app parses against { success, data?, error?, timestamp } and every ad-hoc shape ` +
      `is a special case it has to carry forever. Backlog sample: ${shown}`,
  );
  console.error('   Use successResponse/errorResponse from _shared/auth-helpers.ts for a NEW');
  console.error('   response, or add success and timestamp alongside the existing keys when');
  console.error('   converting an old one - see the header for why those are different.');
  process.exit(1);
}

if (offenders.length < BASELINE) {
  console.error('');
  console.error(
    `❌ ${BASELINE - offenders.length} fewer than the baseline. Lower BASELINE in ` +
      `${relative(root, fileURLToPath(import.meta.url))} to ${offenders.length} to lock it in - ` +
      `a ceiling nobody lowers stops being a gate.`,
  );
  process.exit(1);
}

console.log('');
console.log(`✔ No new ad-hoc response shapes (${offenders.length} in the backlog).`);
