#!/usr/bin/env node
/**
 * US-259: single bundle budget measured in GZIPPED bytes.
 *
 * Replaces two divergent scripts (check-bundle-size.js, check-performance-budget.js)
 * that measured raw bytes against a 4–5.2MB ceiling — ~6x the <800KB gzipped
 * goal in CLAUDE.md. This gzips each emitted JS/CSS asset and enforces a budget
 * from .github/bundle-budget.json:
 *   - maxTotalGzipped   : sum of all JS+CSS, gzipped
 *   - maxEntryGzipped   : the largest single JS chunk, gzipped (the initial-load
 *                         proxy; ratchet this toward 800KB)
 * Fails (exit 1) if either is exceeded; emits ::notice:: with the measured
 * numbers so the budget can be ratcheted down as chunks are split/lazy-loaded.
 *
 * Usage: npm run build && node scripts/check-bundle-budget.mjs
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const assetsDir = join(root, 'dist', 'assets');
const budget = JSON.parse(readFileSync(join(root, '.github', 'bundle-budget.json'), 'utf8'));

if (!existsSync(assetsDir)) {
  console.error('❌ dist/assets not found — run `npm run build` first.');
  process.exit(1);
}

const kb = (n) => `${(n / 1024).toFixed(1)} KB`;

let totalGz = 0;
let largestJsGz = 0;
let largestJsName = '';
const chunks = [];
for (const f of readdirSync(assetsDir)) {
  if (!f.endsWith('.js') && !f.endsWith('.css')) continue;
  const gz = gzipSync(readFileSync(join(assetsDir, f))).length;
  totalGz += gz;
  chunks.push({ f, gz });
  if (f.endsWith('.js') && gz > largestJsGz) {
    largestJsGz = gz;
    largestJsName = f;
  }
}

chunks.sort((a, b) => b.gz - a.gz);
console.log('Bundle budget (gzipped) — US-259');
console.log(`  total JS+CSS : ${kb(totalGz)} (budget ${kb(budget.maxTotalGzipped)})`);
console.log(`  largest JS   : ${kb(largestJsGz)} — ${largestJsName} (budget ${kb(budget.maxEntryGzipped)})`);
console.log('  top chunks:');
for (const c of chunks.slice(0, 6)) console.log(`    ${kb(c.gz).padStart(10)}  ${c.f}`);

let failed = false;
if (totalGz > budget.maxTotalGzipped) {
  console.error(`::error::Total gzipped ${kb(totalGz)} exceeds budget ${kb(budget.maxTotalGzipped)}.`);
  failed = true;
}
if (largestJsGz > budget.maxEntryGzipped) {
  console.error(`::error::Largest JS chunk ${kb(largestJsGz)} exceeds budget ${kb(budget.maxEntryGzipped)}. Split/lazy-load it.`);
  failed = true;
}
if (failed) process.exit(1);

console.log(
  `::notice::Bundle within budget. Ratchet .github/bundle-budget.json toward the <800KB entry goal ` +
    `(current largest JS ${kb(largestJsGz)}, total ${kb(totalGz)}).`,
);
