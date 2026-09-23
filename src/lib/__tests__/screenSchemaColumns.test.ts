/**
 * US-369: columns eight screens depend on must be added by a migration that
 * runs on every database, not only declared inside a CREATE TABLE IF NOT
 * EXISTS that is a no-op wherever an older shape of the table already exists.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const MIGRATIONS = 'supabase/migrations';
const MIGRATION = join(MIGRATIONS, '20260924120000_columns_screens_depend_on.sql');

const stripSql = (sql: string) =>
  sql
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((line) => line.replace(/--.*$/, ''))
    .join('\n');

const allMigrations = readdirSync(MIGRATIONS)
  .filter((f) => f.endsWith('.sql'))
  .map((f) => stripSql(readFileSync(join(MIGRATIONS, f), 'utf8')))
  .join('\n');

const migration = stripSql(readFileSync(MIGRATION, 'utf8'));

// table, column, and a file that reads or writes it
const DEPENDENCIES: Array<[string, string, string]> = [
  ['company_settings', 'enable_ai_features', 'src/hooks/useAIFeatures.ts'],
  ['company_settings', 'enable_ai_data_sharing', 'src/hooks/useAIFeatures.ts'],
  ['data_subject_requests', 'user_id', 'src/components/legal/PrivacyControls.tsx'],
  ['data_subject_requests', 'email', 'src/components/legal/PrivacyControls.tsx'],
  ['data_subject_requests', 'source', 'src/components/legal/PrivacyControls.tsx'],
  ['email_preferences', 'marketing', 'src/pages/legal/EmailPreferences.tsx'],
  ['punch_list_items', 'notes', 'src/pages/PunchList.tsx'],
  ['client_portal_access', 'access_level', 'src/components/project/ProjectClientAccess.tsx'],
  ['client_portal_access', 'last_accessed_at', 'src/components/project/ProjectClientAccess.tsx'],
  ['time_entries', 'notes', 'src/components/time-tracking/QuickTimeEntry.tsx'],
  ['audit_logs', 'risk_level', 'src/pages/ComplianceAudit.tsx'],
  ['ai_model_configurations', 'task_type', 'src/components/admin/AIModelManager.tsx'],
];

describe('screen columns are guaranteed by a migration (US-369)', () => {
  // ADD COLUMN IF NOT EXISTS, or a plain ADD COLUMN inside an
  // information_schema guard (20260204000000 adds task_type that way).
  it.each(DEPENDENCIES)('%s.%s is added by an ALTER TABLE ... ADD COLUMN', (table, column, file) => {
    expect(readFileSync(file, 'utf8')).toContain(column);
    const added = new RegExp(
      `ALTER TABLE (?:public\\.)?${table}\\b[^;]*?ADD COLUMN (?:IF NOT EXISTS )?${column}\\b`,
      'i',
    );
    expect(allMigrations).toMatch(added);
  });

  it('is additive only: nothing dropped, renamed, tightened or re-policied', () => {
    expect(migration).not.toMatch(/SET\s+NOT\s+NULL/i);
    expect(migration).not.toMatch(/DROP\s+(COLUMN|TABLE|TYPE|FUNCTION)/i);
    expect(migration).not.toMatch(/RENAME/i);
    expect(migration).not.toMatch(/\b(CREATE|DROP|ALTER)\s+POLICY\b/i);
    expect(migration).not.toMatch(/ADD\s+COLUMN\s+(?!IF NOT EXISTS)/i);
  });

  it('does not opt back in users who unsubscribed through marketing_emails', () => {
    // A bare DEFAULT TRUE on a new marketing column would silently re-subscribe
    // them; the seed only runs when the column did not exist before.
    expect(migration).toMatch(/IF NOT had_marketing AND EXISTS/);
    expect(migration).toMatch(/SET marketing = FALSE WHERE marketing_emails IS FALSE/);
  });

  it('does not stamp every existing DSAR with a deadline 30 days from the migration', () => {
    expect(migration).toMatch(/ADD COLUMN IF NOT EXISTS due_at TIMESTAMPTZ;/);
    expect(migration).toMatch(/SET due_at = due_date::timestamptz/);
  });

  it('lets self-service DSAR inserts through the older table shape', () => {
    expect(migration).toMatch(/ARRAY\['requester_email', 'company_id'\]/);
    expect(migration).toMatch(/DROP NOT NULL/);
  });
});

describe('type generation reads the self-hosted database (US-369)', () => {
  const script = readFileSync('scripts/gen-supabase-types.mjs', 'utf8');

  it('passes SUPABASE_DB_URL to --db-url and has no cloud project default', () => {
    expect(script).toMatch(/process\.env\.SUPABASE_DB_URL/);
    expect(script).toMatch(/'--db-url', DB_URL/);
    expect(script).not.toMatch(/SUPABASE_PROJECT_ID \|\| /);
  });

  it('keeps the connection string out of its error output', () => {
    expect(script).toMatch(/split\(DB_URL\)\.join\('<SUPABASE_DB_URL>'\)/);
  });
});
