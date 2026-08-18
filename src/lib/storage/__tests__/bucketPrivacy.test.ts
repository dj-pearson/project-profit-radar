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
