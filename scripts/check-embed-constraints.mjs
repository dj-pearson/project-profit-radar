#!/usr/bin/env node
/**
 * US-336: an embed must name a constraint that relates the two tables.
 *
 * PostgREST lets you disambiguate an embedded resource by naming the foreign
 * key: `user_profiles!time_entries_user_id_fkey(first_name)`. If the named
 * constraint does not relate those two tables, PostgREST returns an error
 * rather than rows, and callers that do `if (error) throw error` fail outright.
 *
 * That is exactly what happened. time_entries.user_id references auth.users(id)
 * and user_profiles.id references auth.users(id) - siblings, with no
 * relationship between them - so `user_profiles!time_entries_user_id_fkey`
 * could never resolve. The timesheet detail view did not open, and
 * DailyReportCrewPanel would have shown no timesheet at all.
 *
 * Neither the build nor, in the timesheet case, the typecheck catches it: a
 * select written as a template literal containing `*` degrades the inferred
 * type enough to hide the problem.
 *
 * WHAT THIS CHECKS. For every `<table>!<constraint>(...)` embed in src/ and
 * supabase/functions/, work out what the named constraint actually references -
 * from the migrations, which are the authoritative record of what was created,
 * and from the generated types as a second source. Flag it only when there is
 * POSITIVE evidence the constraint points somewhere other than the table being
 * embedded.
 *
 * Deliberately conservative. types.ts is incomplete - it does not list
 * timesheet_approval_history_performed_by_fkey even though a migration plainly
 * creates it as REFERENCES public.user_profiles(id) - so treating "absent from
 * types" as "broken" produces false positives. An unverifiable constraint
 * passes; only a demonstrably wrong one fails.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const TYPES = join(root, 'src', 'integrations', 'supabase', 'types.ts');

/**
 * Constraints the generated types do describe, as
 * "<constraint>" -> Set of referenced relations.
 */
function knownConstraints() {
  const src = readFileSync(TYPES, 'utf8');
  const map = new Map();
  const re = /foreignKeyName:\s*"([^"]+)"[\s\S]{0,400}?referencedRelation:\s*"([^"]+)"/g;
  for (const m of src.matchAll(re)) {
    const [, name, relation] = m;
    if (!map.has(name)) map.set(name, new Set());
    map.get(name).add(relation);
  }
  return map;
}

/**
 * What the migrations say a column references.
 *
 * Constraints follow Postgres's default name: <table>_<column>_fkey. So the
 * name alone says which table and column to look up, and the CREATE TABLE for
 * that table says what the column REFERENCES.
 */
function migrationReferences() {
  const dir = join(root, 'supabase', 'migrations');
  let files;
  try { files = readdirSync(dir).filter((f) => f.endsWith('.sql')); } catch { return new Map(); }

  // "<table>.<column>" -> Set of referenced tables (unqualified).
  const refs = new Map();

  for (const file of files) {
    const sql = readFileSync(join(dir, file), 'utf8');

    // Inline: CREATE TABLE x ( ... col UUID REFERENCES public.y(id) ... )
    for (const table of sql.matchAll(/CREATE TABLE (?:IF NOT EXISTS )?(?:public\.)?([a-z0-9_]+)\s*\(([\s\S]*?)\n\);/gi)) {
      const [, tableName, body] = table;
      for (const col of body.matchAll(/^\s*([a-z0-9_]+)\s+[A-Za-z0-9()\[\], ]*?REFERENCES\s+(?:public\.|auth\.)?([a-z0-9_]+)/gim)) {
        const key = `${tableName}.${col[1]}`;
        if (!refs.has(key)) refs.set(key, new Set());
        refs.get(key).add(col[2]);
      }
    }

    // ALTER TABLE x ADD COLUMN col ... REFERENCES public.y(id)
    for (const alter of sql.matchAll(/ALTER TABLE\s+(?:public\.)?([a-z0-9_]+)([\s\S]*?);/gi)) {
      const [, tableName, body] = alter;
      for (const col of body.matchAll(/ADD COLUMN (?:IF NOT EXISTS )?([a-z0-9_]+)[^,;]*?REFERENCES\s+(?:public\.|auth\.)?([a-z0-9_]+)/gi)) {
        const key = `${tableName}.${col[1]}`;
        if (!refs.has(key)) refs.set(key, new Set());
        refs.get(key).add(col[2]);
      }
    }
  }
  return refs;
}

/** Split <table>_<column>_fkey into its parts, trying each split point. */
function candidateSplits(constraint) {
  const stem = constraint.replace(/_fkey$/, '');
  const parts = stem.split('_');
  const out = [];
  for (let i = 1; i < parts.length; i++) {
    out.push([parts.slice(0, i).join('_'), parts.slice(i).join('_')]);
  }
  return out;
}

const SKIP_DIRS = new Set(['node_modules', 'dist', '.git']);

function walk(dir, out = []) {
  let entries;
  try { entries = readdirSync(dir); } catch { return out; }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    // Test files quote broken embeds deliberately, as fixtures and as
    // evidence in comments. Excluded by filename rather than by directory so a
    // fixture written into a __tests__ folder is still checked.
    else if (
      /\.(ts|tsx)$/.test(entry) &&
      !/types\.ts$/.test(entry) &&
      !/\.(test|spec)\.[tj]sx?$/.test(entry)
    ) out.push(full);
  }
  return out;
}

const known = knownConstraints();
const migrated = migrationReferences();
const findings = [];
let checked = 0;
let unverifiable = 0;

// `alias:table!constraint(` or `table!constraint(`
const EMBED = /(?:[A-Za-z0-9_]+:)?([a-z0-9_]+)!([a-z0-9_]+)\s*\(/g;

for (const file of [...walk(join(root, 'src')), ...walk(join(root, 'supabase', 'functions'))]) {
  const src = readFileSync(file, 'utf8');
  // Strip comments so an explanation of this very bug is not read as a query.
  const code = src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*'))
    .join('\n');

  for (const m of code.matchAll(EMBED)) {
    const [, table, constraint] = m;
    // PostgREST constraint hints are named <table>_<column>_fkey by
    // convention; anything else here is likely a TS non-null assertion or an
    // unrelated expression, so require the suffix before judging it.
    if (!constraint.endsWith('_fkey')) continue;
    checked++;

    // Everything the two sources say this constraint references.
    const targets = new Set(known.get(constraint) ?? []);
    for (const [owner, column] of candidateSplits(constraint)) {
      for (const t of migrated.get(`${owner}.${column}`) ?? []) targets.add(t);
    }

    if (targets.size === 0) {
      // Neither source knows. Unverifiable is not the same as wrong.
      unverifiable++;
      continue;
    }
    if (!targets.has(table)) {
      findings.push({
        file: relative(root, file),
        line: code.slice(0, m.index).split('\n').length,
        constraint,
        table,
        why: `it references ${[...targets].join(', ')}, not ${table}`,
      });
    }
  }
}

console.log('PostgREST embed-constraint guard (US-336)');
console.log(`  constraint-hinted embeds checked: ${checked} (${unverifiable} unverifiable, passed)`);

if (findings.length > 0) {
  console.error(
    `\n❌ ${findings.length} embed(s) name a constraint that does not relate the two tables.\n` +
    '   PostgREST returns an error rather than rows, and a caller that throws on\n' +
    '   error fails outright. Embed across a real foreign key, or fetch the other\n' +
    '   table separately and join by id.\n'
  );
  for (const f of findings) {
    console.error(`    - ${f.file}:${f.line}  ${f.table}!${f.constraint} - ${f.why}`);
  }
  process.exit(1);
}

console.log('\n✔ Every constraint-hinted embed names a foreign key that relates its two tables.');
