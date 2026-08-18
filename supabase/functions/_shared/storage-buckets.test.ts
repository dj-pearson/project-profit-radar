import { describe, it, expect } from 'vitest';
import {
  COMPANY_BUCKETS,
  ERASABLE_BUCKETS,
  PERSONAL_BUCKETS,
  PUBLIC_ASSET_BUCKETS,
  isCompanyBucket,
  isInErasureScope,
  isPersonalBucket,
} from './storage-buckets.ts';

/**
 * Erasure-scope rules for DSAR fulfillment (US-290).
 *
 * The failure this guards against is a departing employee's deletion request
 * wiping their employer's inspection photos and receipts - records the company
 * may be required to retain and that Brikly holds as a processor, not a
 * controller. The inverse failure matters too: a sole proprietor's company
 * content is effectively their personal data and must not survive erasure.
 */
describe('erasure scope', () => {
  it('always erases personal content', () => {
    for (const bucket of PERSONAL_BUCKETS) {
      expect(isInErasureScope(bucket, false), `${bucket} with others at company`).toBe(true);
      expect(isInErasureScope(bucket, true), `${bucket} as last user`).toBe(true);
    }
  });

  it('retains company content while other users remain', () => {
    for (const bucket of COMPANY_BUCKETS) {
      expect(isInErasureScope(bucket, false), `${bucket} must survive`).toBe(false);
    }
  });

  it('erases company content once the subject is the last user', () => {
    for (const bucket of COMPANY_BUCKETS) {
      expect(isInErasureScope(bucket, true), `${bucket} must be erased`).toBe(true);
    }
  });

  it('never erases deliberately public marketing assets', () => {
    for (const bucket of PUBLIC_ASSET_BUCKETS) {
      expect(isInErasureScope(bucket, false)).toBe(false);
      expect(isInErasureScope(bucket, true)).toBe(false);
    }
  });

  it('treats an unknown bucket as out of scope rather than guessing', () => {
    expect(isInErasureScope('some-new-bucket', true)).toBe(false);
    expect(isInErasureScope('some-new-bucket', false)).toBe(false);
  });
});

describe('bucket registry', () => {
  it('classifies every bucket exactly once', () => {
    const all = [...PERSONAL_BUCKETS, ...COMPANY_BUCKETS, ...PUBLIC_ASSET_BUCKETS];
    expect(new Set(all).size, 'a bucket appears in two categories').toBe(all.length);
  });

  it('makes every personal and company bucket erasable', () => {
    expect([...ERASABLE_BUCKETS].sort()).toEqual(
      [...PERSONAL_BUCKETS, ...COMPANY_BUCKETS].sort(),
    );
  });

  it('keeps the predicates consistent with the lists', () => {
    for (const b of PERSONAL_BUCKETS) {
      expect(isPersonalBucket(b)).toBe(true);
      expect(isCompanyBucket(b)).toBe(false);
    }
    for (const b of COMPANY_BUCKETS) {
      expect(isCompanyBucket(b)).toBe(true);
      expect(isPersonalBucket(b)).toBe(false);
    }
  });

  it('covers every bucket the app writes customer data to', () => {
    // Buckets found by sweeping storage.from(...) call sites in src/ and the
    // CREATE statements in supabase/migrations. A new upload target must be
    // classified here or DSAR erasure will silently skip it.
    const known = [
      'project-documents', 'company-documents', 'project-communications',
      'project-files', 'documents', 'templates', 'signatures',
      'call-recordings', 'email-attachments', 'expense-receipts', 'receipts',
      'avatars', 'site-assets', 'blog-images',
    ];
    const classified = new Set<string>([
      ...PERSONAL_BUCKETS, ...COMPANY_BUCKETS, ...PUBLIC_ASSET_BUCKETS,
    ]);
    const missing = known.filter((b) => !classified.has(b));
    expect(missing, 'unclassified buckets').toEqual([]);
  });
});
