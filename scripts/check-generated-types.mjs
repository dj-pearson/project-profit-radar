#!/usr/bin/env node
/**
 * Guard: src/integrations/supabase/types.ts must still be a real types file.
 *
 * This exists because of commit a4b1635, which is titled "db:types truncated
 * types.ts before it could fail" and which committed the truncated file. The
 * old db:types script was
 *
 *   supabase gen types typescript --project-id brikly > src/.../types.ts
 *
 * and shell redirection empties the target before the command runs, so any
 * failure left 41,282 lines of schema at zero bytes. scripts/gen-supabase-types.mjs
 * replaced that and sanity-checks its own output - but those checks only cover
 * the generation path. Nothing covered the file itself, so the damage travelled
 * in the same commit as the fix for it and survived every one of the other
 * pre-commit guards.
 *
 * The failure mode is why this is worth a guard of its own rather than leaving
 * it to the compiler. With `Database` unresolved, `supabase.from(...)` still
 * type-checks: rows come back as `{}` / `never` / `unknown` and every property
 * read on them becomes a separate TS2339 somewhere else entirely. It reads as
 * hundreds of unrelated type errors scattered across the app, not as one broken
 * file, so it costs a long time to trace back. 376 of the 669 errors in the
 * US-212 backlog were this single cause.
 *
 * The checks mirror scripts/gen-supabase-types.mjs so a file that passes
 * generation also passes here.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const TARGET = join(root, 'src', 'integrations', 'supabase', 'types.ts');
const rel = relative(root, TARGET);

// The floor is deliberately far below the real file (41k lines) rather than
// close to it. This catches a truncation or an error banner written in place;
// it is not a schema-shrink ratchet, and a legitimate schema reduction should
// not have to argue with it.
const MIN_LINES = 500;

const problems = [];

if (!existsSync(TARGET)) {
  problems.push('the file does not exist');
} else {
  const text = readFileSync(TARGET, 'utf8');
  const lines = text.split('\n').length;

  if (text.trim().length === 0) problems.push('the file is empty');
  else {
    if (!/export type Json\b/.test(text)) problems.push('no `export type Json` declaration');
    if (!/export type Database\b/.test(text)) problems.push('no `export type Database` declaration');
    if (!/\bTables:\s*\{/.test(text)) problems.push('no Tables block');
    if (lines < MIN_LINES) {
      problems.push(`only ${lines} lines - a real generated schema is far larger than ${MIN_LINES}`);
    }
  }
}

console.log('Generated Supabase types guard');
console.log(`  checking ${rel}`);

if (problems.length) {
  console.error(`\n✖ ${rel} is not a usable generated types file:`);
  for (const p of problems) console.error(`    - ${p}`);
  console.error('');
  console.error('  Every `supabase.from(...)` in the app resolves to `never` without it, which');
  console.error('  surfaces as hundreds of unrelated TS2339 errors rather than one broken file.');
  console.error('');
  console.error('  Regenerate with `npm run db:types` (needs the supabase CLI and');
  console.error('  SUPABASE_ACCESS_TOKEN), or restore the last good copy:');
  console.error(`    git show $(git log -2 --format=%H -- ${rel} | tail -1):${rel} > ${rel}`);
  process.exit(1);
}

console.log(`\n✔ ${rel} looks like a generated schema.`);
