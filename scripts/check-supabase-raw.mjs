#!/usr/bin/env node
/**
 * Guard: nothing may call `.raw(...)` on a Supabase client.
 *
 * supabase-js v2 has no `raw`. It was a v1-era escape hatch for raw SQL
 * fragments and it is simply not on the client, so
 *
 *   .update({ matches_count: supabase.raw('matches_count + 1') })
 *
 * does not build a SQL expression - it throws `TypeError: supabase.raw is not
 * a function` before the update is even assembled. TypeScript does not catch it
 * because these clients are typed `any` in edge functions, and a surrounding
 * try/catch turns it into a silent no-op.
 *
 * This has now happened twice: calculatorAnalytics.trackReferral (US-303) and
 * quickbooks-route-transactions (US-300). In both cases the intent was an
 * atomic increment, and in both cases the fix was a SECURITY DEFINER RPC doing
 * the read-modify-write in SQL - which is what you want anyway, because
 * read-modify-write from the client loses counts under concurrency.
 *
 * If you need a SQL expression in a write, add an RPC.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function walkFiles(dir, out = []) {
  for (const d of readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', 'dist'].includes(d.name)) continue;
    const p = join(dir, d.name);
    if (d.isDirectory()) walkFiles(p, out);
    else if (/\.(ts|tsx|js|mjs)$/.test(d.name)) out.push(p);
  }
  return out;
}

/** Comments stripped, so a file explaining the bug is not reported as having it. */
function stripComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((line) => !line.trim().startsWith('//'))
    .join('\n');
}

// `supabaseClient.raw(`, `supabase.raw(`, `client.raw(` - any identifier whose
// name suggests a supabase client. Deliberately not every `.raw(` in the repo:
// other libraries have legitimate raw() methods.
const CALL = /\b([A-Za-z_$][\w$]*)\s*\.\s*raw\s*\(/g;
const CLIENTISH = /supabase|supabaseClient|supabaseAdmin|serviceClient/i;

const hits = [];
for (const p of [...walkFiles(join(root, 'src')), ...walkFiles(join(root, 'supabase', 'functions')), ...walkFiles(join(root, 'scripts'))]) {
  const text = readFileSync(p, 'utf8');
  if (!/\.\s*raw\s*\(/.test(text)) continue;
  const stripped = stripComments(text);
  const lines = stripped.split('\n');
  lines.forEach((line, i) => {
    for (const m of line.matchAll(CALL)) {
      if (CLIENTISH.test(m[1])) {
        hits.push({ file: relative(root, p), line: i + 1, receiver: m[1] });
      }
    }
  });
}

console.log('Supabase raw() guard');
console.log(`  calls to .raw() on a supabase client: ${hits.length}`);

if (hits.length > 0) {
  console.error('\n✖ supabase-js v2 has no `raw`. Each of these throws a TypeError at runtime:');
  for (const h of hits) console.error(`    - ${h.file}:${h.line} ${h.receiver}.raw(...)`);
  console.error('  Add a SECURITY DEFINER RPC that does the expression in SQL instead.');
  process.exit(1);
}

console.log('\n✔ No supabase client .raw() calls.');
