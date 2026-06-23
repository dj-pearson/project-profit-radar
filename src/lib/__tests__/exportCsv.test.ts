import { describe, it, expect } from 'vitest';
import { toCsv, escapeCsvField, type CsvColumn } from '../exportCsv';

interface Row { name: string; amount: number; note: string | null; }

const columns: CsvColumn<Row>[] = [
  { header: 'Name', value: (r) => r.name },
  { header: 'Amount', value: (r) => r.amount },
  { header: 'Note', value: (r) => r.note },
];

describe('escapeCsvField', () => {
  it('leaves plain values untouched', () => {
    expect(escapeCsvField('hello')).toBe('hello');
    expect(escapeCsvField(42)).toBe('42');
  });
  it('returns empty string for null/undefined', () => {
    expect(escapeCsvField(null)).toBe('');
    expect(escapeCsvField(undefined)).toBe('');
  });
  it('quotes and escapes values with commas, quotes, newlines', () => {
    expect(escapeCsvField('a,b')).toBe('"a,b"');
    expect(escapeCsvField('say "hi"')).toBe('"say ""hi"""');
    expect(escapeCsvField('line1\nline2')).toBe('"line1\nline2"');
  });
});

describe('toCsv', () => {
  it('builds a header-only string for empty rows', () => {
    expect(toCsv<Row>([], columns)).toBe('Name,Amount,Note');
  });
  it('serializes rows and escapes fields', () => {
    const rows: Row[] = [
      { name: 'Acme, Inc', amount: 1000, note: null },
      { name: 'Beta', amount: 250, note: 'paid "early"' },
    ];
    const csv = toCsv(rows, columns);
    expect(csv).toBe(
      'Name,Amount,Note\n"Acme, Inc",1000,\nBeta,250,"paid ""early"""'
    );
  });
});
