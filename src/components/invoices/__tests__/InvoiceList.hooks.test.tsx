import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import InvoiceList from '../InvoiceList';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: () => ({ update: () => ({ in: async () => ({ error: null }) }) }) },
}));
vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }));

/**
 * US-363: useRef and useVirtualizer sat below the `if (loading)` early return,
 * so the loading render ran two fewer hooks than the loaded one and React threw
 * "Rendered more hooks than during the previous render" the moment invoices
 * arrived. The list crashed on every load, which no snapshot of either state on
 * its own would catch - only the transition between them.
 */
describe('InvoiceList hook order', () => {
  const invoice = {
    id: 'inv-1',
    invoice_number: 'INV-001',
    status: 'sent',
    invoice_type: 'standard',
    invoice_date: '2026-01-05',
    due_date: '2026-02-05',
    total_amount: 1200,
    amount_paid: 0,
  };

  it('survives the loading -> loaded transition', () => {
    const { rerender } = render(
      <InvoiceList invoices={[]} loading={true} onInvoiceUpdate={vi.fn()} />
    );
    expect(screen.getByText(/loading invoices/i)).toBeInTheDocument();

    // The crash fired here, on the render that first ran the hoisted hooks.
    expect(() =>
      rerender(<InvoiceList invoices={[invoice]} loading={false} onInvoiceUpdate={vi.fn()} />)
    ).not.toThrow();

    expect(screen.getByText('INV-001')).toBeInTheDocument();
  });

  it('survives going back to loading', () => {
    const { rerender } = render(
      <InvoiceList invoices={[invoice]} loading={false} onInvoiceUpdate={vi.fn()} />
    );
    expect(() =>
      rerender(<InvoiceList invoices={[]} loading={true} onInvoiceUpdate={vi.fn()} />)
    ).not.toThrow();
  });
});
