import { describe, it, expect } from 'vitest';
import { filterAndSortInvoices } from '../invoiceListUtils';

const invoices = [
  { id: '1', invoice_number: 'INV-003', client_name: 'Zeta', status: 'paid', invoice_date: '2026-03-10', due_date: '2026-04-10', total_amount: '500' },
  { id: '2', invoice_number: 'INV-001', client_name: 'Alpha', status: 'sent', invoice_date: '2026-01-05', due_date: '2026-02-05', total_amount: '1500' },
  { id: '3', invoice_number: 'INV-002', client_name: 'Mu', status: 'draft', invoice_date: '2026-02-20', due_date: '2026-03-20', total_amount: '250' },
];

const base = {
  statusFilter: 'all',
  dateField: 'invoice_date' as const,
  dateFrom: '',
  dateTo: '',
  sortField: 'invoice_number',
  sortDir: 'asc' as const,
};

describe('filterAndSortInvoices', () => {
  it('sorts by string column ascending and descending', () => {
    const asc = filterAndSortInvoices(invoices, { ...base, sortField: 'client_name', sortDir: 'asc' });
    expect(asc.map((i) => i.client_name)).toEqual(['Alpha', 'Mu', 'Zeta']);
    const desc = filterAndSortInvoices(invoices, { ...base, sortField: 'client_name', sortDir: 'desc' });
    expect(desc.map((i) => i.client_name)).toEqual(['Zeta', 'Mu', 'Alpha']);
  });

  it('sorts amount numerically (not lexically)', () => {
    const asc = filterAndSortInvoices(invoices, { ...base, sortField: 'total_amount', sortDir: 'asc' });
    expect(asc.map((i) => i.total_amount)).toEqual(['250', '500', '1500']); // not '1500','250','500'
  });

  it('filters by status', () => {
    const paid = filterAndSortInvoices(invoices, { ...base, statusFilter: 'paid' });
    expect(paid.map((i) => i.id)).toEqual(['1']);
  });

  it('filters by invoice date range (inclusive)', () => {
    const r = filterAndSortInvoices(invoices, {
      ...base,
      dateFrom: '2026-02-01',
      dateTo: '2026-03-31',
      sortField: 'invoice_date',
    });
    expect(r.map((i) => i.id)).toEqual(['3', '1']); // Feb 20 then Mar 10
  });

  it('filters by the due_date field when selected', () => {
    const r = filterAndSortInvoices(invoices, {
      ...base,
      dateField: 'due_date',
      dateFrom: '2026-03-01',
      dateTo: '2026-12-31',
      sortField: 'due_date',
    });
    expect(r.map((i) => i.id)).toEqual(['3', '1']); // due Mar 20, Apr 10
  });

  it('does not mutate the input array', () => {
    const copy = [...invoices];
    filterAndSortInvoices(invoices, { ...base, sortField: 'client_name' });
    expect(invoices).toEqual(copy);
  });
});
