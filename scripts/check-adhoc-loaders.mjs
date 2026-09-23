#!/usr/bin/env node
/**
 * Guard: ad-hoc loading UI outside the shared Skeleton set (US-285).
 *
 * CLAUDE.md says loading states use Skeleton from @/components/ui/skeleton,
 * and src/components/AGENTS.md names @/components/ui/skeletons as the home of
 * the shared compositions (List/Table/CardGrid/DataTablePage, LoadingRegion).
 * The tree still had over a hundred literal "Loading..." paragraphs, spinner
 * blocks and hand-rolled grey pulse divs, each a slightly different shape.
 *
 * This counts three patterns in src/**\/*.tsx and fails when any count moves
 * off its baseline: up means new code added an ad-hoc loader, down means one
 * was migrated and the baseline should be lowered to lock that in.
 *
 *   loadingText      JSX text like `>Loading projects...<`. Text inside an
 *                    element whose opening tag carries `sr-only` is skipped:
 *                    that is the screen-reader label a skeleton needs.
 *   LoadingState     `<LoadingState` (spinner + message block) used as a
 *                    content placeholder.
 *   pulsePlaceholder a className with `animate-pulse` plus a bg-muted /
 *                    bg-gray-N / bg-slate-N / bg-secondary fill, i.e. a
 *                    hand-built Skeleton.
 *
 * src/components/ui/ is excluded (it defines the primitives), as are tests.
 * Full-screen auth/route gates (ProtectedRoute and friends) are counted but
 * are an accepted remainder; they render before any layout exists.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(root, 'src');

/**
 * Lower these as call sites move to Skeleton. They never go up.
 * Started at 118 / 19 / 78. What is left: the ProtectedRoute and Setup auth
 * gates, MobileForm and the lazyRoutes route fallback. The unrouted
 * components/project/ProjectEstimates and the three image components whose
 * pulse placeholders sat under an <img> while it decoded were deleted in
 * US-296, which is what took pulsePlaceholder to zero.
 */
const BASELINE = {
  loadingText: 4,
  LoadingState: 1,
  pulsePlaceholder: 0,
};

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.') || e.name === 'node_modules' || e.name === '__tests__') continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.tsx') && !/\.(test|spec)\.tsx$/.test(e.name)) out.push(p);
  }
  return out;
}

const LOADING_TEXT = /[^=]>\s*Loading\b[^<>{}]*?(?:\.\.\.|\u2026)\s*</g;
const LOADING_STATE = /<LoadingState\b/g;
const CLASS_STRING = /(["'`])([^"'`\n]*\banimate-pulse\b[^"'`\n]*)\1/g;
const PLACEHOLDER_FILL = /\bbg-(?:muted|secondary|gray-\d+|slate-\d+)\b/;

function countLoadingText(text) {
  let n = 0;
  for (const m of text.matchAll(LOADING_TEXT)) {
    const gt = m.index + 1;
    const open = text.lastIndexOf('<', gt);
    if (open !== -1 && text.slice(open, gt).includes('sr-only')) continue;
    n++;
  }
  return n;
}

function countPulse(text) {
  let n = 0;
  for (const m of text.matchAll(CLASS_STRING)) if (PLACEHOLDER_FILL.test(m[2])) n++;
  return n;
}

const counts = { loadingText: 0, LoadingState: 0, pulsePlaceholder: 0 };
const perFile = new Map();

for (const file of walk(SRC)) {
  const rel = relative(root, file).split('\\').join('/');
  if (rel.startsWith('src/components/ui/')) continue;
  const text = readFileSync(file, 'utf8');
  const found = {
    loadingText: countLoadingText(text),
    LoadingState: (text.match(LOADING_STATE) || []).length,
    pulsePlaceholder: countPulse(text),
  };
  for (const [k, n] of Object.entries(found)) {
    if (!n) continue;
    counts[k] += n;
    perFile.set(rel, (perFile.get(rel) || 0) + n);
  }
}

console.log('Ad-hoc loader guard (US-285)');
let failed = false;
for (const [name, n] of Object.entries(counts)) {
  const base = BASELINE[name];
  console.log(`  ${name}: ${n} (baseline ${base})`);
  if (n > base) {
    failed = true;
    console.error(`\nFAIL: ${n - base} new ${name} loader(s).`);
    console.error('  Use Skeleton (@/components/ui/skeleton) or a composition from');
    console.error('  @/components/ui/skeletons (ListSkeleton, TableSkeleton, CardGridSkeleton,');
    console.error('  DataTablePageSkeleton, LoadingRegion). Put any status text in an sr-only span.');
  } else if (n < base) {
    failed = true;
    console.error(`\nFAIL: ${name} dropped to ${n}; lower BASELINE.${name} in`);
    console.error('  scripts/check-adhoc-loaders.mjs to lock the win in.');
  }
}

if (failed) {
  const top = [...perFile].sort((a, b) => b[1] - a[1]).slice(0, 10);
  console.error('\n  Files with the most ad-hoc loaders:');
  for (const [rel, n] of top) console.error(`    ${String(n).padStart(4)}  ${rel}`);
  process.exit(1);
}

console.log('\nOK: Ad-hoc loader counts match the baseline exactly.');
