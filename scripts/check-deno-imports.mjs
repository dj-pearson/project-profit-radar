#!/usr/bin/env node
/**
 * US-272: every remote import in supabase/functions must be version-pinned, and
 * every managed package must use the one specifier supabase/functions/deno.json
 * names.
 *
 * Edge functions import straight from URLs, so there is no lockfile and nothing
 * that fails when a dependency moves. Before this guard, supabase-js was
 * imported six ways - esm.sh at 2.50.3, 2.49.1, 2.39.3 and 2.39.0, esm.sh at a
 * floating @2, and npm: at a floating @2 - std at 0.168.0 and 0.190.0, zod as
 * both npm:zod@3 and deno.land/x/zod@v3.22.4, and stripe three ways.
 *
 * Two things go wrong with that, and the second is the one that bites:
 *
 *   1. A floating specifier (@2, @3, @14) resolves at cold start. The version a
 *      function runs is whatever was published most recently, and nothing
 *      records which that was.
 *
 *   2. Deno keys module instances by resolved specifier, so two specifiers for
 *      one package are two module graphs holding two sets of classes.
 *      _shared/validation.ts checked `error instanceof z.ZodError` against the
 *      npm:zod@3 copy while all nine of its callers - setup-mfa,
 *      verify-mfa-setup, verify-mfa-login, sso-manage, sso-saml-init,
 *      sso-oauth-init, sso-ldap-auth, create-stripe-checkout and
 *      process-invoice-payment - built their schemas with the deno.land copy.
 *      The check was false on every request, so a validation failure on any of
 *      those endpoints answered 'Invalid request format' rather than naming the
 *      field. Nothing about that is visible in the source of either file.
 *
 * So a version skew is a bug report, not a style preference, and this fails on
 * both shapes. Only the versions in deno.json need editing to move one.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const FUNCTIONS = join(root, 'supabase', 'functions');
const MAP_FILE = join(FUNCTIONS, 'deno.json');

/** A full version: 1.2.3, v1.2.3, 0.190.0. Not @2, not @v3, not absent. */
const PINNED = /@v?\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:$|[/?])/;

/**
 * The package a remote specifier refers to, independent of how it is loaded.
 * npm:zod@3 and https://deno.land/x/zod@v3.22.4/mod.ts are both 'zod', which is
 * how a loader split gets caught rather than passing as two pinned imports.
 */
function packageOf(spec) {
  let m;
  if ((m = spec.match(/^npm:(@[^/@]+\/[^/@]+|[^/@]+)/))) return m[1];
  if ((m = spec.match(/^https:\/\/esm\.sh\/(@[^/@]+\/[^/@]+|[^/@]+)/))) return m[1];
  if ((m = spec.match(/^https:\/\/deno\.land\/std@/))) return 'std';
  if ((m = spec.match(/^https:\/\/deno\.land\/x\/([^/@]+)/))) return m[1];
  return null;
}

/** The specifier up to and including its version, which is what must match. */
function versionedPrefix(spec) {
  const m = spec.match(/^(.*?@v?\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)/);
  return m ? m[1] : spec;
}

const map = JSON.parse(readFileSync(MAP_FILE, 'utf8'));
/** package name -> the one versioned prefix it is allowed to be imported at. */
const managed = new Map();
for (const target of Object.values(map.imports ?? {})) {
  const pkg = packageOf(target);
  if (!pkg) continue;
  const prefix = versionedPrefix(target);
  const existing = managed.get(pkg);
  if (existing && existing !== prefix) {
    console.error(`❌ ${relative(root, MAP_FILE)} maps ${pkg} to two versions:`);
    console.error(`   ${existing}`);
    console.error(`   ${prefix}`);
    process.exit(1);
  }
  managed.set(pkg, prefix);
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith('.ts')) out.push(full);
  }
  return out;
}

try {
  statSync(FUNCTIONS);
} catch {
  console.log('check-deno-imports: supabase/functions not found, skipping.');
  process.exit(0);
}

// Only module specifiers, so a URL in a string literal (an API endpoint, a
// redirect target) is not mistaken for a dependency.
const SPECIFIER = /(?:\bfrom\s*|\bimport\s*\(\s*)['"]((?:npm:|https:\/\/)[^'"]+)['"]/g;

const unpinned = [];
const mismatched = [];
const seen = new Map(); // package -> Set of versioned prefixes actually used

for (const file of walk(FUNCTIONS)) {
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, i) => {
    let m;
    SPECIFIER.lastIndex = 0;
    while ((m = SPECIFIER.exec(line))) {
      const spec = m[1];
      const where = `${relative(root, file)}:${i + 1}`;
      if (!PINNED.test(spec)) {
        unpinned.push({ where, spec });
        continue;
      }
      const pkg = packageOf(spec);
      if (!pkg) continue;
      const prefix = versionedPrefix(spec);
      if (!seen.has(pkg)) seen.set(pkg, new Set());
      seen.get(pkg).add(prefix);
      const want = managed.get(pkg);
      if (want && prefix !== want) mismatched.push({ where, spec, want });
    }
  });
}

console.log('Deno import guard (US-272)');
console.log(`  managed packages:   ${managed.size}`);
console.log(`  distinct packages:  ${seen.size}`);
for (const [pkg, prefixes] of [...seen].sort()) {
  const mark = managed.has(pkg) ? 'pinned by deno.json' : 'pinned in place';
  console.log(`    ${pkg} -> ${[...prefixes].join(', ')}  (${mark})`);
}
console.log('');

let failed = false;

if (unpinned.length) {
  console.error(`❌ ${unpinned.length} import(s) with no full version:`);
  for (const u of unpinned) console.error(`   ${u.where}  ${u.spec}`);
  console.error('');
  console.error('A floating specifier resolves at cold start, so the version a');
  console.error('function runs is whatever was published most recently and nothing');
  console.error('records which. Pin it to a full x.y.z.');
  failed = true;
}

if (mismatched.length) {
  console.error(`❌ ${mismatched.length} import(s) at a version deno.json does not name:`);
  for (const x of mismatched) console.error(`   ${x.where}  ${x.spec}\n       expected ${x.want}`);
  console.error('');
  console.error('Deno keys module instances by resolved specifier, so a second');
  console.error('specifier for one package loads a second copy with its own');
  console.error('classes: instanceof across the two is false and shared helpers');
  console.error('stop recognising errors the caller threw. Use the specifier in');
  console.error('supabase/functions/deno.json, or change it there first.');
  failed = true;
}

if (failed) process.exit(1);

console.log(`✅ Every remote import is pinned, and all ${managed.size} managed packages use one specifier.`);
