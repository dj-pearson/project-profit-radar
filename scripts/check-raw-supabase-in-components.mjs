#!/usr/bin/env node
/**
 * Guard: raw supabase.from() inside shipping components and pages (US-266).
 *
 * CLAUDE.md says data goes through TanStack Query. Components that call
 * supabase.from() themselves, usually from a useEffect into useState, get no
 * shared cache key, no invalidation after a write elsewhere, and whatever error
 * handling the author remembered; several read three tables and checked one,
 * so a failed read rendered as "nothing here". The fix is a hook in src/hooks
 * (useQuery/useMutation, key including company_id, error surfaced) that the
 * component calls.
 *
 * This counts `supabase.from(` call sites (including a chain split across lines
 * and `(supabase as any).from(`) in src/components and src/pages, and fails
 * when the count moves off its baseline: up means new code added a raw query,
 * down means one was migrated and the baseline should be lowered to lock it in.
 *
 * Only files reachable from src/main.tsx / src/App.tsx are counted. A file
 * nothing imports ships to nobody; its queries are a deletion question for
 * check-unreferenced-components.mjs, and counting them here would make every
 * dead-file deletion trip this guard. `supabase.storage.from(` is a bucket, not
 * a table, and is not counted. Tests and src/components/ui are excluded.
 *
 * `--list` prints the per-file counts, largest first.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname, relative, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(root, 'src');

/**
 * Lower this as components move onto hooks. It never goes up.
 * US-266 found 962 call sites in 266 reachable files and moved 52 of them
 * (15 components: Vendors, Invoices, DailyReports, PunchList,
 * FinancialOverview and ten tabs/panels) onto hooks in src/hooks.
 */
const BASELINE = 910;

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

// Import graph from the entry points, resolved the same way as
// check-unreferenced-components.mjs.
const EXTS = ['', '.ts', '.tsx', '/index.ts', '/index.tsx'];
function resolveSpec(spec, from) {
  let base;
  if (spec.startsWith('@/')) base = normalize(join(SRC, spec.slice(2)));
  else if (spec.startsWith('.')) base = normalize(join(dirname(from), spec));
  else return null;
  for (const ext of EXTS) if (onDisk.has(base + ext)) return base + ext;
  return null;
}

const IMPORT = /(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g;
const entries = [join(SRC, 'main.tsx'), join(SRC, 'App.tsx')].filter((f) => onDisk.has(f));
const reachable = new Set(entries);
const queue = [...entries];
while (queue.length) {
  const file = queue.pop();
  for (const m of sources.get(file).matchAll(IMPORT)) {
    const next = resolveSpec(m[1], file);
    if (next && !reachable.has(next)) {
      reachable.add(next);
      queue.push(next);
    }
  }
}

if (entries.length === 0 || reachable.size < 50) {
  console.error(`FAIL: the import graph resolved only ${reachable.size} file(s) from the entry points.`);
  console.error('  Fix the resolver before trusting a count from this guard.');
  process.exit(1);
}

// `supabase.from(`, `supabase\n  .from(`, `(supabase as any).from(`.
const RAW_FROM = /\bsupabase\b(?:\s+as\s+[\w<>[\]]+\s*\))?\s*\.\s*from\s*\(/g;

let total = 0;
const perFile = [];
for (const file of reachable) {
  const rel = relative(root, file).split('\\').join('/');
  if (!rel.startsWith('src/components/') && !rel.startsWith('src/pages/')) continue;
  if (rel.startsWith('src/components/ui/') || rel.includes('__tests__') || /\.(test|spec)\.tsx?$/.test(rel)) continue;
  const n = (sources.get(file).match(RAW_FROM) || []).length;
  if (n) {
    total += n;
    perFile.push([rel, n]);
  }
}
perFile.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

if (process.argv.includes('--list')) {
  for (const [rel, n] of perFile) console.log(`${String(n).padStart(4)}  ${rel}`);
  console.log(`${String(total).padStart(4)}  total in ${perFile.length} file(s)`);
  process.exit(0);
}

console.log('Raw supabase.from() in components/pages guard (US-266)');
console.log(`  call sites: ${total} in ${perFile.length} reachable file(s) (baseline ${BASELINE})`);

if (total > BASELINE) {
  console.error(`\nFAIL: ${total - BASELINE} new raw supabase.from() call(s) in a component or page.`);
  console.error('  Put the query in a hook under src/hooks (useQuery/useMutation, a query key that');
  console.error('  includes company_id, invalidation after writes, the error surfaced to the user)');
  console.error('  and call the hook from the component. src/hooks/useVendors.ts is a small example.');
  console.error('\n  Files with the most raw calls:');
  for (const [rel, n] of perFile.slice(0, 10)) console.error(`    ${String(n).padStart(4)}  ${rel}`);
  process.exit(1);
}

if (total < BASELINE) {
  console.error(`\nFAIL: raw call sites dropped to ${total}; lower BASELINE in`);
  console.error(`  ${relative(root, fileURLToPath(import.meta.url))} to ${total} to lock the win in.`);
  process.exit(1);
}

console.log('\nOK: raw supabase.from() count matches the baseline exactly.');
