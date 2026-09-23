/**
 * US-332: the billing settings form. Validates before it writes, and the
 * numbering rows never mint a number the company already used or send back a
 * stale counter.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const COMPANY = 'company-a';
const YEAR = new Date().getFullYear();

type Row = Record<string, unknown>;
const h = vi.hoisted(() => ({
  data: {} as Record<string, Row[]>,
  writes: [] as Array<{ op: string; table: string; payload: unknown; filters: Array<[string, unknown]> }>,
  toast: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => {
  const from = (table: string) => {
    const filters: Array<[string, unknown]> = [];
    let op: string | null = null;
    let payload: unknown = null;
    const rows = () => (h.data[table] ?? []).filter((r) =>
      filters.every(([c, v]) => r[c] === v));
    const settle = () => {
      if (op) h.writes.push({ op, table, payload, filters: [...filters] });
      return { data: op ? null : rows(), error: null };
    };
    const q: Record<string, unknown> = {
      select: () => q,
      order: () => q,
      limit: () => q,
      neq: () => q,
      eq: (c: string, v: unknown) => { filters.push([c, v]); return q; },
      maybeSingle: () => Promise.resolve({ data: rows()[0] ?? null, error: null }),
      update: (p: unknown) => { op = 'update'; payload = p; return q; },
      delete: () => { op = 'delete'; return q; },
      insert: (p: unknown) => { op = 'insert'; payload = p; return Promise.resolve(settle()); },
      upsert: (p: unknown) => { op = 'upsert'; payload = p; return Promise.resolve(settle()); },
      then: (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) =>
        Promise.resolve(settle()).then(res, rej),
    };
    return q;
  };
  return { supabase: { from: vi.fn(from) } };
});

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ userProfile: { id: 'u1', company_id: COMPANY, role: 'admin' } }),
}));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: h.toast }) }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() } }));
vi.mock('@/components/ui/confirm-dialog', () => ({ confirmAction: vi.fn().mockResolvedValue(true) }));

import { CompanyBillingSettings } from '../CompanyBillingSettings';

const renderCard = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <CompanyBillingSettings />
      </MemoryRouter>
    </QueryClientProvider>
  );

// Plain DOM reads rather than jest-dom matchers, which the app tsconfig has
// no types for.
const valueOf = (el: Element) => {
  const v = (el as HTMLInputElement).value;
  return (el as HTMLInputElement).type === 'number' ? Number(v) : v;
};

beforeEach(() => {
  h.writes.length = 0;
  h.toast.mockClear();
  h.data = {
    company_settings: [{
      company_id: COMPANY,
      default_tax_rate: 8.25,
      default_payment_terms_days: 30,
      license_number: 'CCB-123456',
      insurance_carrier: null,
      insurance_policy_number: null,
      insurance_expires_on: null,
      estimate_terms: null,
      invoice_terms: 'Net 30',
      change_order_terms: null,
    }],
    tax_rates: [],
    document_number_settings: [
      { company_id: COMPANY, doc_type: 'estimate', prefix: 'EST-', include_year: false, pad_width: 4, next_number: 42 },
    ],
    // The old shared sequence already minted this one for the company.
    invoices: [{ id: 'inv-1', company_id: COMPANY, invoice_number: `INV-${YEAR}-0001` }],
  };
});

describe('CompanyBillingSettings', () => {
  it('loads the saved settings into the form', async () => {
    renderCard();
    expect(valueOf(await screen.findByLabelText('Default tax rate (%)'))).toBe(8.25);
    expect(valueOf(screen.getByLabelText('Licence number'))).toBe('CCB-123456');
    expect(valueOf(screen.getByLabelText('On invoices'))).toBe('Net 30');
  });

  it('refuses a tax rate over 100 without writing anything', async () => {
    renderCard();
    fireEvent.change(await screen.findByLabelText('Default tax rate (%)'), { target: { value: '150' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save billing settings' }));
    expect(await screen.findByText('A tax rate is a percentage, 100 at most')).toBeTruthy();
    expect(h.writes.filter((w) => w.op === 'upsert')).toHaveLength(0);
  });

  it('saves valid settings for the company, as numbers', async () => {
    renderCard();
    fireEvent.change(await screen.findByLabelText('Payment terms (days)'), { target: { value: '15' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save billing settings' }));
    await waitFor(() => expect(h.writes.some((w) => w.op === 'upsert')).toBe(true));
    const saved = h.writes.find((w) => w.op === 'upsert')!;
    expect(saved.table).toBe('company_settings');
    expect(saved.payload).toMatchObject({
      company_id: COMPANY,
      default_payment_terms_days: 15,
      default_tax_rate: 8.25,
      insurance_expires_on: null,
    });
    expect(h.toast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Billing settings saved',
      description: 'New invoices will be net 15.',
    }));
  });

  it('refuses numbering whose first number is already on one of the company invoices', async () => {
    renderCard();
    await screen.findByLabelText('Default tax rate (%)');
    // The suggested format is exactly the old sequence's: INV-<year>-0001.
    fireEvent.click(screen.getAllByRole('button', { name: 'Use this numbering' })[0]);
    expect((await screen.findByRole('alert')).textContent).toContain(`INV-${YEAR}-0001 is already on one of your invoices`);
    expect(h.writes.filter((w) => w.table === 'document_number_settings')).toHaveLength(0);
  });

  it('sets up numbering once the start is past the numbers already used', async () => {
    const { container } = renderCard();
    await screen.findByLabelText('Default tax rate (%)');
    fireEvent.change(container.querySelector('#next-invoice')!, { target: { value: '50' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Use this numbering' })[0]);
    await waitFor(() =>
      expect(h.writes.some((w) => w.table === 'document_number_settings' && w.op === 'insert')).toBe(true));
    expect(h.writes.find((w) => w.op === 'insert')!.payload).toEqual({
      company_id: COMPANY, doc_type: 'invoice', prefix: 'INV-', include_year: true, pad_width: 4, next_number: 50,
    });
  });

  it('sends only the changed field on a configured row, never a stale counter', async () => {
    const { container } = renderCard();
    await screen.findByLabelText('Default tax rate (%)');
    const prefix = container.querySelector('#prefix-estimate')!;
    fireEvent.change(prefix, { target: { value: 'Q-' } });
    fireEvent.blur(prefix);
    await waitFor(() =>
      expect(h.writes.some((w) => w.table === 'document_number_settings' && w.op === 'update')).toBe(true));
    const update = h.writes.find((w) => w.op === 'update')!;
    expect(update.payload).toEqual({ prefix: 'Q-' });
    expect(update.filters).toEqual([['company_id', COMPANY], ['doc_type', 'estimate']]);
  });

  it('refuses a prefix with characters that break filenames', async () => {
    const { container } = renderCard();
    await screen.findByLabelText('Default tax rate (%)');
    const prefix = container.querySelector('#prefix-estimate')!;
    fireEvent.change(prefix, { target: { value: 'EST #' } });
    fireEvent.blur(prefix);
    expect((await screen.findByRole('alert')).textContent).toContain('Letters, digits and - _ . / only');
    expect(h.writes.filter((w) => w.table === 'document_number_settings')).toHaveLength(0);
  });
});
