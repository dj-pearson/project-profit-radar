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
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname, relative, normalize, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(root, 'src');

/** Lower this as files are deleted or wired. It never goes up. */
const BASELINE = 233;

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

const orphans = candidates.filter((f) => !isImported(f));
const lines = orphans.reduce((n, f) => n + sources.get(f).split('\n').length, 0);

console.log('Unreferenced-component guard (US-314)');
console.log(`  components and pages scanned: ${candidates.length}`);
console.log(`  imported by nothing:          ${orphans.length} (baseline ${BASELINE})`);
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
    `❌ ${orphans.length - BASELINE} new component(s) that nothing imports. Vite drops them from ` +
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
