import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * US-352 dropped the open INSERT policy on companies. Company creation goes
 * through create_company_for_current_user(), so a direct insert anywhere in
 * the client would now fail at runtime. This keeps one from being added.
 */
function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (name === 'node_modules' || name.startsWith('.')) continue;
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) && !p.endsWith('types.ts')) out.push(p);
  }
  return out;
}

describe('companies are created only through the provisioning RPC (US-352)', () => {
  it('no source file inserts or upserts into companies directly', () => {
    const offenders: string[] = [];
    for (const file of [...walk('src'), ...walk('supabase/functions')]) {
      const src = readFileSync(file, 'utf8');
      const re = /from\(\s*['"]companies['"]\s*\)([\s\S]{0,200})/g;
      for (const m of src.matchAll(re)) {
        if (/^\s*\.\s*(insert|upsert)\(/.test(m[1])) offenders.push(file);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('the policy drop is in a migration', () => {
    const sql = readFileSync('supabase/migrations/20260923060000_drop_open_companies_insert.sql', 'utf8');
    expect(sql).toContain('DROP POLICY IF EXISTS "Allow company creation for authenticated users" ON public.companies');
  });
});
