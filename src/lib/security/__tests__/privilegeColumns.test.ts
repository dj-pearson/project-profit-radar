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

/**
 * US-339, the third door in the same family. US-337 was the UPDATE path and
 * US-338 the signup INSERT; this is the invite.
 *
 * send-auth-otp reads no Authorization header at all, yet accepted
 * type: 'invite_user' with a caller-supplied companyId and
 * metadata: z.record(z.any()). It wrote both into the OTP token, and
 * verify-auth-otp created the account with that company_id and role. Anyone
 * could invite themselves into any workspace as an admin and read the code
 * from their own inbox.
 *
 * Nothing legitimate used it. The real invite flow is invite-team-member,
 * which authenticates the caller and derives company and role from the
 * inviter's own profile.
 */
describe('the unauthenticated invite door stays shut', () => {
  const otp = readFileSync('supabase/functions/send-auth-otp/index.ts', 'utf8');

  /** The zod enum is what an unauthenticated caller can actually reach. */
  const typeEnum = (): string => {
    const m = /type:\s*z\.enum\(\[([\s\S]*?)\]\)/.exec(otp);
    expect(m, 'send-auth-otp type enum not found').toBeTruthy();
    return m![1];
  };

  it('does not accept invite_user', () => {
    expect(typeEnum(), 'send-auth-otp accepts invite_user again').not.toContain('invite_user');
  });

  it('still accepts the account-scoped flows it is for', () => {
    for (const t of ['confirm_signup', 'magic_link', 'reset_password']) {
      expect(typeEnum()).toContain(t);
    }
  });

  it('takes no company or invite metadata from the body', () => {
    // Assert on the schema, not the file: every one of these names also appears
    // in the comment explaining why it was removed.
    const schema = /const sendOTPSchema = z\.object\(\{([\s\S]*?)\n\}\);/.exec(otp);
    expect(schema, 'sendOTPSchema not found').toBeTruthy();
    const fields = schema![1]
      .split('\n')
      .filter((l) => !l.trimStart().startsWith('//'))
      .join('\n');
    for (const field of ['companyId', 'inviterUserId', 'metadata']) {
      expect(fields, `${field} is caller-supplied again`).not.toMatch(
        new RegExp(`\\b${field}\\s*:`)
      );
    }
  });

  it('writes null company and empty metadata into the token', () => {
    expect(otp).toMatch(/p_company_id:\s*null/);
    expect(otp).toMatch(/p_metadata:\s*\{\}/);
  });

  it('leaves the authenticated invite path as the only way in', () => {
    // invite-team-member resolves the inviter server-side. If this stops being
    // true, the guarded door is no longer guarded.
    const invite = readFileSync('supabase/functions/invite-team-member/index.ts', 'utf8');
    expect(invite).toContain('initializeAuthContext');
    expect(invite).toMatch(/\.from\(\s*["\x27]user_profiles["\x27]\s*\)[\s\S]{0,200}?\.eq\(\s*["\x27]id["\x27],\s*user\.id/);
  });
});
