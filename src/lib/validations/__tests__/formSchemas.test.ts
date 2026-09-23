import { describe, it, expect } from 'vitest';
import { optionalEmailField, requiredAmountField } from '../common';
import { journalEntryFormSchema, newJournalLine } from '../accounting';
import { bookingPageFormSchema, BOOKING_PAGE_DEFAULTS } from '../crm';
import { documentUploadFormSchema, DOCUMENT_UPLOAD_DEFAULTS } from '../documents';

// US-268 pass 3: the shared helpers and the schemas with cross-field rules.

describe('common form helpers', () => {
  it('optionalEmailField accepts empty or a valid address', () => {
    expect(optionalEmailField.safeParse('').success).toBe(true);
    expect(optionalEmailField.safeParse('a@b.co').success).toBe(true);
    expect(optionalEmailField.safeParse('a@').success).toBe(false);
  });

  it('requiredAmountField needs a number of 0 or more', () => {
    const f = requiredAmountField('x');
    expect(f.safeParse('0').success).toBe(true);
    expect(f.safeParse('12.5').success).toBe(true);
    expect(f.safeParse('').success).toBe(false);
    expect(f.safeParse('-1').success).toBe(false);
  });
});

describe('journalEntryFormSchema', () => {
  const line = (debit: number, credit: number, accountId = 'a') => ({ ...newJournalLine(), accountId, debitAmount: debit, creditAmount: credit });
  const base = { entryDate: '2026-01-31', description: 'Depreciation', memo: '' };

  it('passes a balanced two-line entry', () => {
    expect(journalEntryFormSchema.safeParse({ ...base, lines: [line(100, 0), line(0, 100)] }).success).toBe(true);
  });

  it('puts per-line problems on the line and imbalance on the grid', () => {
    const r = journalEntryFormSchema.safeParse({ ...base, lines: [line(100, 0, ''), line(0, 0)] });
    expect(r.success).toBe(false);
    const paths = r.success ? [] : r.error.issues.map((i) => i.path.join('.'));
    expect(paths).toEqual(['lines.0.accountId', 'lines.1.debitAmount']);

    const unbalanced = journalEntryFormSchema.safeParse({ ...base, lines: [line(100, 0), line(0, 90)] });
    expect(unbalanced.success ? [] : unbalanced.error.issues.map((i) => [i.path.join('.'), i.message])).toEqual([
      ['lines', 'Debits must equal credits'],
    ]);
  });
});

describe('bookingPageFormSchema', () => {
  it('needs a lowercase slug and at least 15 minutes', () => {
    const ok = { ...BOOKING_PAGE_DEFAULTS, title: 'Intro', slug: 'intro-call' };
    expect(bookingPageFormSchema.safeParse(ok).success).toBe(true);
    expect(bookingPageFormSchema.safeParse({ ...ok, slug: 'Intro Call' }).success).toBe(false);
    expect(bookingPageFormSchema.safeParse({ ...ok, duration_minutes: '10' }).success).toBe(false);
  });
});

describe('documentUploadFormSchema', () => {
  it('rejects an empty selection', () => {
    expect(documentUploadFormSchema.safeParse(DOCUMENT_UPLOAD_DEFAULTS).success).toBe(false);
  });
});
