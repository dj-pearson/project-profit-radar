#!/usr/bin/env node
/**
 * Guard: no new file crosses 1,000 lines while US-267 is burning the set down.
 *
 * The story names useCRM (1,945 lines) as its headline target. Nothing imports
 * useCRM - it is dead (US-314), and decomposing code that does not ship is
 * wasted work. Auditing the whole set the same way: 18 files are at or over
 * 1,000 lines, 3 of them dead. This guard tracks only the ones that ship, so
 * the number means "large code a user can actually reach".
 *
 * src/integrations/supabase/types.ts is excluded and always will be. At 41,294
 * lines it dwarfs everything else, and it is machine-generated with a
 * DO-NOT-EDIT banner - splitting it would be undone by the next `npm run
 * db:types`. A size rule that flags a generated file teaches people to ignore
 * the rule.
 *
 * The baseline is a NAME LIST rather than a count, because the useful question
 * is "is this file new to the list", not "how many are there". A count would be
 * satisfied by deleting one file and adding another.
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(root, 'src');
const LIMIT = 1000;

/** Shipped files already over the limit. This list only shrinks. */
const BASELINE = new Set([
  'src/contexts/AuthContext.tsx',
  'src/pages/UnifiedSEODashboard.tsx',
  'src/pages/Projects.tsx',
  'src/components/mobile/MobileDailyReportManager.tsx',
  'src/components/admin/KeywordManager.tsx',
  'src/components/admin/BlogAutoGeneration.tsx',
  'src/pages/resources/JobCostingSoftwareComparison.tsx',
  'src/components/admin/AIModelManager.tsx',
  'src/pages/Subcontractors.tsx',
  'src/components/financial/RealTimeJobCosting.tsx',
  'src/components/navigation/HierarchicalNavigationConfig.ts',
  'src/components/sso/SSOConfigurationForm.tsx',
  'src/components/project/tabs/ProjectPunchList.tsx',
  'src/components/estimates/EstimateForm.tsx',
]);

/** Generated, and regenerated wholesale. Never a decomposition target. */
const GENERATED = new Set(['src/integrations/supabase/types.ts']);

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.') || e.name === 'node_modules') continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(p);
  }
  return out;
}

const files = walk(SRC);
const onDisk = new Set(files);
const EXTS = ['', '.ts', '.tsx', '/index.ts', '/index.tsx'];
const resolveSpec = (spec, from) => {
  let base;
  if (spec.startsWith('@/')) base = join(SRC, spec.slice(2));
  else if (spec.startsWith('.')) base = resolve(dirname(from), spec);
  else return null;
  for (const ext of EXTS) if (onDisk.has(base + ext)) return base + ext;
  return null;
};
const IMPORT =
  /(?:import|export)\s[^;]*?from\s*['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)|require\(\s*['"]([^'"]+)['"]\s*\)/g;
const edges = new Map();
for (const f of files) {
  const out = new Set();
  for (const m of readFileSync(f, 'utf8').matchAll(IMPORT)) {
    const r = resolveSpec(m[1] || m[2] || m[3], f);
    if (r) out.add(r);
  }
  edges.set(f, out);
}
const entries = ['src/main.tsx', 'src/App.tsx', 'src/tools/automated-testing/cli.ts']
  .map((p) => join(root, p))
  .filter((f) => onDisk.has(f));
if (entries.length < 3) {
  console.error(`✖ Only ${entries.length} of 3 entry points found - fix the list before trusting`);
  console.error('  a pass from this guard.');
  process.exit(1);
}
const shipped = new Set(entries);
const queue = [...entries];
while (queue.length) {
  for (const n of edges.get(queue.pop()) || []) {
    if (!shipped.has(n)) {
      shipped.add(n);
      queue.push(n);
    }
  }
}
if (shipped.size < 200) {
  console.error(`✖ Import graph collapsed (${shipped.size} files) - fix the resolver.`);
  process.exit(1);
}

const isTest = (f) => /\.(test|spec)\.tsx?$|__tests__/.test(f);
const over = files
  .filter((f) => !isTest(f) && shipped.has(f))
  .map((f) => [relative(root, f), readFileSync(f, 'utf8').split('\n').length])
  .filter(([rel, n]) => n >= LIMIT && !GENERATED.has(rel))
  .sort((a, b) => b[1] - a[1]);

const names = new Set(over.map(([rel]) => rel));
const added = over.filter(([rel]) => !BASELINE.has(rel));
const gone = [...BASELINE].filter((rel) => !names.has(rel)).sort();

console.log('God-file guard (US-267)');
console.log(`  shipped files >= ${LIMIT} lines: ${over.length} (baseline ${BASELINE.size})`);
for (const [rel, n] of over) console.log(`    ${String(n).padStart(5)}  ${rel}`);

if (added.length) {
  console.error(`\n✖ ${added.length} file(s) newly at or over ${LIMIT} lines:`);
  for (const [rel, n] of added) console.error(`    ${n}  ${rel}`);
  console.error('\n  Split it, or if the size is genuinely warranted add it to BASELINE and say');
  console.error('  why in the commit. US-267 exists to shrink this list, not hold it steady.');
  process.exit(1);
}

if (gone.length) {
  console.error(`\n✖ ${gone.length} baselined file(s) are no longer over the limit:`);
  for (const rel of gone) console.error(`    ${rel}`);
  console.error('\n  Remove them from BASELINE to lock the win in.');
  process.exit(1);
}

console.log(`\n✔ No new god-files (${BASELINE.size} in the backlog).`);
