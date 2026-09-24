#!/usr/bin/env node
/**
 * CSP inline-script hash guard (US-202).
 *
 * script-src no longer carries 'unsafe-inline'. The four executable inline
 * scripts in index.html are allowed by sha256 hash instead, which means editing
 * any of them — even by one character of whitespace — invalidates its hash and
 * the browser silently refuses to run it. No build error, no test failure, just
 * a script that stops executing in production. One of them is the Trusted Types
 * bootstrap, which has to stay inline because it must run before app scripts.
 *
 * So this recomputes the hashes from index.html and asserts every one is present
 * in the CSP, and that no hash in the CSP has been orphaned. It turns a silent
 * production breakage into a failed commit.
 *
 * It also asserts 'unsafe-inline' has not crept back into script-src, and that
 * there are no inline event handlers (onclick=, onload=, ...) — hashes do not
 * cover those, and removing 'unsafe-inline' stops them firing. That is exactly
 * how the font stylesheet's onload="this.media='all'" would have broken.
 *
 * Beyond the hashes it pins the shape of the rest of the policy: no
 * 'strict-dynamic' (it makes browsers ignore the host allowlist), no host in
 * script-src that serves arbitrary third-party files (a public CDN or anyone's
 * Supabase storage bucket is a ready-made CSP bypass), and object-src 'none',
 * base-uri and frame-ancestors present. It also runs the build-time reporting
 * rewrite (scripts/csp-reporting.mjs) against the real file, so a change that
 * breaks report-uri injection fails here instead of shipping a mangled header.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { addCspReporting, sentrySecurityEndpoint } from './csp-reporting.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const htmlPath = join(root, 'index.html');
const headersPath = join(root, 'public', '_headers');

const html = readFileSync(htmlPath, 'utf8');
const headers = readFileSync(headersPath, 'utf8');

// Read the directive from the header line itself, not the first mention of
// "script-src" anywhere in the file (comments above it talk about script-src).
const csp = (headers.match(/^\s+Content-Security-Policy:\s*(.*)$/m) || [])[1] || '';
const scriptSrc = (csp.match(/(?:^|;)\s*script-src([^;]*)/) || [])[1];
if (!scriptSrc) {
  console.error('✖ No script-src directive found in public/_headers.');
  process.exit(1);
}

const problems = [];

// 1. Inline scripts must each be hash-allowed.
const computed = [];
for (const m of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) {
  const [, attrs, body] = m;
  if (/\bsrc=/.test(attrs)) continue;
  // application/ld+json is data, not script — script-src does not govern it.
  if (/application\/ld\+json/.test(attrs)) continue;
  computed.push(`sha256-${createHash('sha256').update(body, 'utf8').digest('base64')}`);
}

for (const h of computed) {
  if (!scriptSrc.includes(h)) {
    problems.push(`inline script hash ${h} is missing from script-src — that script will not run`);
  }
}

// 2. No orphaned hashes left behind by a deleted or edited script.
for (const m of scriptSrc.matchAll(/'(sha256-[A-Za-z0-9+/=]+)'/g)) {
  if (!computed.includes(m[1])) {
    problems.push(`script-src carries ${m[1]}, which matches no inline script in index.html`);
  }
}

// 3. 'unsafe-inline' must not come back.
if (/'unsafe-inline'/.test(scriptSrc)) {
  problems.push("script-src contains 'unsafe-inline' again — the hashes stop being the control");
}
if (/'unsafe-eval'/.test(scriptSrc)) {
  problems.push("script-src contains 'unsafe-eval'");
}

// 4. Inline event handlers are not covered by hashes. Ignore HTML comments,
//    which is where this file explains the rule.
const withoutComments = html.replace(/<!--[\s\S]*?-->/g, '');
for (const m of withoutComments.matchAll(/\son[a-z]+\s*=\s*["']/g)) {
  const line = withoutComments.slice(0, m.index).split('\n').length;
  problems.push(`inline event handler at index.html:${line} (${m[0].trim()}) — hashes do not cover these, it will not fire`);
}

// 5. Trusted Types must stay on (US-202 AC4).
if (!/require-trusted-types-for\s+'script'/.test(csp)) {
  problems.push("require-trusted-types-for 'script' is missing from the CSP");
}

// 6. Policy shape beyond script hashes.
const directive = (name) => {
  const d = csp.split(';').map((x) => x.trim()).find((x) => x.split(/\s+/)[0] === name);
  return d === undefined ? null : d.split(/\s+/).slice(1);
};
const scriptSources = directive('script-src') || [];
if (scriptSources.includes("'strict-dynamic'")) {
  problems.push("script-src contains 'strict-dynamic' - browsers then ignore the host allowlist (GTM, Stripe, Google sign-in break)");
}
// Hosts that serve files anyone can publish. Allowing one in script-src lets an
// attacker who finds an injection point load their own script from it.
const BYPASS_HOSTS = [
  /^https:\/\/cdn\.jsdelivr\.net/, /^https:\/\/unpkg\.com/, /^https:\/\/cdnjs\.cloudflare\.com/,
  /supabase\.co$/, /^https:\/\/raw\.(githubusercontent|githack)\.com/, /googleusercontent\.com$/,
  /^https:\/\/storage\.googleapis\.com/,
];
for (const src of scriptSources) {
  if (['*', 'https:', 'http:', 'data:', 'blob:'].includes(src) || BYPASS_HOSTS.some((re) => re.test(src))) {
    problems.push(`script-src allows ${src}, which serves attacker-publishable content`);
  }
}
if (!(directive('object-src') || []).includes("'none'")) problems.push("object-src 'none' is missing");
if (!directive('base-uri')) problems.push('base-uri is missing');
if (!directive('frame-ancestors')) problems.push('frame-ancestors is missing');
if (/\breport-(uri|to)\b/.test(csp)) {
  problems.push('report-uri/report-to belong in the build step (scripts/csp-reporting.mjs), not public/_headers');
}

// 7. The build-time reporting rewrite still produces a well-formed header.
{
  const ep = sentrySecurityEndpoint('https://abc123@o42.ingest.us.sentry.io/7', 'production');
  const want = 'https://o42.ingest.us.sentry.io/api/7/security/?sentry_key=abc123&sentry_environment=production';
  if (ep !== want) problems.push(`sentrySecurityEndpoint() returned ${ep}, expected ${want}`);
  const out = addCspReporting(headers, want);
  const outCsp = (out.match(/^\s+Content-Security-Policy:\s*(.*)$/m) || [])[1];
  if (outCsp !== `${csp.replace(/;\s*$/, '')}; report-uri ${want}; report-to csp`) {
    problems.push('addCspReporting() did not append report-uri/report-to to the CSP unchanged');
  }
  if (!out.includes(`Reporting-Endpoints: csp="${want}"`)) problems.push('addCspReporting() did not add Reporting-Endpoints');
  if (addCspReporting(out, want) !== out) problems.push('addCspReporting() is not idempotent');
  if (sentrySecurityEndpoint('not a dsn') !== null) problems.push('sentrySecurityEndpoint() accepted a malformed DSN');
}

// US-301: no second CSP anywhere under src/.
//
// src/utils/security.ts used to carry addSecurityHeaders(), which appended a
// Content-Security-Policy meta tag. CSP policies combine RESTRICTIVELY - where
// two are present a resource must satisfy both - and that one's production
// script-src named neither Stripe, GTM, Sentry, Google/Apple sign-in, nor any
// of the inline-script hashes below. It never ran, because its only caller was
// a hook mounted nowhere, so it sat as a landmine: adding the hook to a layout
// would have broken checkout, analytics and SSO on the next deploy.
//
// The CSP lives in public/_headers, as an HTTP header. One definition, one
// place to keep in step.
const srcDir = join(root, 'src');
const secondCsp = [];
const CSP_META = /Content-Security-Policy/i;
const walkSrc = (dir) => {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walkSrc(full);
    else if (/\.(ts|tsx|js|jsx|html)$/.test(full)) {
      const text = readFileSync(full, 'utf8');
      if (!CSP_META.test(text)) continue;
      // A mention is fine (comments, violation reporting, a test asserting the
      // header). Building or setting one is not.
      const lines = text.split('\n');
      lines.forEach((line, i) => {
        if (!CSP_META.test(line)) return;
        if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;
        if (/httpEquiv\s*=|http-equiv\s*=|setAttribute\(\s*['"]http-equiv/.test(line)) {
          secondCsp.push(`${relative(root, full)}:${i + 1}  ${line.trim().slice(0, 90)}`);
        }
      });
    }
  }
};
walkSrc(srcDir);

console.log('CSP inline-script hash guard (US-202)');
console.log(`  executable inline scripts: ${computed.length}`);
console.log(`  hashes in script-src:      ${(scriptSrc.match(/'sha256-/g) || []).length}`);
console.log(`  second CSP definitions in src/: ${secondCsp.length}`);

if (secondCsp.length) {
  console.error('\n\u2716 A second Content-Security-Policy is being set from src/:');
  for (const s2 of secondCsp) console.error(`    ${s2}`);
  console.error(
    '\nCSP policies combine restrictively - two policies means a resource must satisfy',
  );
  console.error(
    'BOTH, so a second one that omits Stripe, GTM, Sentry or the inline-script hashes',
  );
  console.error('above silently breaks those the moment it is mounted. The CSP belongs in');
  console.error('public/_headers, as a header. See US-301.');
  process.exit(1);
}

if (problems.length) {
  console.error('\n✖ CSP and index.html disagree:');
  for (const p of problems) console.error(`    - ${p}`);
  console.error(`  Recompute the hashes into ${relative(root, headersPath)} after editing an inline script.`);
  process.exit(1);
}

console.log('\n✔ Every inline script is hash-allowed, no orphans, no unsafe-inline, Trusted Types on, no bypass hosts, reporting rewrite OK.');
