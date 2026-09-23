/**
 * US-332: a new invoice starts from the company's payment terms, tax rate and
 * invoice terms, and a line can override the rate.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const h = vi.hoisted(() => ({
  invoke: vi.fn(),
  billing: {
    loaded: true,
    defaults: {
      taxRate: 8.25,
      paymentTermsDays: 15,
      terms: { estimate: '', invoice: 'Late payments accrue 1.5% a month.', change_order: '' },
      licenceLine: 'Licence CCB-123456',
      taxRates: [
        { id: 'r1', name: 'County', rate: 6, applies_to: 'all', is_default: false, is_active: true },
      ],
      company: { name: 'Reyes Builders', licenseLine: 'Licence CCB-123456' },
    },
  },
}));

vi.mock('@/hooks/useBillingDefaults', () => ({ useBillingDefaults: () => h.billing }));
vi.mock('@/integrations/supabase/client', () => {
  const q: Record<string, unknown> = {};
  Object.assign(q, {
    select: () => q, eq: () => q, order: () => Promise.resolve({ data: [], error: null }),
  });
  return { supabase: { from: () => q, functions: { invoke: h.invoke } } };
});
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/components/customers/ContactPicker', () => ({ ContactPicker: () => null }));
// Radix Select does not open in jsdom; a native select exercises the same
// onChange contract.
vi.mock('@/components/billing/LineTaxSelect', async () => {
  const { lineTaxChoice, lineTaxFromChoice } = await import('@/lib/companyBilling');
  return {
    LineTaxSelect: ({ value, onChange, rates, label, documentRate }: {
      value: { tax_rate: number | null; taxable: boolean };
      onChange: (v: unknown) => void;
      rates: Array<{ id: string; name: string; rate: number }>;
      label: string;
      documentRate: number;
    }) => (
      <select aria-label={label} value={lineTaxChoice(value)} onChange={(e) => onChange(lineTaxFromChoice(e.target.value))}>
        <option value="default">Document rate ({documentRate}%)</option>
        {rates.map((r) => <option key={r.id} value={`rate:${r.rate}`}>{r.name}</option>)}
        <option value="none">No tax</option>
      </select>
    ),
  };
});

import InvoiceGenerator from '../InvoiceGenerator';
import { dueDateFrom } from '@/lib/companyBilling';

// Plain DOM reads rather than jest-dom matchers, which the app tsconfig has
// no types for.
const valueOf = (el: Element) => {
  const v = (el as HTMLInputElement).value;
  return (el as HTMLInputElement).type === 'number' ? Number(v) : v;
};

beforeEach(() => {
  h.invoke.mockReset();
  h.invoke.mockResolvedValue({ data: { success: true, invoice: { id: 'i1', invoice_number: 'INV-0001' } }, error: null });
});

const fillLine = (index: number, description: string, qty: string, price: string) => {
  fireEvent.change(screen.getAllByLabelText('Description')[index], { target: { value: description } });
  fireEvent.change(screen.getAllByLabelText('Quantity')[index], { target: { value: qty } });
  fireEvent.change(screen.getAllByLabelText('Unit Price')[index], { target: { value: price } });
};

describe('InvoiceGenerator with company billing settings', () => {
  it('starts from the company payment terms, tax rate and invoice terms', async () => {
    render(<InvoiceGenerator />);
    await waitFor(() =>
      expect(valueOf(screen.getByLabelText('Due Date'))).toBe(dueDateFrom(new Date(), 15)));
    expect(valueOf(screen.getByLabelText('Invoice tax rate (%)'))).toBe(8.25);
    expect(valueOf(screen.getByLabelText('Terms & Conditions'))).toBe('Late payments accrue 1.5% a month.');
  });

  it('taxes each line at its own rate and sends the override', async () => {
    render(<InvoiceGenerator />);
    await waitFor(() => expect(valueOf(screen.getByLabelText('Invoice tax rate (%)'))).toBe(8.25));

    fireEvent.change(screen.getByLabelText('Client Name'), { target: { value: 'Reyes' } });
    fireEvent.change(screen.getByLabelText('Client Email'), { target: { value: 'reyes@example.com' } });

    fillLine(0, 'Framing labour', '1', '1000');
    fireEvent.click(screen.getByRole('button', { name: /Add Item/ }));
    fillLine(1, 'Lumber', '1', '1000');
    fireEvent.change(screen.getByLabelText('Tax for line 2'), { target: { value: 'rate:6' } });
    fireEvent.click(screen.getByRole('button', { name: /Add Item/ }));
    fillLine(2, 'Permit fee', '1', '100');
    fireEvent.change(screen.getByLabelText('Tax for line 3'), { target: { value: 'none' } });

    // 1000 at 8.25% + 1000 at 6% + 100 untaxed = 82.50 + 60.00
    expect(screen.getByText('Tax (8.25%):')).toBeTruthy();
    expect(screen.getByText('$82.50')).toBeTruthy();
    expect(screen.getByText('$60.00')).toBeTruthy();
    expect(screen.getByText('$2242.50')).toBeTruthy();

    fireEvent.submit(screen.getByRole('button', { name: /Generate Invoice/ }).closest('form')!);
    await waitFor(() => expect(h.invoke).toHaveBeenCalled());
    const body = h.invoke.mock.calls[0][1].body;
    expect(body.tax_rate).toBe(8.25);
    expect(body.terms).toBe('Late payments accrue 1.5% a month.');
    expect(body.line_items).toEqual([
      // No override: sent exactly as an old client would.
      { description: 'Framing labour', quantity: 1, unit_price: 1000 },
      { description: 'Lumber', quantity: 1, unit_price: 1000, tax_rate: 6 },
      { description: 'Permit fee', quantity: 1, unit_price: 100, taxable: false },
    ]);
  });
});
