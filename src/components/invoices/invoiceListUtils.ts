/**
 * Pure filter + sort logic for the invoices list (US-088). Kept out of the
 * component so it can be unit-tested without rendering.
 */
export interface InvoiceFilterSortOptions {
  statusFilter: string; // 'all' | 'draft' | 'sent' | 'paid' | 'overdue' | ...
  dateField: 'invoice_date' | 'due_date';
  dateFrom: string; // 'YYYY-MM-DD' or ''
  dateTo: string; // 'YYYY-MM-DD' or ''
  sortField: string;
  sortDir: 'asc' | 'desc';
}

const NUMERIC_FIELDS = new Set(['total_amount', 'amount_paid', 'amount_due']);

export function filterAndSortInvoices<T extends Record<string, any>>(
  invoices: T[],
  opts: InvoiceFilterSortOptions,
): T[] {
  const { statusFilter, dateField, dateFrom, dateTo, sortField, sortDir } = opts;

  const filtered = invoices.filter((inv) => {
    if (statusFilter !== 'all' && (inv.status || 'draft') !== statusFilter) return false;
    const raw = inv[dateField] || inv.invoice_date || inv.created_at;
    const d = raw ? String(raw).slice(0, 10) : '';
    if (dateFrom && d && d < dateFrom) return false;
    if (dateTo && d && d > dateTo) return false;
    return true;
  });

  return [...filtered].sort((a, b) => {
    let av: any = a[sortField];
    let bv: any = b[sortField];
    if (NUMERIC_FIELDS.has(sortField)) {
      av = parseFloat(av || 0);
      bv = parseFloat(bv || 0);
    } else {
      av = (av ?? '').toString().toLowerCase();
      bv = (bv ?? '').toString().toLowerCase();
    }
    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });
}
