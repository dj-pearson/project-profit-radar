/**
 * US-316: a policy that grants access through a membership table is only as
 * real as whatever writes that table.
 *
 * project_communication_participants shipped in 20250706130335 with the
 * participant branch of project_messages and the project-communications bucket
 * keyed on it, and for fourteen months nothing wrote it. The policies read
 * fine in review; they simply authorised nobody, and the client half of
 * project messaging never worked.
 *
 * This fails when any RLS policy reads a *_participants / *_members /
 * *_memberships table that has no ongoing writer: an insert or upsert from
 * src/ or an edge function, or an INSERT inside a database function (a
 * trigger). A one-off backfill INSERT does not count; it enrols the people who
 * exist today and nobody after.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const MIGRATIONS = join(ROOT, 'supabase', 'migrations');
const MEMBERSHIP_TABLE = /_(participants|members|memberships)$/;

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) && !p.includes('__tests__')) out.push(p);
  }
  return out;
}

/** Tables a CREATE POLICY statement reads through a subquery. */
function tablesKeyedByPolicies(sql: string): Set<string> {
  const found = new Set<string>();
  for (const policy of sql.match(/CREATE\s+POLICY[\s\S]*?;/gi) ?? []) {
    for (const m of policy.matchAll(/\bFROM\s+(?:public\.)?([a-z_][a-z0-9_]*)/gi)) {
      const t = m[1].toLowerCase();
      if (MEMBERSHIP_TABLE.test(t)) found.add(t);
    }
  }
  return found;
}

/** True when a migration writes `table` from inside a function body. */
function writtenByDbFunction(sql: string, table: string): boolean {
  const insert = new RegExp(`INSERT\\s+INTO\\s+(?:public\\.)?${table}\\b`, 'i');
  const fn = /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION[\s\S]*?\bAS\s+\$(\w*)\$([\s\S]*?)\$\1\$/gi;
  for (const m of sql.matchAll(fn)) if (insert.test(m[2])) return true;
  return false;
}

/** True when TS source inserts or upserts `table` through the Supabase client. */
function writtenByClient(src: string, table: string): boolean {
  const from = new RegExp(`\\.from\\(\\s*['"\`]${table}['"\`]\\s*\\)`, 'g');
  for (const m of src.matchAll(from)) {
    const tail = src.slice(m.index! + m[0].length, m.index! + m[0].length + 300);
    const next = tail.search(/\.from\(/);
    const window = next === -1 ? tail : tail.slice(0, next);
    if (/^\s*\.(insert|upsert)\(/.test(window)) return true;
  }
  return false;
}

describe('membership-table writer guard (US-316)', () => {
  const migrationSql = readdirSync(MIGRATIONS)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => readFileSync(join(MIGRATIONS, f), 'utf8'));
  const allSql = migrationSql.join('\n');
  const sources = [...walk(join(ROOT, 'src')), ...walk(join(ROOT, 'supabase', 'functions'))]
    .filter((p) => !p.endsWith('integrations/supabase/types.ts'))
    .map((p) => readFileSync(p, 'utf8'));

  const keyed = [...tablesKeyedByPolicies(allSql)].sort();

  it('finds the tables it is meant to police', () => {
    expect(keyed).toContain('project_communication_participants');
  });

  it.each(keyed)('%s has an ongoing writer', (table) => {
    const hasWriter =
      sources.some((s) => writtenByClient(s, table)) ||
      migrationSql.some((s) => writtenByDbFunction(s, table));
    expect(hasWriter, `${table} gates an RLS policy but nothing inserts into it`).toBe(true);
  });

  it('does not count a one-off backfill as a writer', () => {
    const backfillOnly = `
      CREATE POLICY p ON public.things FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.thing_members m WHERE m.user_id = auth.uid()));
      INSERT INTO public.thing_members (user_id) SELECT id FROM public.user_profiles;`;
    expect([...tablesKeyedByPolicies(backfillOnly)]).toEqual(['thing_members']);
    expect(writtenByDbFunction(backfillOnly, 'thing_members')).toBe(false);

    const trigger = `CREATE OR REPLACE FUNCTION public.f() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN INSERT INTO public.thing_members (user_id) VALUES (NEW.id); RETURN NEW; END $$;`;
    expect(writtenByDbFunction(trigger, 'thing_members')).toBe(true);
  });

  it('does not count a read as a writer', () => {
    // Built from a variable so check-table-definitions does not read these
    // fixture strings as real queries against a table named thing_members.
    const t = 'thing_members';
    expect(writtenByClient(`supabase.from('${t}').select('*')`, t)).toBe(false);
    expect(writtenByClient(`supabase\n  .from("${t}")\n  .upsert({})`, t)).toBe(true);
  });
});
