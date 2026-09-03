#!/usr/bin/env node
/**
 * Guard: modules outside components/pages that nothing reaches.
 *
 * check-unreferenced-components.mjs (US-314) walks the import graph from
 * src/main.tsx, but only reports files under src/components and src/pages.
 * Everything else was uncounted, and that is where some of the largest dead
 * files live: src/hooks/useCRM.ts is 1,945 lines that nothing imports, and
 * US-267 lists it as a god-file to decompose - decomposing code that does not
 * ship is wasted work, and no guard was in a position to say so.
 *
 * Entry points are src/main.tsx, src/App.tsx and
 * src/tools/automated-testing/cli.ts. That last one matters: four npm scripts
 * (test:auto and friends) run it with tsx, so its 37-file subtree is reached by
 * a route no import graph from the app would find. Leaving it out counted 37
 * live files as dead, which is the kind of error that discredits a guard.
 *
 * Test files are entry points too, but only for classifying: a module imported
 * solely by tests is not shipped, yet deleting it breaks the suite, so it is
 * excluded here rather than counted. That distinction is the difference between
 * 443 and 406 dead files.
 *
 * .d.ts files are excluded - ambient declarations are never imported by design.
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(root, 'src');

/** Lower this as modules are deleted or wired. It never goes up. */
const BASELINE = 114;

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
const sources = new Map(files.map((f) => [f, readFileSync(f, 'utf8')]));

const EXTS = ['', '.ts', '.tsx', '/index.ts', '/index.tsx'];
function resolveSpec(spec, from) {
  let base;
  if (spec.startsWith('@/')) base = join(SRC, spec.slice(2));
  else if (spec.startsWith('.')) base = resolve(dirname(from), spec);
  else return null;
  for (const ext of EXTS) if (onDisk.has(base + ext)) return base + ext;
  return null;
}

const IMPORT =
  /(?:import|export)\s[^;]*?from\s*['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)|require\(\s*['"]([^'"]+)['"]\s*\)/g;
const edges = new Map();
for (const [file, src] of sources) {
  const out = new Set();
  for (const m of src.matchAll(IMPORT)) {
    const r = resolveSpec(m[1] || m[2] || m[3], file);
    if (r) out.add(r);
  }
  edges.set(file, out);
}

function reach(starts) {
  const seen = new Set(starts);
  const queue = [...starts];
  while (queue.length) {
    for (const next of edges.get(queue.pop()) || []) {
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return seen;
}

const isTest = (f) => /\.(test|spec)\.tsx?$|__tests__/.test(f);
const ENTRIES = ['src/main.tsx', 'src/App.tsx', 'src/tools/automated-testing/cli.ts']
  .map((p) => join(root, p))
  .filter((f) => onDisk.has(f));

if (ENTRIES.length < 3) {
  console.error(`✖ Only ${ENTRIES.length} of 3 entry points found. If one was renamed, its whole`);
  console.error('  subtree will be reported as dead. Fix the list before trusting this guard.');
  process.exit(1);
}

const shipped = reach(ENTRIES);
const testReached = reach(files.filter(isTest));

if (shipped.size < 200) {
  console.error(`✖ Import graph collapsed - only ${shipped.size} files reachable. Fix the`);
  console.error('  resolver before trusting a pass from this guard.');
  process.exit(1);
}

const inScope = (f) => {
  const rel = relative(root, f);
  return (
    !isTest(f) &&
    !/\.d\.ts$/.test(rel) &&
    rel.startsWith('src/') &&
    !rel.startsWith('src/components/') &&
    !rel.startsWith('src/pages/')
  );
};

const dead = files.filter((f) => inScope(f) && !shipped.has(f) && !testReached.has(f));
const testOnly = files.filter((f) => inScope(f) && !shipped.has(f) && testReached.has(f));
const lines = dead.reduce((n, f) => n + sources.get(f).split('\n').length, 0);

const byDir = new Map();
for (const f of dead) {
  const d = relative(root, f).split('/').slice(0, 2).join('/');
  const e = byDir.get(d) || [0, 0];
  e[0] += 1;
  e[1] += sources.get(f).split('\n').length;
  byDir.set(d, e);
}

console.log('Unreferenced-module guard (US-314 follow-up)');
console.log(`  modules outside components/pages: ${files.filter(inScope).length}`);
console.log(`  unreachable from any entry point: ${dead.length} (baseline ${BASELINE})`);
console.log(`  lines in them:                    ${lines.toLocaleString('en-US')}`);
console.log(`  reached only by tests (excluded): ${testOnly.length}`);
for (const [d, [n, l]] of [...byDir].sort((a, b) => b[1][1] - a[1][1])) {
  console.log(`    ${d.padEnd(16)} ${String(n).padStart(3)} files ${String(l).padStart(6)} lines`);
}
console.log('  largest:');
for (const [l, f] of dead
  .map((f) => [sources.get(f).split('\n').length, relative(root, f)])
  .sort((a, b) => b[0] - a[0])
  .slice(0, 8)) {
  console.log(`    ${String(l).padStart(4)}  ${f}`);
}

if (dead.length > BASELINE) {
  console.error(
    `\n✖ ${dead.length - BASELINE} new module(s) that nothing reaches. Vite drops them from the ` +
      'bundle, so nothing fails - the file just sits in the tree looking like it works.',
  );
  console.error('   Wire it to something that ships, or do not add it.');
  process.exit(1);
}

if (dead.length < BASELINE) {
  console.error(
    `\n✖ ${BASELINE - dead.length} fewer than the baseline. Set BASELINE to ${dead.length} in ` +
      `${relative(root, fileURLToPath(import.meta.url))} to lock it in - a baseline nobody lowers ` +
      'stops being a gate.',
  );
  process.exit(1);
}

console.log(`\n✔ ${dead.length} unreferenced module(s), matching the baseline exactly.`);
