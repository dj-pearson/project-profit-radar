#!/usr/bin/env node
/**
 * US-314 AC3: turn 227 unknown files into a reviewable list.
 *
 * scripts/check-unreferenced-components.mjs holds the line. This produces the
 * evidence needed to move it: for every component and page nothing imports, how
 * big it is, whether it talks to the database, whether it renders hardcoded
 * arrays, and whether a file of the same name is genuinely reachable from an
 * entry point (not merely imported by something, which may itself be dead).
 *
 * The distinction that matters, and the reason most of these are not mine to
 * delete: a 786-line orphan with seven supabase calls and a 631-line live
 * counterpart is not junk, it is an unanswered question about which of the two
 * is the product. A 199-line orphan with no supabase call and six hardcoded
 * layers is a mock. The report separates them so the first kind gets a decision
 * and the second gets deleted.
 *
 * Writes docs/UNREFERENCED_COMPONENTS.md. Regenerate with:
 *   node scripts/report-unreferenced-components.mjs
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname, relative, normalize, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(root, 'src');
const OUT = join(root, 'docs', 'UNREFERENCED_COMPONENTS.md');

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

const imported = new Set();
for (const [file, src] of sources) {
  for (const m of src.matchAll(/(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g)) {
    const spec = m[1];
    if (spec.startsWith('@/')) imported.add(normalize(join(SRC, spec.slice(2))));
    else if (spec.startsWith('.')) imported.add(normalize(join(dirname(file), spec)));
  }
}
const isImported = (f) => {
  const stem = f.replace(/\.(ts|tsx)$/, '');
  return imported.has(stem) || (basename(stem) === 'index' && imported.has(dirname(stem)));
};

const candidates = files.filter((f) => {
  const rel = relative(root, f);
  return (
    f.endsWith('.tsx') &&
    (rel.startsWith('src/components/') || rel.startsWith('src/pages/')) &&
    !rel.includes('__tests__') &&
    !rel.startsWith('src/components/ui/')
  );
});

// Reachability, not just "something names it". These have to be different: a
// file imported solely by another dead file is still dead, and calling it a
// live twin sends the reader to delete the wrong one of the pair. Three of the
// ten `duplicate?` verdicts in the first version of this report were pairs
// where NEITHER file was live - ClientPortal, SEOAnalyticsDashboard and
// ChargebackManager - so the question "which of these two is the product?" had
// no correct answer and the honest verdict is that the whole feature is gone.
const EXTS = ['', '.ts', '.tsx', '/index.ts', '/index.tsx'];
const onDisk = new Set(files);
function resolveSpec(spec, from) {
  let base;
  if (spec.startsWith('@/')) base = normalize(join(SRC, spec.slice(2)));
  else if (spec.startsWith('.')) base = normalize(join(dirname(from), spec));
  else return null;
  for (const ext of EXTS) if (onDisk.has(base + ext)) return base + ext;
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
const reachableFiles = new Set(entries);
const queue = [...entries];
while (queue.length) {
  for (const next of edges.get(queue.pop()) || []) {
    if (!reachableFiles.has(next)) {
      reachableFiles.add(next);
      queue.push(next);
    }
  }
}
if (reachableFiles.size < 50) {
  console.error('Import graph collapsed - refusing to write a report that calls everything dead.');
  process.exit(1);
}
const reachable = new Set(
  candidates.filter((f) => reachableFiles.has(f)).map((f) => basename(f, '.tsx')),
);

const rows = candidates.filter((f) => !reachableFiles.has(f)).map((f) => {
  const src = sources.get(f);
  const name = basename(f, '.tsx');
  const lines = src.split('\n').length;
  const db = (src.match(/supabase/g) || []).length;
  // Display data written into the file rather than fetched.
  const literalArrays = (src.match(/=\s*\[\s*\{/g) || []).length;
  const hooks = /use(Query|Mutation)\(/.test(src);
  // A same-named file that something does import: the likely live counterpart.
  const twin = [...reachable].find((r) => r === name) ?? '';
  let verdict;
  if (db === 0 && !hooks && literalArrays > 0) verdict = 'mock';
  else if (twin) verdict = 'duplicate?';
  else if (db > 0 || hooks) verdict = 'unwired feature';
  else verdict = 'review';
  return { file: relative(root, f), name, lines, db, literalArrays, twin, verdict };
});

rows.sort((a, b) => b.lines - a.lines);

const byVerdict = rows.reduce((acc, r) => ((acc[r.verdict] = (acc[r.verdict] ?? 0) + 1), acc), {});
const totalLines = rows.reduce((n, r) => n + r.lines, 0);

const lines = [];
lines.push('# Components and pages nothing imports');
lines.push('');
lines.push('<!-- Generated by scripts/report-unreferenced-components.mjs. Do not edit by hand. -->');
lines.push('');
lines.push(
  `${rows.length} files, ${totalLines.toLocaleString('en-US')} lines. Vite tree-shakes them out of the ` +
    'bundle, so nothing breaks and nothing warns; they sit in the tree looking like features (US-314).',
);
lines.push('');
lines.push('## What the columns mean');
lines.push('');
lines.push('- **db** - how many times the file names `supabase`. A file that reads real data is not junk.');
lines.push('- **arrays** - object-literal arrays assigned in the file. Display data written in rather than fetched.');
lines.push('- **live twin** - a file of the same name that IS reachable from src/main.tsx. Being imported is not enough: the importer can be dead too.');
lines.push('- **verdict** - a starting point, not a decision:');
lines.push('  - `mock` - no database access, no query hooks, and hardcoded arrays. Delete or finish.');
lines.push('  - `duplicate?` - a live file of the same name exists. Which one is the product?');
lines.push('  - `unwired feature` - reads real data, no live twin. Built and never routed.');
lines.push('  - `review` - none of the above.');
lines.push('');
lines.push('| verdict | count |');
lines.push('| --- | --- |');
for (const [v, n] of Object.entries(byVerdict).sort((a, b) => b[1] - a[1])) lines.push(`| ${v} | ${n} |`);
lines.push('');
lines.push('## Files');
lines.push('');
lines.push('| lines | file | db | arrays | live twin | verdict |');
lines.push('| ---: | --- | ---: | ---: | --- | --- |');
for (const r of rows) {
  lines.push(`| ${r.lines} | \`${r.file}\` | ${r.db} | ${r.literalArrays} | ${r.twin || '-'} | ${r.verdict} |`);
}
lines.push('');

writeFileSync(OUT, lines.join('\n'));
console.log(`Wrote ${relative(root, OUT)}: ${rows.length} files, ${totalLines.toLocaleString('en-US')} lines.`);
for (const [v, n] of Object.entries(byVerdict).sort((a, b) => b[1] - a[1])) console.log(`  ${v.padEnd(16)} ${n}`);
