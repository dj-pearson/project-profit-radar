#!/usr/bin/env node
/**
 * US-303: every supabase.rpc('name') must name a function some migration
 * creates.
 *
 * This is the exact shape of the bug the story was opened for.
 * src/lib/calculatorAnalytics.ts called increment_lead_score in three places
 * and increment_session_calculations in one; neither had ever been defined in a
 * migration. Nothing caught it because:
 *
 *   - The generated types are empty (US-263 truncated types.ts), so
 *     `supabase.rpc('anything')` typechecks. Even a populated types.ts would
 *     only reflect what the live database happens to hold, not what the
 *     migrations create, so it cannot answer this question either.
 *   - supabase-js returns the error rather than throwing, so a missing function
 *     surfaces as an unread `error` on a call the surrounding try/catch never
 *     sees (US-300).
 *   - Three of those four calls used .catch() on a PostgrestBuilder, which has
 *     then() but no catch(). The TypeError fired before the request was sent,
 *     so even a server-side 404 would never have been reached.
 *
 * The migration SQL is the source of truth for what exists, so that is what
 * this checks against. A function that exists only in the live database because
 * someone created it by hand is not a pass here - that is US-248's problem and
 * this guard makes it visible rather than hiding it.
 *
 * BASELINE holds the calls that are known-missing and why. It only ever
 * shrinks: a name not in it, and not defined by a migration, fails the build.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const MIGRATIONS = join(root, 'supabase', 'migrations');
const SCAN_ROOTS = [join(root, 'src'), join(root, 'supabase', 'functions')];
const CODE_EXT = /\.(ts|tsx|js|jsx|mjs)$/;

/**
 * Known-missing RPC names, each with the reason it is tolerated. Every entry is
 * a real defect; the note says why it is not this guard's job to block on.
 */
const BASELINE = new Map([
  // Empty. US-303 added the six calculator functions; US-310 added the
  // accounting document-number functions and apply_bill_payment, and removed
  // the three nextval calls that could never resolve. Every RPC this codebase
  // calls is now created by a migration. An entry added here needs a written
  // reason, and the guard fails if it is ever left behind once fixed.
]);

/**
 * Blank out comment bodies, keeping line numbers intact.
 *
 * A guard must not forbid naming the thing it guards against: the migration and
 * the tests for US-303 and US-310 both quote the broken `.rpc('nextval', ...)`
 * call in prose, and flagging that would push authors towards deleting the
 * explanation. Line comments are only recognised when `//` is not preceded by a
 * colon, so a URL survives.
 */
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .split('\n')
    .map((line) => {
      const i = line.search(/(^|[^:])\/\//);
      if (i === -1) return line;
      const at = line.indexOf('//', i);
      return line.slice(0, at);
    })
    .join('\n');
}

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (CODE_EXT.test(entry.name)) out.push(full);
  }
  return out;
}

// Function names any migration creates. Schema-qualified or not; compared
// case-insensitively because Postgres folds unquoted identifiers.
const defined = new Set();
for (const file of readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql'))) {
  const sql = readFileSync(join(MIGRATIONS, file), 'utf8');
  const re = /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(?:"?([a-zA-Z0-9_]+)"?\s*\.\s*)?"?([a-zA-Z0-9_]+)"?\s*\(/gi;
  let m;
  while ((m = re.exec(sql))) defined.add(m[2].toLowerCase());
}

// Every .rpc('name') call site.
const calls = new Map(); // name -> [ "path:line", ... ]
for (const scanRoot of SCAN_ROOTS) {
  try {
    statSync(scanRoot);
  } catch {
    continue;
  }
  for (const file of walk(scanRoot)) {
    const lines = stripComments(readFileSync(file, 'utf8')).split('\n');
    lines.forEach((line, i) => {
      const re = /\.rpc\(\s*['"`]([a-zA-Z0-9_]+)['"`]/g;
      let m;
      while ((m = re.exec(line))) {
        const name = m[1].toLowerCase();
        if (!calls.has(name)) calls.set(name, []);
        calls.get(name).push(`${relative(root, file)}:${i + 1}`);
      }
    });
  }
}

const missing = [...calls.keys()].filter((n) => !defined.has(n)).sort();
const unexpected = missing.filter((n) => !BASELINE.has(n));
const stale = [...BASELINE.keys()].filter((n) => !missing.includes(n)).sort();

if (missing.length) {
  console.log(`RPC names called from code but not created by any migration (${missing.length}):`);
  for (const name of missing) {
    const sites = calls.get(name);
    const mark = BASELINE.has(name) ? 'known' : 'NEW';
    console.log(`   [${mark}] ${name} - ${sites.length} call site(s): ${sites.slice(0, 3).join(', ')}${sites.length > 3 ? ', ...' : ''}`);
  }
  console.log('');
}

if (stale.length) {
  console.error('❌ BASELINE lists RPC names that are no longer missing:');
  for (const name of stale) console.error(`   - ${name}`);
  console.error('');
  console.error('The baseline only shrinks. Delete these entries from');
  console.error('scripts/check-rpc-definitions.mjs so the guard keeps them fixed.');
  process.exit(1);
}

if (unexpected.length) {
  console.error(`❌ ${unexpected.length} RPC call(s) name a function no migration creates:`);
  for (const name of unexpected) {
    console.error(`   - ${name}`);
    for (const site of calls.get(name)) console.error(`       ${site}`);
  }
  console.error('');
  console.error('supabase-js returns this as an unread `error`, not a throw, and the');
  console.error('generated types cannot catch it. Either add the function in a');
  console.error('migration or remove the call. If the function only exists because');
  console.error('someone created it by hand against the live database, write the');
  console.error('migration anyway - see docs/RUNBOOK_MIGRATION_DEPLOY.md.');
  process.exit(1);
}

console.log(`✅ ${calls.size} distinct RPC name(s) called; all defined by a migration or baselined (${BASELINE.size}).`);
