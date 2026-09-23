#!/usr/bin/env node
/**
 * Regenerate src/integrations/supabase/types.ts (US-263).
 *
 * This replaces `supabase gen types ... > src/integrations/supabase/types.ts`.
 * Shell redirection truncates the target BEFORE the command runs, so any
 * failure - no network, an expired access token, the wrong project id, the CLI
 * not installed - left a 41,000-line types file at zero bytes and the whole app
 * uncompilable. The failure mode was worse than not running it at all.
 *
 * So: generate to a temporary file, sanity-check the output actually looks like
 * generated types, and only then move it into place. types.ts is never touched
 * unless there is something valid to put there.
 *
 * Source (US-369): production is self-hosted (see the header of
 * supabase/migrations/20260209100000_bootstrap_foundational_schema.sql), so
 * types are generated from that database with --db-url, read from
 * SUPABASE_DB_URL. The old `--project-id brikly` default pointed at the retired
 * cloud project and produced types missing every column added since, which is
 * how eight screens ended up casting around the compiler. SUPABASE_PROJECT_ID is
 * still honoured when set explicitly, for a cloud staging project.
 */
import { execFileSync } from 'node:child_process';
import { writeFileSync, readFileSync, renameSync, unlinkSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const TARGET = join(root, 'src', 'integrations', 'supabase', 'types.ts');
const TMP = `${TARGET}.new`;
const DB_URL = process.env.SUPABASE_DB_URL;
const PROJECT_ID = process.env.SUPABASE_PROJECT_ID;

let source;
if (DB_URL) {
  source = { args: ['--db-url', DB_URL], label: 'SUPABASE_DB_URL' };
} else if (PROJECT_ID) {
  source = { args: ['--project-id', PROJECT_ID], label: `project "${PROJECT_ID}"` };
} else {
  console.error('Set SUPABASE_DB_URL to the self-hosted Postgres connection string');
  console.error('(postgresql://postgres:<password>@<host>:5432/postgres) and run again.');
  console.error('SUPABASE_PROJECT_ID is only for a Supabase cloud project.');
  console.error('\ntypes.ts was NOT modified.');
  process.exit(1);
}

const BANNER = `// GENERATED FILE - DO NOT EDIT BY HAND.
//
// Regenerate with: npm run db:types
// Source of truth is the live Postgres schema, reached through
// scripts/gen-supabase-types.mjs. A hand edit here is silently lost on the next
// regeneration, and worse, it makes the types disagree with the database while
// looking authoritative.
//
// If a type here is wrong, the schema is wrong or a migration has not been
// applied - fix it in supabase/migrations/ and regenerate.
`;

let generated;
try {
  generated = execFileSync(
    'supabase',
    ['gen', 'types', 'typescript', ...source.args],
    { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  );
} catch (err) {
  // The message echoes the command line, and --db-url carries the password.
  const message = DB_URL ? String(err.message).split(DB_URL).join('<SUPABASE_DB_URL>') : err.message;
  console.error(`Could not generate types: ${message}`);
  console.error('');
  console.error('types.ts was NOT modified. Check that:');
  console.error('  - the supabase CLI is installed and on PATH');
  console.error(`  - the database named by ${source.label} is reachable from here`);
  console.error('  - for --project-id only: SUPABASE_ACCESS_TOKEN is set (supabase login)');
  process.exit(1);
}

// Sanity-check before overwriting. The CLI can exit 0 having printed an error
// banner or an empty schema, and either of those replacing 41k lines of types
// is indistinguishable from a successful run until the build falls over.
const problems = [];
if (generated.trim().length === 0) problems.push('output was empty');
if (!/export type Json\b/.test(generated)) problems.push('no `export type Json` declaration');
if (!/export type Database\b/.test(generated)) problems.push('no `export type Database` declaration');
if (!/\bTables:\s*\{/.test(generated)) problems.push('no Tables block');

const existingLines = existsSync(TARGET) ? readFileSync(TARGET, 'utf8').split('\n').length : 0;
const newLines = generated.split('\n').length;
if (existingLines > 0 && newLines < existingLines * 0.5) {
  problems.push(
    `output is ${newLines} lines against ${existingLines} existing - more than half the schema ` +
      'would disappear. If that is genuinely intended, delete types.ts first.',
  );
}

if (problems.length) {
  console.error('Generated output does not look like a Supabase types file:');
  for (const p of problems) console.error(`  - ${p}`);
  console.error('\ntypes.ts was NOT modified.');
  process.exit(1);
}

writeFileSync(TMP, BANNER + '\n' + generated.replace(/^\/\/ GENERATED FILE[\s\S]*?\n\n/, ''));
renameSync(TMP, TARGET);
if (existsSync(TMP)) unlinkSync(TMP);

console.log(
  `Wrote ${TARGET.replace(root + '/', '')}: ${newLines} lines, ` +
    `${(statSync(TARGET).size / 1024).toFixed(0)} KB (was ${existingLines} lines).`,
);
