import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * SECURITY DEFINER functions run past RLS, so whatever tenancy check they carry
 * in their own body is the only thing scoping them. create_document_version
 * (US-305) carried none: any caller could pass another company's document id
 * and rewrite documents.file_path on it, which is the path every reader
 * downloads. These tests pin the guard that closed it.
 */
const MIGRATIONS_DIR = 'supabase/migrations';

function latestDefinitionOf(fnName: string): { file: string; body: string } {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  // Migrations are append-only history and CREATE OR REPLACE, so the last file
  // that defines the function is the one in effect.
  for (let i = files.length - 1; i >= 0; i -= 1) {
    const sql = readFileSync(join(MIGRATIONS_DIR, files[i]), 'utf8');
    const at = sql.indexOf(`FUNCTION public.${fnName}(`);
    if (at === -1) continue;
    return { file: files[i], body: sql.slice(at) };
  }
  throw new Error(`no migration defines public.${fnName}`);
}

describe('create_document_version is company-scoped (US-305)', () => {
  const { body } = latestDefinitionOf('create_document_version');

  it('still bypasses RLS, which is why the check has to be in the body', () => {
    expect(body).toContain('SECURITY DEFINER');
    expect(body).toContain("SET search_path = ''");
  });

  it('refuses a document belonging to another company', () => {
    expect(body).toContain('public.get_user_company(auth.uid())');
    expect(body).toContain('RAISE EXCEPTION');
    expect(body).toContain('insufficient_privilege');
  });

  it('does not deny a NULL company_id, which would strand historical rows', () => {
    expect(body).toContain('d.company_id IS NOT NULL');
  });

  it('keeps the signature clients already call', () => {
    // Renaming or dropping a parameter makes PostgREST fail to resolve the
    // call for every client that has not shipped yet (PGRST202).
    for (const param of [
      'p_document_id uuid',
      'p_file_path text',
      'p_file_size integer',
      'p_checksum text DEFAULT NULL',
      'p_version_notes text DEFAULT NULL',
    ]) {
      expect(body).toContain(param);
    }
    expect(body).toContain('RETURNS uuid');
  });
});

describe('company-documents supplementary read policy (US-289)', () => {
  const migration = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.includes('company_documents_read_policies'))
    .map((f) => readFileSync(join(MIGRATIONS_DIR, f), 'utf8'))
    .join('\n');

  it('exists', () => {
    expect(migration, 'company-documents read policy migration missing').toBeTruthy();
  });

  it('resolves legacy version objects through document_versions to a company', () => {
    expect(migration).toContain('public.document_versions');
    expect(migration).toContain('dv.file_path = storage.objects.name');
  });

  it('scopes every branch to the caller company', () => {
    expect(migration).toContain('public.get_user_company(auth.uid())');
    // A bare bucket_id check with no company predicate would authorise the
    // whole bucket for every authenticated user.
    const branches = migration.match(/EXISTS \(/g) ?? [];
    const scopes = migration.match(/get_user_company\(auth\.uid\(\)\)/g) ?? [];
    expect(scopes.length).toBeGreaterThanOrEqual(branches.length);
  });
});

/**
 * The audit trail must not be writable by a client (US-306).
 *
 * Two permissive INSERT policies on audit_logs carry no TO clause, so both
 * grant PUBLIC, and permissive policies OR together. A trail the audited actor
 * can write to is not evidence. The restrictive policy is what closes it, and
 * it can only do so while it stays restrictive - a permissive policy with the
 * same body would grant rather than deny.
 */
describe('audit_logs denies client writes (US-306)', () => {
  const migration = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.includes('restrict_audit_log_client_writes'))
    .map((f) => readFileSync(join(MIGRATIONS_DIR, f), 'utf8'))
    .join('\n');

  it('exists', () => {
    expect(migration, 'audit_logs write-restriction migration missing').toBeTruthy();
  });

  it('is RESTRICTIVE, so it is AND-ed with the permissive policies it cannot edit', () => {
    expect(migration).toContain('AS RESTRICTIVE');
  });

  it('denies every client write and leaves reads to the SELECT policies', () => {
    expect(migration).toContain('WITH CHECK (false)');
    expect(migration).toContain('USING (true)');
  });

  it('applies to the client roles only, never service_role', () => {
    expect(migration).toContain('TO authenticated, anon');
    expect(migration).not.toMatch(/TO\s+service_role/);
  });

  it('covers FOR ALL, not just INSERT', () => {
    // A later UPDATE or DELETE policy without a TO clause would reopen the
    // same hole from the other direction.
    expect(migration).toContain('FOR ALL');
  });
});

/**
 * The same open-write shape on ten more system tables (US-306 follow-up).
 *
 * Two of these are not just record-keeping. rate_limit_state carried an open
 * INSERT and an open UPDATE, so a client could reset the counter throttling it,
 * which is the whole of US-243's ceiling. affiliate_codes carried the same
 * pair, so a caller could mint a referral code or change its commission.
 */
describe('system tables deny client writes (US-306 follow-up)', () => {
  const migration = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.includes('restrict_client_writes_to_system_tables'))
    .map((f) => readFileSync(join(MIGRATIONS_DIR, f), 'utf8'))
    .join('\n');

  const TABLES = [
    'data_access_logs',
    'document_access_logs',
    'sensitive_data_access_log',
    'security_logs',
    'security_metrics',
    'api_request_logs',
    'ddos_detection_logs',
    'rate_limit_state',
    'affiliate_codes',
  ];

  it('exists', () => {
    expect(migration, 'system-table write-restriction migration missing').toBeTruthy();
  });

  it.each(TABLES)('covers %s', (table) => {
    expect(migration).toContain(`'${table}'`);
  });

  it('is RESTRICTIVE and denies writes without touching reads', () => {
    expect(migration).toContain('AS RESTRICTIVE');
    expect(migration).toContain('WITH CHECK (false)');
    expect(migration).toContain('USING (true)');
    expect(migration).toContain('TO authenticated, anon');
  });

  it('skips a table that does not exist rather than failing the migration', () => {
    expect(migration).toContain("to_regclass('public.' || t) IS NULL");
  });
});

describe('security_logs is written through the shared helper (US-306, US-300)', () => {
  // These writes used a user-JWT client, which the 20260827090000 restrictive
  // policy refuses; they were then moved behind writeSecurityLog, which reads
  // the error the raw inserts discarded. Whether the client is a service-role
  // one is checked by scripts/check-rls-write-paths.mjs, which follows the
  // helper's first argument and is mutation-tested - that check moved with the
  // write rather than being lost to the refactor.
  const SITES = [
    'supabase/functions/setup-mfa/index.ts',
    'supabase/functions/sso-manage/index.ts',
    'supabase/functions/verify-mfa-login/index.ts',
    'supabase/functions/sso-oauth-callback/index.ts',
  ];

  it.each(SITES)('%s logs through writeSecurityLog', (file) => {
    const src = readFileSync(file, 'utf8');
    expect(src).toContain('writeSecurityLog(');
    expect(src).toContain("_shared/security-log.ts");
  });

  it.each(SITES)('%s has no raw security_logs insert left', (file) => {
    const src = readFileSync(file, 'utf8');
    // A raw insert bypasses the helper, so it neither reads its error nor
    // gets its client checked.
    expect(src).not.toMatch(/\.from\(\s*["']security_logs["']\s*\)/);
  });

  it('the helper never throws, so a logging fault cannot take auth down', () => {
    const helper = readFileSync('supabase/functions/_shared/security-log.ts', 'utf8');
    expect(helper).toContain('SECURITY_LOG_WRITE_FAILED');
    // Every path is inside the try, and no path rethrows.
    expect(helper).not.toMatch(/^\s*throw /m);
  });
});
