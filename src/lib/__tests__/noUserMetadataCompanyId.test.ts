import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * US-266: the company lives on the profile (userProfile.company_id from
 * useAuth). The signup paths never write company_id into auth user_metadata,
 * so a page that read it there got undefined, disabled every query and showed
 * an empty ledger. Nine accounting pages did, and FiscalPeriods before them.
 *
 * Test files are scanned too: a mock that only sets user_metadata is how the
 * pages' tests passed while the pages loaded nothing.
 */
const SELF = join('src', 'lib', '__tests__', 'noUserMetadataCompanyId.test.ts');

// user_metadata.company_id, user_metadata?.company_id, user_metadata['company_id'],
// and `{ company_id } = ...user_metadata`.
const READS = [
  /user_metadata\s*\??\.\s*company_id\b/,
  /user_metadata\s*\??\.?\s*\[\s*['"`]company_id['"`]\s*\]/,
  /\{[^}]*\bcompany_id\b[^}]*\}\s*=\s*[\w?.]*user_metadata\b/,
];

function readsMetadataCompany(line: string): boolean {
  const t = line.trim();
  if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) return false;
  return READS.some((re) => re.test(line));
}

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      if (name === 'node_modules') continue;
      walk(path, out);
    } else if (/\.(ts|tsx)$/.test(name) && path !== SELF) {
      out.push(path);
    }
  }
  return out;
}

describe('company id source', () => {
  it('matches the shapes it is meant to catch, and not comments or mock objects', () => {
    expect(readsMetadataCompany('const companyId = user?.user_metadata?.company_id;')).toBe(true);
    expect(readsMetadataCompany('const c = user.user_metadata.company_id')).toBe(true);
    expect(readsMetadataCompany("const c = user?.user_metadata?.['company_id']")).toBe(true);
    expect(readsMetadataCompany('const { company_id } = user.user_metadata;')).toBe(true);
    expect(readsMetadataCompany(' * took its company from user.user_metadata.company_id')).toBe(false);
    expect(readsMetadataCompany("user: { id: 'u1', user_metadata: {} },")).toBe(false);
    expect(readsMetadataCompany('const companyId = userProfile?.company_id;')).toBe(false);
  });

  it('no file in src reads company_id from auth user_metadata', () => {
    const found = walk('src').flatMap((file) =>
      readFileSync(file, 'utf8')
        .split('\n')
        .map((line, i) => (readsMetadataCompany(line) ? `${file}:${i + 1}: ${line.trim()}` : null))
        .filter((x): x is string => x !== null),
    );
    expect(found, `read userProfile.company_id from useAuth() instead:\n${found.join('\n')}`).toEqual([]);
  });
});
