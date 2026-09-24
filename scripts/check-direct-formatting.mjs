#!/usr/bin/env node
/**
 * Guard: direct date/number formatting outside @/lib/format (US-377).
 *
 * formatCurrency existed four times with three different outputs, and pages
 * called toLocaleDateString and `new Intl.NumberFormat` inline hundreds of
 * times, each picking its own locale and options. src/lib/format.ts is now the
 * one place that formats money, numbers and dates.
 *
 * eslint.config.js flags both patterns (no-restricted-syntax), but only at
 * "warn": the backlog is too large to hold at "error", and a warning does not
 * stop a new call from landing. This guard does. It counts the remaining
 * direct uses in src/ and fails when either count moves off its baseline:
 * up means new code bypassed @/lib/format, down means a call site was
 * migrated and the baseline should be lowered to lock that in.
 *
 * Counting is textual (the same member names the lint rule matches), which is
 * why src/lib/format.ts, the one sanctioned home, is excluded by path.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(root, 'src');
const ALLOWED = new Set(['src/lib/format.ts']);

/** Lower these as call sites move to @/lib/format. They never go up. */
const BASELINE = {
  toLocaleDateString: 242,
  'new Intl.NumberFormat': 41,
};

const PATTERNS = {
  toLocaleDateString: /\.\s*toLocaleDateString\b/g,
  'new Intl.NumberFormat': /\bnew\s+Intl\s*\.\s*NumberFormat\b/g,
};

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.') || e.name === 'node_modules') continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(e.name) && !e.name.endsWith('.d.ts')) out.push(p);
  }
  return out;
}

const counts = Object.fromEntries(Object.keys(PATTERNS).map((k) => [k, 0]));
const perFile = new Map();

for (const file of walk(SRC)) {
  const rel = relative(root, file).split('\\').join('/');
  if (ALLOWED.has(rel)) continue;
  const text = readFileSync(file, 'utf8');
  for (const [name, re] of Object.entries(PATTERNS)) {
    const n = (text.match(re) || []).length;
    if (!n) continue;
    counts[name] += n;
    perFile.set(rel, (perFile.get(rel) || 0) + n);
  }
}

console.log('Direct-formatting guard (US-377)');
let failed = false;
for (const [name, n] of Object.entries(counts)) {
  const base = BASELINE[name];
  console.log(`  ${name}: ${n} (baseline ${base})`);
  if (n > base) {
    failed = true;
    console.error(`\nFAIL: ${n - base} new direct ${name} call(s) outside src/lib/format.ts.`);
    console.error('  Use formatDate / formatDateTime / formatNumber / formatCurrency from @/lib/format.');
  } else if (n < base) {
    failed = true;
    console.error(`\nFAIL: ${name} dropped to ${n}; lower BASELINE['${name}'] in`);
    console.error('  scripts/check-direct-formatting.mjs to lock the win in.');
  }
}

if (failed) {
  const top = [...perFile].sort((a, b) => b[1] - a[1]).slice(0, 10);
  console.error('\n  Files with the most direct uses:');
  for (const [rel, n] of top) console.error(`    ${String(n).padStart(4)}  ${rel}`);
  process.exit(1);
}

console.log('\nOK: Direct formatting calls match the baseline exactly.');
