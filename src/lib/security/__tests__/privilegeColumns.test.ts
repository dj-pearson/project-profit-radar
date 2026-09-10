import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Guards for the privilege columns on user_profiles (US-337).
 *
 * The UPDATE policies on that table gate the ROW and never the COLUMNS, and
 * neither carries a WITH CHECK, so Postgres reuses USING for the new row -
 * which pins `id` and nothing else. role and company_id appear in no policy
 * expression, so a plain
 *
 *   PATCH /rest/v1/user_profiles?id=eq.<me>  {"role":"root_admin"}
 *
 * made any signed-in user a root admin. Every RLS policy in the schema
 * resolves authority through get_user_role(), which reads that column.
 *
 * The fix is a BEFORE UPDATE trigger, so these assertions are about the
 * migration existing and about no client ever writing those columns again.
 */

const MIGRATIONS_DIR = 'supabase/migrations';

function migrationText(fragment: string): string {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.includes(fragment))
    .map((f) => readFileSync(join(MIGRATIONS_DIR, f), 'utf8'))
    .join('\n');
}

describe('user_profiles privilege columns', () => {
  const migration = migrationText('lock_user_profile_privilege_columns');

  it('has a migration locking role and company_id', () => {
    expect(migration, 'privilege-column migration missing').toBeTruthy();
  });

  it('installs a BEFORE UPDATE trigger on user_profiles', () => {
    // AFTER would fire too late to reject the write, and a policy cannot see
    // OLD, which is why this is a trigger and not another policy.
    expect(migration).toMatch(/BEFORE UPDATE ON public\.user_profiles/);
    expect(migration).toMatch(/FOR EACH ROW/);
  });

  it('rejects the change rather than silently dropping it', () => {
    // A trigger that returned OLD instead would make the write look like it
    // succeeded, which is the failure mode US-309 exists for.
    expect(migration).toContain('RAISE EXCEPTION');
    expect(migration).toContain("ERRCODE = 'insufficient_privilege'");
  });

  it('keys on both columns, since either one alone is a full compromise', () => {
    const compare = /NEW\.role IS NOT DISTINCT FROM OLD\.role[\s\S]*?NEW\.company_id IS NOT DISTINCT FROM OLD\.company_id/;
    expect(migration, 'the guard must compare both role and company_id').toMatch(compare);
  });

  it('still lets the service role through, or every signup and invite breaks', () => {
    expect(migration).toContain("jwt_role = 'service_role'");
    // A migration or psql session carries no claims at all.
    expect(migration).toMatch(/claims IS NULL/);
  });

  it('does not lock is_active, which is the deactivate button', () => {
    // src/pages/admin/Users.tsx and TeamManagement.tsx toggle is_active with a
    // user JWT, and RLS already limits that to company admins. Locking it here
    // would break deactivation with a database error and no UX path out.
    expect(migration).not.toMatch(/NEW\.is_active IS NOT DISTINCT FROM OLD\.is_active/);
  });
});

describe('no client writes a privilege column', () => {
  const SKIP = ['__tests__', '/test/'];

  function sourceFiles(dir: string, acc: string[] = []): string[] {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (SKIP.some((s) => full.includes(s))) continue;
      if (entry.isDirectory()) sourceFiles(full, acc);
      else if (/\.tsx?$/.test(entry.name)) acc.push(full);
    }
    return acc;
  }

  it('never sends role or company_id in a user_profiles update from the browser', () => {
    // The trigger rejects these now, so a client that tries gets a raw
    // database error. Catch it here instead, where the message can say why.
    const offenders: string[] = [];
    const call =
      /\.from\(\s*['"`]user_profiles['"`]\s*\)[\s\S]{0,400}?\.(?:update|upsert)\(\s*\{([\s\S]{0,400}?)\}/g;

    for (const file of sourceFiles('src')) {
      const src = readFileSync(file, 'utf8');
      let m: RegExpExecArray | null;
      while ((m = call.exec(src)) !== null) {
        if (/\b(role|company_id)\s*:/.test(m[1])) {
          offenders.push(`${file}: writes ${/\brole\s*:/.test(m[1]) ? 'role' : 'company_id'}`);
        }
      }
    }

    expect(offenders, 'privilege column written from the browser').toEqual([]);
  });
});
