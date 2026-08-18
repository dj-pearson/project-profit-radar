import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Guards for storage privacy (US-289).
 *
 * project-documents, company-documents and project-communications were created
 * with public = true, and Supabase does not apply storage.objects RLS to reads
 * through the /object/public/ path, so every customer document, job-site photo
 * and chat attachment in them was world-readable to anyone holding the URL.
 * These tests stop that shape from being reintroduced.
 */

const MIGRATIONS_DIR = 'supabase/migrations';

/** Buckets that may legitimately be public: marketing and branding assets. */
const PUBLIC_ALLOWLIST = new Set(['site-assets', 'blog-images']);

function migrationFiles(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .map((f) => join(MIGRATIONS_DIR, f));
}

describe('storage bucket privacy', () => {
  it('creates no customer-content bucket with public = true', () => {
    const offenders: string[] = [];

    for (const file of migrationFiles()) {
      const sql = readFileSync(file, 'utf8');
      // ('<id>', '<name>', true ...) - the bucket-insert tuple shape used
      // across these migrations.
      const re = /\(\s*'([a-z0-9-]+)'\s*,\s*'[a-z0-9-]+'\s*,\s*true/gi;
      let m: RegExpExecArray | null;
      while ((m = re.exec(sql)) !== null) {
        const bucket = m[1];
        if (!PUBLIC_ALLOWLIST.has(bucket)) {
          offenders.push(`${file}: ${bucket}`);
        }
      }
    }

    // The three historical offenders are expected until the final US-289 flip
    // migration lands; this asserts no NEW ones appear alongside them.
    const KNOWN = [
      'project-documents',
      'company-documents',
      'project-communications',
    ];
    const unexpected = offenders.filter((o) => !KNOWN.some((k) => o.endsWith(`: ${k}`)));
    expect(unexpected, 'a new customer-content bucket was created public').toEqual([]);
  });

  it('keeps the app-side public allowlist to marketing assets only', async () => {
    const { PUBLIC_ASSET_BUCKETS } = await import('@/lib/storage/signedUrl');
    expect([...PUBLIC_ASSET_BUCKETS].sort()).toEqual([...PUBLIC_ALLOWLIST].sort());
  });
});

describe('no permanent public URLs are persisted', () => {
  const SKIP = ['__tests__', 'test', 'lib/storage'];

  function sourceFiles(dir: string, acc: string[] = []): string[] {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (SKIP.some((s) => full.includes(s))) continue;
      if (entry.isDirectory()) sourceFiles(full, acc);
      else if (/\.tsx?$/.test(entry.name)) acc.push(full);
    }
    return acc;
  }

  it('calls getPublicUrl only for allowlisted public buckets', () => {
    const offenders: string[] = [];
    const bucketCall = /\.from\(\s*['"`]([a-z0-9-]+)['"`]\s*\)[\s\S]{0,120}?\.getPublicUrl/g;

    for (const file of sourceFiles('src')) {
      const src = readFileSync(file, 'utf8');
      let m: RegExpExecArray | null;
      while ((m = bucketCall.exec(src)) !== null) {
        if (!PUBLIC_ALLOWLIST.has(m[1])) offenders.push(`${file}: ${m[1]}`);
      }
    }

    expect(offenders, 'getPublicUrl used on a private bucket').toEqual([]);
  });
});

describe('project-documents path convention', () => {
  /**
   * The original storage policy authorises project-documents objects by
   * matching the FIRST path segment against a project id. Most writers did not
   * follow that, and it went unnoticed because a public bucket never consults
   * a policy. New uploads must use <projectId>/<category>/... so the policy
   * matches directly.
   */
  const PROJECT_FIRST = [
    ['src/pages/DailyReports.tsx', '${newReport.project_id}/daily-reports/'],
    ['src/components/project/tabs/ProjectPunchList.tsx', '${projectId}/punch-list'],
    ['src/components/workflow/InspectionConductDialog.tsx', '${inspection.project_id}/inspections/'],
    ['src/components/mobile/VoiceNotes.tsx', '${note.projectId}/voice-notes/'],
  ] as const;

  it.each(PROJECT_FIRST)('%s writes a project-first path', (file, fragment) => {
    expect(readFileSync(file, 'utf8')).toContain(fragment);
  });

  it('keeps a supplementary read policy for the shapes that cannot be project-first', () => {
    const migration = readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.includes('project_documents_read_policies'))
      .map((f) => readFileSync(join(MIGRATIONS_DIR, f), 'utf8'))
      .join('\n');

    expect(migration, 'supplementary policy migration missing').toBeTruthy();
    // task-attachments resolves through tasks; voice notes through documents.
    expect(migration).toContain('task-attachments');
    expect(migration).toContain('public.documents');
    // Every branch has to be company-scoped, never a bare bucket_id check.
    expect(migration).toContain('get_user_company');
  });

  it('flips the three buckets private only after the policy migration', () => {
    const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort();
    const policyAt = files.findIndex((f) => f.includes('project_documents_read_policies'));
    const flipAt = files.findIndex((f) => f.includes('make_customer_buckets_private'));
    expect(policyAt, 'policy migration missing').toBeGreaterThan(-1);
    expect(flipAt, 'flip migration missing').toBeGreaterThan(-1);
    expect(flipAt, 'flip must run after the read policies exist').toBeGreaterThan(policyAt);
  });
});

