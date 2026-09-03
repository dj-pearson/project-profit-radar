#!/usr/bin/env node
/**
 * US-314: components and pages that nothing imports.
 *
 * 237 files under src/components and src/pages - 86,913 lines - are imported by
 * no other module. Vite tree-shakes them out of the bundle, so nothing breaks
 * and nothing complains; they simply sit in the tree looking like features.
 *
 * That is the failure this measures. Someone reading src/pages/DrawingViewer.tsx
 * reasonably concludes a drawing viewer exists and US-225 is half done. It is a
 * static mock: a hardcoded tool list and six hardcoded layers with invented item
 * counts. src/pages/AdminHub.tsx, FinancialHub.tsx and OperationsHub.tsx are
 * 30-line duplicates of the ones under src/pages/hubs/ that the routes actually
 * load (US-282). src/pages/CommunicationHub.tsx is a second 445-line
 * communication page (US-313). Four offline components totalling 1,171 lines
 * were never rendered while a fifth, offline/OfflineIndicator, is the one App
 * actually mounts.
 *
 * A count baseline rather than a name list: 237 written reasons would be a
 * document nobody maintains, and the number is what has to come down. It only
 * shrinks - deleting or wiring a file lowers it, adding an unimported one fails.
 *
 * What counts as imported: any other module naming it by `@/` alias or by a
 * relative path, including `import()` inside createLazyRoute, and a directory
 * import that resolves to its index. Entry points and anything under
 * components/ui or __tests__ are out of scope.
 *
 * 2026-08-29: an inbound import is not enough, and counting only those was
 * undercounting by 29%. A file imported solely by another dead file is just as
 * absent from the bundle as one nothing names at all - dead code arrives in
 * connected islands, not as isolated files, because a feature that got unwired
 * takes its whole subtree with it. components/billing/ChargebackManager (607
 * lines) has two inbound imports and shipped to nobody; both importers are
 * themselves unreachable. So this now walks the import graph from src/main.tsx
 * and src/App.tsx and reports what it cannot reach, which is the question that
 * actually matters: does this file ship? The two categories are printed
 * separately because they need different triage - a file nothing names is a
 * lone deletion, while an island is a whole feature to decide about at once -
 * but the baseline covers their sum.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname, relative, normalize, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(root, 'src');

/** Lower this as files are deleted or wired. It never goes up. */
const BASELINE = 236;

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const files = walk(SRC);
const sources = new Map(files.map((f) => [f, readFileSync(f, 'utf8')]));

// Module paths (extensionless) that some other module names.
const imported = new Set();
for (const [file, src] of sources) {
  for (const m of src.matchAll(/(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g)) {
    const spec = m[1];
    if (spec.startsWith('@/')) imported.add(normalize(join(SRC, spec.slice(2))));
    else if (spec.startsWith('.')) imported.add(normalize(join(dirname(file), spec)));
  }
}

function isImported(file) {
  const stem = file.replace(/\.(ts|tsx)$/, '');
  if (imported.has(stem)) return true;
  // A directory import resolves to its index.
  return basename(stem) === 'index' && imported.has(dirname(stem));
}

const candidates = files.filter((f) => {
  const rel = relative(root, f);
  return (
    f.endsWith('.tsx') &&
    (rel.startsWith('src/components/') || rel.startsWith('src/pages/')) &&
    !rel.includes('__tests__') &&
    !rel.startsWith('src/components/ui/')
  );
});

// Resolve each import specifier to a real file so the graph can be walked.
const EXTS = ['', '.ts', '.tsx', '/index.ts', '/index.tsx'];
const onDisk = new Set(files);
function resolveSpec(spec, from) {
  let base;
  if (spec.startsWith('@/')) base = normalize(join(SRC, spec.slice(2)));
  else if (spec.startsWith('.')) base = normalize(join(dirname(from), spec));
  else return null;
  for (const ext of EXTS) {
    const c = base + ext;
    if (onDisk.has(c)) return c;
  }
  return null;
}

const edges = new Map();
for (const [file, src] of sources) {
  const out = new Set();
  for (const m of src.matchAll(/(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g)) {
    const r = resolveSpec(m[1], file);
    if (r) out.add(r);
  }
  edges.set(file, out);
}

const entries = [join(SRC, 'main.tsx'), join(SRC, 'App.tsx')].filter((f) => onDisk.has(f));
const reachable = new Set(entries);
const queue = [...entries];
while (queue.length) {
  for (const next of edges.get(queue.pop()) || []) {
    if (!reachable.has(next)) {
      reachable.add(next);
      queue.push(next);
    }
  }
}

if (entries.length === 0 || reachable.size < 50) {
  console.error('✖ Import graph collapsed - resolved only ' + reachable.size + ' file(s) from');
  console.error('  the entry points. That would report almost every file as dead. Fix the');
  console.error('  resolver before trusting a result from this guard.');
  process.exit(1);
}

const orphans = candidates.filter((f) => !reachable.has(f));
const unnamed = orphans.filter((f) => !isImported(f));
const islands = orphans.filter((f) => isImported(f));
const lines = orphans.reduce((n, f) => n + sources.get(f).split('\n').length, 0);
const islandLines = islands.reduce((n, f) => n + sources.get(f).split('\n').length, 0);

// `--list` prints the orphans themselves, which is what AC3 triage needs: the
// summary tells you the number, and the number is not the thing you act on.
// LONE is a file nothing names at all - a lone deletion. ISLE is one reached
// only from another orphan, so it belongs to a whole island that has to be
// decided about together.
if (process.argv.includes('--list')) {
  const rows = orphans
    .map((f) => [unnamed.includes(f) ? 'LONE' : 'ISLE', sources.get(f).split('\n').length, relative(root, f)])
    .sort((a, b) => a[2].localeCompare(b[2]));
  for (const [kind, n, f] of rows) console.log(`${kind} ${String(n).padStart(4)}  ${f}`);
  process.exit(0);
}

console.log('Unreferenced-component guard (US-314)');
console.log(`  components and pages scanned: ${candidates.length}`);
console.log(`  unreachable from main.tsx:    ${orphans.length} (baseline ${BASELINE})`);
console.log(`    nothing imports them:       ${unnamed.length}`);
console.log(`    imported only by dead files: ${islands.length} (${islandLines.toLocaleString('en-US')} lines)`);
console.log(`  lines in them:                ${lines.toLocaleString('en-US')}`);

const biggest = [...orphans]
  .map((f) => [relative(root, f), sources.get(f).split('\n').length])
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10);
console.log('  largest:');
for (const [f, n] of biggest) console.log(`    ${String(n).padStart(4)}  ${f}`);
console.log('');

if (orphans.length > BASELINE) {
  console.error(
    `❌ ${orphans.length - BASELINE} new component(s) unreachable from the entry point. Vite drops them from ` +
      `the bundle, so this fails nowhere else - the file just sits in the tree looking like a feature.`,
  );
  console.error('   Wire it to a route or a parent, or do not add it. If it is deliberately');
  console.error('   staged ahead of its route, raise BASELINE and say why in the commit.');
  process.exit(1);
}

if (orphans.length < BASELINE) {
  console.error(
    `❌ ${BASELINE - orphans.length} fewer than the baseline. Lower BASELINE in ` +
      `${relative(root, fileURLToPath(import.meta.url))} to ${orphans.length} to lock it in - a ` +
      `ceiling nobody lowers stops being a gate (US-212 learned that the expensive way).`,
  );
  process.exit(1);
}

console.log(`✅ ${orphans.length} unreferenced component(s), matching the baseline exactly.`);
