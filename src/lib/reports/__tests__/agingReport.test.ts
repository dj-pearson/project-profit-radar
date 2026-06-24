import { describe, it, expect } from 'vitest';
import {
  buildAgingRows,
  summarizeBuckets,
  bucketForDays,
  outstandingBalance,
  isOutstanding,
  totalOutstanding,
} from '../agingReport';

const asOf = new Date('2026-06-23T00:00:00Z');

describe('bucketForDays', () => {
  it('maps day counts to the correct bucket boundaries', () => {
    expect(bucketForDays(0)).toBe('current');
    expect(bucketForDays(30)).toBe('current');
    expect(bucketForDays(31)).toBe('31-60');
    expect(bucketForDays(60)).toBe('31-60');
    expect(bucketForDays(61)).toBe('61-90');
    expect(bucketForDays(90)).toBe('61-90');
    expect(bucketForDays(91)).toBe('90+');
    expect(bucketForDays(500)).toBe('90+');
  });
});

describe('outstandingBalance', () => {
  it('prefers amount_due when positive', () => {
    expect(outstandingBalance({ id: '1', invoice_number: 'A', client_name: null, due_date: null, status: 'sent', amount_due: 250, total_amount: 1000 })).toBe(250);
  });
  it('falls back to total minus paid', () => {
    expect(outstandingBalance({ id: '1', invoice_number: 'A', client_name: null, due_date: null, status: 'sent', total_amount: 1000, amount_paid: 400 })).toBe(600);
  });
  it('never returns negative', () => {
    expect(outstandingBalance({ id: '1', invoice_number: 'A', client_name: null, due_date: null, status: 'sent', total_amount: 100, amount_paid: 400 })).toBe(0);
  });
});

describe('isOutstanding', () => {
  it('excludes paid, void, draft, cancelled', () => {
    for (const status of ['paid', 'void', 'draft', 'cancelled']) {
      expect(isOutstanding({ id: '1', invoice_number: 'A', client_name: null, due_date: null, status, total_amount: 500 })).toBe(false);
    }
  });
  it('includes sent invoices with a balance', () => {
    expect(isOutstanding({ id: '1', invoice_number: 'A', client_name: null, due_date: null, status: 'sent', total_amount: 500 })).toBe(true);
  });
  it('excludes a sent invoice fully paid', () => {
    expect(isOutstanding({ id: '1', invoice_number: 'A', client_name: null, due_date: null, status: 'sent', total_amount: 500, amount_paid: 500 })).toBe(false);
  });
});

describe('buildAgingRows + summarizeBuckets', () => {
  const invoices = [
    // due 10 days ago -> current
    { id: '1', invoice_number: 'INV-1', client_name: 'Alpha', due_date: '2026-06-13', status: 'sent', total_amount: 1000 },
    // due 45 days ago -> 31-60
    { id: '2', invoice_number: 'INV-2', client_name: 'Beta', due_date: '2026-05-09', status: 'overdue', total_amount: 2000 },
    // due 75 days ago -> 61-90
    { id: '3', invoice_number: 'INV-3', client_name: 'Gamma', due_date: '2026-04-09', status: 'partial', total_amount: 3000, amount_paid: 1000 },
    // due 120 days ago -> 90+
    { id: '4', invoice_number: 'INV-4', client_name: 'Delta', due_date: '2026-02-23', status: 'overdue', total_amount: 4000 },
    // paid -> excluded
    { id: '5', invoice_number: 'INV-5', client_name: 'Eps', due_date: '2026-01-01', status: 'paid', total_amount: 9999 },
  ];

  it('buckets each invoice correctly and excludes paid', () => {
    const rows = buildAgingRows(invoices, asOf);
    expect(rows).toHaveLength(4);
    const byId = Object.fromEntries(rows.map((r) => [r.id, r]));
    expect(byId['1'].bucket).toBe('current');
    expect(byId['2'].bucket).toBe('31-60');
    expect(byId['3'].bucket).toBe('61-90');
    expect(byId['3'].outstanding).toBe(2000); // 3000 - 1000 paid
    expect(byId['4'].bucket).toBe('90+');
  });

  it('sorts rows by days outstanding descending', () => {
    const rows = buildAgingRows(invoices, asOf);
    expect(rows[0].id).toBe('4');
  });

  it('summarizes all four buckets with totals', () => {
    const rows = buildAgingRows(invoices, asOf);
    const summary = summarizeBuckets(rows);
    expect(summary.map((s) => s.key)).toEqual(['current', '31-60', '61-90', '90+']);
    expect(summary[0].total).toBe(1000);
    expect(summary[1].total).toBe(2000);
    expect(summary[2].total).toBe(2000);
    expect(summary[3].total).toBe(4000);
    expect(totalOutstanding(rows)).toBe(9000);
  });
});
