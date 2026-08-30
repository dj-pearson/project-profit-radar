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

    // The three historical offenders still appear here and always will: the
    // flip is a later UPDATE, and rewriting a merged migration is forbidden.
    // What this asserts is that no NEW one appears alongside them.
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

  it('orders the flip migration after the read policies', () => {
    const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort();
    const policyAt = files.findIndex((f) => f.includes('project_documents_read_policies'));
    expect(policyAt, 'policy migration missing').toBeGreaterThan(-1);

    const flipAt = files.findIndex((f) => f.includes('make_customer_buckets_private'));
    expect(flipAt, 'flip migration missing').toBeGreaterThan(-1);
    expect(flipAt, 'flip must run after the read policies exist').toBeGreaterThan(policyAt);
  });
});

describe('VoiceNotes uploads to the path it records', () => {
  // The path written into documents.file_path and the path handed to
  // storage.upload() were two different expressions: the row said
  // `${note.projectId}/voice-notes/...` while the upload wrote a bare
  // `voice-notes/...`. Every note recorded against a project - all of them,
  // since InspectionConductDialog renders this with the inspection's project -
  // pointed at an object that was never there.
  const text = readFileSync('src/components/mobile/VoiceNotes.tsx', 'utf8');

  it('hands storagePath to upload rather than a second literal', () => {
    expect(text).toMatch(/\.upload\(storagePath,/);
    expect(text, 'a bare voice-notes/ literal is being uploaded again').not.toMatch(
      /\.upload\(`voice-notes\//,
    );
  });

  it('and records the same variable in documents.file_path', () => {
    expect(text).toMatch(/file_path:\s*storagePath/);
  });

  it('computes it before the upload, which is what made them able to disagree', () => {
    expect(text.indexOf('const storagePath =')).toBeLessThan(text.indexOf('.upload(storagePath'));
  });
});

/**
 * project-communications (US-289).
 *
 * Its three storage policies gate every object on membership in
 * project_communication_participants. Nothing writes that table - not the app,
 * not an edge function, not a trigger, not a seed - so the policies authorise
 * nobody. Uploads already fail (storage.objects RLS applies to INSERT whether
 * or not a bucket is public); reads only work because a public bucket serves
 * /object/public/ without consulting a policy, and would stop at the flip.
 */
describe('project-communications policy coverage', () => {
  const migration = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.includes('project_communications_company_policies'))
    .map((f) => readFileSync(join(MIGRATIONS_DIR, f), 'utf8'))
    .join('\n');

  it('has a supplementary policy migration at all', () => {
    expect(migration, 'project-communications policy migration missing').toBeTruthy();
  });

  it('carries the same company and role branch project_messages already has', () => {
    expect(migration).toContain('get_user_company');
    for (const role of ['admin', 'project_manager', 'root_admin']) {
      expect(migration, `${role} missing from the policy branch`).toContain(`'${role}'::user_role`);
    }
  });

  it('covers reads and uploads, since both were denied', () => {
    expect(migration).toMatch(/FOR SELECT/);
    expect(migration).toMatch(/FOR INSERT/);
  });

  it('does not drop the participant policies it sits beside', () => {
    // Policies are PERMISSIVE and OR together. Dropping the original would
    // remove access from any client who IS enrolled, and rewriting a merged
    // migration is forbidden outright.
    expect(migration).not.toMatch(/DROP POLICY[^\n]*participants can/i);
  });

  const WRITERS = [
    'src/components/communication/ProjectCommunication.tsx',
    'src/components/client-portal/ClientMessageCenter.tsx',
  ] as const;

  it.each(WRITERS)('%s writes <projectId>/<userId>/, which the policy keys on', (file) => {
    expect(readFileSync(file, 'utf8')).toContain('${projectId}/${user.id}/');
  });
});

describe('the flip itself', () => {
  const flip = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.includes('make_customer_buckets_private'))
    .map((f) => readFileSync(join(MIGRATIONS_DIR, f), 'utf8'))
    .join('\n');

  it('exists', () => {
    // A previous commit was titled "make customer-content buckets private
    // (US-289 final stage)", said in its body that the buckets "are now
    // public = false", and did not contain this file. The test that would have
    // caught it was added by that same commit and was red from the start.
    expect(flip, 'flip migration missing').toBeTruthy();
  });

  it('sets public = false for all three buckets', () => {
    // Read the UPDATE's own WHERE clause, not the file. Every bucket name also
    // appears in the pre-flight checks and the header, so a `toContain` on the
    // whole file passed with a bucket dropped from the UPDATE - which is the
    // one place it has to be.
    const update = /UPDATE storage\.buckets\s+SET public = false\s+WHERE id IN \(([^)]*)\)/.exec(flip);
    expect(update, 'no UPDATE ... SET public = false ... WHERE id IN (...)').toBeTruthy();
    for (const b of ['project-documents', 'company-documents', 'project-communications']) {
      expect(update![1], `${b} is not in the UPDATE`).toContain(`'${b}'`);
    }
  });

  it('warns rather than aborting when a bucket has no SELECT policy', () => {
    // A private bucket with no policy is an outage. Warning names it for
    // whoever applies this; failing the migration would just leave the
    // exposure open.
    expect(flip).toContain('RAISE WARNING');
    expect(flip).toContain('pg_policies');
  });

  it('counts objects matching no policy shape, which is what code cannot tell you', () => {
    // Files from a deleted feature, or put there by hand, have no call site to
    // audit. This is measured against production data at apply time.
    expect(flip).toContain('FROM storage.objects');
    expect(flip).toMatch(/NOT EXISTS/);
  });
});

/**
 * company-documents path convention (US-289).
 *
 * A SELECT policy on a public bucket has never run - Supabase does not consult
 * policies on the public read path - so its path assumption has never been
 * tested against what the app writes. That mismatch was found and fixed for
 * project-documents; company-documents had it too. Its policy (migration
 * 20250703014008) requires the first path segment to be the caller's company
 * id, and DocumentVersions uploaded under the user id instead, which no policy
 * matches. These guards keep every writer company-scoped so the flip does not
 * turn a silent access gap into a silent outage.
 */
describe('company-documents path convention', () => {
  const COMPANY_FIRST = [
    ['src/pages/DocumentTemplates.tsx', '`${companyId}/templates/'],
    ['src/components/documents/DocumentVersions.tsx', '`${companyId}/versions/'],
  ] as const;

  it.each(COMPANY_FIRST)('%s writes a company-first path', (file, fragment) => {
    expect(readFileSync(file, 'utf8')).toContain(fragment);
  });

  it('DocumentManagement picks the folder segment from the bucket it uploads to', () => {
    const src = readFileSync('src/pages/DocumentManagement.tsx', 'utf8');
    // One upload serves both buckets: project id for project-documents,
    // company id for company-documents. Both match their bucket's policy.
    expect(src).toContain("isProjectContext ? 'project-documents' : 'company-documents'");
    expect(src).toContain('isProjectContext ? projectId : userProfile?.company_id');
  });
});
