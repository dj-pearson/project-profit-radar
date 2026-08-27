#!/usr/bin/env node
/**
 * Wildcard-CORS guard (US-240).
 *
 * `Access-Control-Allow-Origin: '*'` lets any website invoke an edge function
 * from a logged-in user's browser. Functions should derive CORS per request
 * from the allowlist in supabase/functions/_shared/secure-cors.ts:
 *
 *   import { getCorsHeaders } from '../_shared/secure-cors.ts';
 *   serve(async (req) => {
 *     const corsHeaders = getCorsHeaders(req);
 *     ...
 *
 * This script counts functions that still ship a wildcard literal and fails if
 * the count grows or a new name appears. The baseline only ever shrinks: as
 * functions are converted, drop them from REMAINING and lower BASELINE.
 *
 * PUBLIC is for endpoints that are genuinely called cross-origin — third-party
 * API clients, OAuth redirect targets, referral pixels, and marketing forms
 * that may be embedded off brikly.net. Adding a name here is a security
 * decision: it must be an endpoint that authenticates its own caller and holds
 * no ambient-authority cookie session.
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const fnDir = join(root, 'supabase', 'functions');

// Intentionally cross-origin. Each verifies its own caller.
const PUBLIC = new Set([
  'api-auth',                // third-party API clients, authenticated by API key
  'capture-lead',            // marketing form, may be embedded off-domain
  'handle-demo-request',     // marketing form, may be embedded off-domain
  'handle-sales-contact',    // marketing form, may be embedded off-domain
  'gsc-oauth-callback',      // OAuth redirect target
  'google-calendar-callback',
  'outlook-calendar-callback',
  'webhook-verify',          // server-to-server webhook verification
  'track-referral',          // referral pixel fired from partner sites
  'process-referral-signup', // referral attribution from partner sites
]);

// Every non-public function is converted. This stays as an empty set so the
// guard keeps failing on any new name rather than needing to be re-armed.
const REMAINING = new Set([]);
const BASELINE = REMAINING.size;

/** Blank out comments and string bodies so doc mentions don't count as code. */
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^[ \t]*\/\/.*$/gm, '');
}

const WILDCARD = /['"]Access-Control-Allow-Origin['"]\s*:\s*['"]\*['"]/;

const found = [];
for (const name of readdirSync(fnDir, { withFileTypes: true })) {
  if (!name.isDirectory() || name.name === '_shared') continue;
  const idx = join(fnDir, name.name, 'index.ts');
  if (!existsSync(idx)) continue;
  if (WILDCARD.test(stripComments(readFileSync(idx, 'utf8')))) found.push(name.name);
}
// _shared modules are checked too — a helper exporting a wildcard is worse.
for (const f of readdirSync(join(fnDir, '_shared'))) {
  if (!f.endsWith('.ts')) continue;
  const p = join(fnDir, '_shared', f);
  if (WILDCARD.test(stripComments(readFileSync(p, 'utf8')))) {
    found.push(relative(fnDir, p));
  }
}

const violations = found.filter((n) => !PUBLIC.has(n));
const unexpected = violations.filter((n) => !REMAINING.has(n));
const fixed = [...REMAINING].filter((n) => !violations.includes(n));

console.log('Wildcard-CORS guard (US-240)');
console.log(`  wildcard functions:      ${found.length}`);
console.log(`  intentionally public:    ${found.length - violations.length}/${PUBLIC.size}`);
console.log(`  backlog (baseline ${BASELINE}):  ${violations.length}`);

if (fixed.length) {
  console.log(`\n  Converted since the baseline — drop these from REMAINING in ${relative(root, fileURLToPath(import.meta.url))}:`);
  for (const n of fixed) console.log(`    - ${n}`);
}

if (unexpected.length) {
  console.error('\n✖ New wildcard CORS origins. Use getCorsHeaders(req) from _shared/secure-cors.ts:');
  for (const n of unexpected) console.error(`    - ${n}`);
  process.exit(1);
}

console.log(`\n✔ No new wildcard CORS origins (${violations.length} known, ${PUBLIC.size} public by design).`);
