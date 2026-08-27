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
