/**
 * US-086: export center schedule + recipient helpers
 */
import { describe, it, expect } from 'vitest';
import {
  nextRunDate,
  parseRecipients,
  hasInvalidRecipient,
  validateSchedule,
  REPORT_TEMPLATES,
  EXPORT_FORMATS,
} from '@/lib/export-center';

describe('metadata (US-086)', () => {
  it('offers at least 5 report templates and 3 formats', () => {
    expect(REPORT_TEMPLATES.length).toBeGreaterThanOrEqual(5);
    expect(EXPORT_FORMATS.map((f) => f.id).sort()).toEqual(['csv', 'excel', 'pdf']);
  });
});

describe('nextRunDate (US-086)', () => {
  it('advances daily/weekly', () => {
    expect(nextRunDate('daily', '2026-03-10')).toBe('2026-03-11');
    expect(nextRunDate('weekly', '2026-03-10')).toBe('2026-03-17');
  });
  it('advances monthly and clamps end-of-month', () => {
    expect(nextRunDate('monthly', '2026-03-15')).toBe('2026-04-15');
    expect(nextRunDate('monthly', '2026-01-31')).toBe('2026-02-28');
  });
});

describe('parseRecipients (US-086)', () => {
  it('splits, dedupes, and keeps only valid emails', () => {
    expect(parseRecipients('a@x.com, b@y.com; a@x.com  c@z.com')).toEqual(['a@x.com', 'b@y.com', 'c@z.com']);
  });
  it('drops invalid tokens', () => {
    expect(parseRecipients('good@x.com, notanemail')).toEqual(['good@x.com']);
  });
  it('flags invalid tokens', () => {
    expect(hasInvalidRecipient('good@x.com, nope')).toBe(true);
    expect(hasInvalidRecipient('good@x.com, fine@y.com')).toBe(false);
  });
});

describe('validateSchedule (US-086)', () => {
  it('passes a complete form', () => {
    expect(
      validateSchedule({ name: 'Weekly financials', frequency: 'weekly', recipientsRaw: 'ceo@co.com', startDate: '2026-03-01' })
    ).toEqual([]);
  });
  it('flags each missing/invalid field', () => {
    const errors = validateSchedule({ name: ' ', frequency: '', recipientsRaw: 'bad', startDate: '' });
    expect(errors).toContain('Schedule name is required.');
    expect(errors).toContain('Choose a frequency.');
    expect(errors).toContain('Choose a start date.');
    expect(errors).toContain('Add at least one valid recipient email.');
  });
  it('flags a partially-invalid recipient list', () => {
    const errors = validateSchedule({ name: 'X', frequency: 'daily', recipientsRaw: 'ok@x.com, nope', startDate: '2026-01-01' });
    expect(errors).toContain('One or more recipient emails are invalid.');
  });
});
