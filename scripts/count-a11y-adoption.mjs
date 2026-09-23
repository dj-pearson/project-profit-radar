#!/usr/bin/env node
// US-221: how many authenticated pages use AccessiblePageWrapper.
//
// "Authenticated page" here means a file under src/pages that renders
// DashboardLayout: that is the app shell every signed-in route sits in, and
// the population docs/ACCESSIBILITY_COMPLIANCE_CHECKLIST.md tracks. Marketing
// and public pages are covered by the Playwright axe suite instead.
//
//   node scripts/count-a11y-adoption.mjs            # summary
//   node scripts/count-a11y-adoption.mjs --list     # plus the pages still missing it
//   node scripts/count-a11y-adoption.mjs --min 90   # exit 1 below 90%
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const PAGES = join(ROOT, 'src', 'pages');

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    if (name === '__tests__') continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (name.endsWith('.tsx') && !name.includes('.test.')) out.push(full);
  }
  return out;
}

const pages = walk(PAGES).filter((f) => /<DashboardLayout\b/.test(readFileSync(f, 'utf8')));
const missing = pages.filter((f) => !/<AccessiblePageWrapper\b/.test(readFileSync(f, 'utf8')));
const adopted = pages.length - missing.length;
const pct = pages.length === 0 ? 100 : (adopted / pages.length) * 100;

console.log(
  `AccessiblePageWrapper adoption: ${adopted}/${pages.length} authenticated pages (${pct.toFixed(1)}%)`,
);

const args = process.argv.slice(2);
if (args.includes('--list')) {
  for (const f of missing) console.log(`  missing: ${relative(ROOT, f)}`);
}

const minIdx = args.indexOf('--min');
if (minIdx !== -1) {
  const min = Number(args[minIdx + 1]);
  if (!Number.isFinite(min)) {
    console.error('--min needs a number, e.g. --min 90');
    process.exit(2);
  }
  if (pct < min) {
    console.error(`Below target: ${pct.toFixed(1)}% < ${min}%`);
    process.exit(1);
  }
}
