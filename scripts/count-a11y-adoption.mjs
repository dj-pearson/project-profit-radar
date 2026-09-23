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
//   node scripts/count-a11y-adoption.mjs --check    # ratchet (pre-commit + CI)
//
// --check fails when any count below moves off its baseline. Up means a new
// page skipped the wrapper (or broke the landmark contract); down means pages
// were fixed and the baseline should be lowered to lock that in.
//
//   missingWrapper  DashboardLayout pages with no <AccessiblePageWrapper>.
//   unflaggedLayout <DashboardLayout> tags in a wrapped page without
//                   hasAccessibleWrapper. The layout then renders its own
//                   <main id="main-content"> inside the wrapper's, which is
//                   two main landmarks and two #main-content ids.
//   pageMain        <main> elements written directly in a DashboardLayout
//                   page. The wrapper owns the page's one <main>; a second
//                   one nests inside it.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/** Lower these as pages are fixed. They never go up. Started at 84 / 0 / 8. */
const BASELINE = {
  missingWrapper: 0,
  unflaggedLayout: 0,
  pageMain: 0,
};

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

// Opening tags of DashboardLayout, braces balanced so `title={a > b}` does not
// end the tag early.
function layoutTags(src) {
  const tags = [];
  const re = /<DashboardLayout\b/g;
  let m;
  while ((m = re.exec(src))) {
    let depth = 0;
    let j = m.index + 1;
    for (; j < src.length; j++) {
      const ch = src[j];
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
      else if (ch === '>' && depth === 0) break;
    }
    tags.push(src.slice(m.index, j + 1));
  }
  return tags;
}

const sources = new Map();
for (const f of walk(PAGES)) {
  const src = readFileSync(f, 'utf8');
  if (/<DashboardLayout\b/.test(src)) sources.set(f, src);
}
const pages = [...sources.keys()];
const missing = pages.filter((f) => !/<AccessiblePageWrapper\b/.test(sources.get(f)));
const adopted = pages.length - missing.length;
const pct = pages.length === 0 ? 100 : (adopted / pages.length) * 100;

const unflagged = [];
const pageMain = [];
for (const [f, src] of sources) {
  if (/<AccessiblePageWrapper\b/.test(src)) {
    for (const tag of layoutTags(src)) {
      if (!/\bhasAccessibleWrapper\b/.test(tag)) unflagged.push(f);
    }
  }
  // Block comments (JSX comments included) may mention <main> in prose.
  const mains = src.replace(/\/\*[\s\S]*?\*\//g, '').match(/<main\b/g);
  if (mains) for (let i = 0; i < mains.length; i++) pageMain.push(f);
}

console.log(
  `AccessiblePageWrapper adoption: ${adopted}/${pages.length} authenticated pages (${pct.toFixed(1)}%)`,
);

const args = process.argv.slice(2);
if (args.includes('--list')) {
  for (const f of missing) console.log(`  missing: ${relative(ROOT, f)}`);
  for (const f of unflagged) console.log(`  no hasAccessibleWrapper: ${relative(ROOT, f)}`);
  for (const f of pageMain) console.log(`  page-level <main>: ${relative(ROOT, f)}`);
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

if (args.includes('--check')) {
  const counts = {
    missingWrapper: missing,
    unflaggedLayout: unflagged,
    pageMain,
  };
  let failed = false;
  for (const [key, files] of Object.entries(counts)) {
    const n = files.length;
    const base = BASELINE[key];
    if (n > base) {
      failed = true;
      console.error(`  ${key}: ${n} (baseline ${base}) - went up:`);
      for (const f of files) console.error(`    ${relative(ROOT, f)}`);
    } else if (n < base) {
      failed = true;
      console.error(
        `  ${key}: ${n} (baseline ${base}) - went down; lower BASELINE.${key} to ${n} in scripts/count-a11y-adoption.mjs`,
      );
    } else {
      console.log(`  ${key}: ${n} (baseline ${base})`);
    }
  }
  if (failed) {
    console.error(
      'A11y adoption guard (US-221): wrap DashboardLayout pages in <AccessiblePageWrapper pageTitle=...> ' +
        'and pass hasAccessibleWrapper to every <DashboardLayout> in them; the wrapper owns the one <main>.',
    );
    process.exit(1);
  }
}
