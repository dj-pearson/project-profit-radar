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
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const htmlPath = join(root, 'index.html');
const headersPath = join(root, 'public', '_headers');

const html = readFileSync(htmlPath, 'utf8');
const headers = readFileSync(headersPath, 'utf8');

const scriptSrc = (headers.match(/script-src([^;]*)/) || [])[1];
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
if (!/require-trusted-types-for\s+'script'/.test(headers)) {
  problems.push("require-trusted-types-for 'script' is missing from the CSP");
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

console.log('\n✔ Every inline script is hash-allowed, no orphans, no unsafe-inline, Trusted Types on.');
