import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// US-268: the Fiscal Periods "Create Fiscal Year" and Chart of Accounts
// dialogs validate with react-hook-form + src/lib/validations/accounting.ts.

const h = vi.hoisted(() => ({
  insert: vi.fn(),
  createAccount: vi.fn(),
  updateAccount: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  // The pages read the company from the profile (US-266); user_metadata is
  // left empty, as the signup paths leave it.
  useAuth: () => ({ user: { id: 'u-1', user_metadata: {} }, userProfile: { id: 'u-1', company_id: 'co-1' } }),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/integrations/supabase/client', () => {
  const list = () => {
    const q: Record<string, unknown> = {};
    for (const m of ['select', 'eq', 'order']) q[m] = () => q;
    q.then = (res: (v: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(res);
    return q;
  };
  return {
    supabase: {
      from: (table: string) => ({
        ...list(),
        insert: (row: unknown) => {
          h.insert(table, row);
          // Writes are read back: .single() for the year, the rows for the periods.
          const rows = (Array.isArray(row) ? row : [row]).map((r, i) => ({ ...(r as object), id: `row-${i}` }));
          return {
            select: () => ({
              single: () => Promise.resolve({ data: { id: 'fy-1' }, error: null }),
              then: (res: (v: unknown) => unknown) => Promise.resolve({ data: rows, error: null }).then(res),
            }),
            then: (res: (v: unknown) => unknown) => Promise.resolve({ error: null }).then(res),
          };
        },
      }),
    },
  };
});
vi.mock('@/hooks/useAccounting', () => ({
  useChartOfAccounts: () => ({ data: [], isLoading: false }),
  useCreateAccount: () => ({ mutateAsync: h.createAccount }),
  useUpdateAccount: () => ({ mutateAsync: h.updateAccount }),
}));

import FiscalPeriods from '../FiscalPeriods';
import ChartOfAccounts from '../ChartOfAccounts';

const wrap = (ui: React.ReactElement) =>
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>);

beforeEach(() => {
  vi.clearAllMocks();
  h.createAccount.mockResolvedValue({});
});

describe('Create Fiscal Year dialog', () => {
  it('rejects an end date before the start inline and creates nothing', async () => {
    const user = userEvent.setup();
    wrap(<FiscalPeriods />);
    await user.click(screen.getByRole('button', { name: 'Create new fiscal year' }));
    const end = screen.getByLabelText('End Date');
    await user.clear(end);
    await user.type(end, '2020-01-01');
    await user.click(screen.getByRole('button', { name: 'Create Fiscal Year' }));

    expect(await screen.findByText('End date must be after the start date')).toBeInTheDocument();
    expect(end).toHaveAttribute('aria-invalid', 'true');
    expect(h.insert).not.toHaveBeenCalled();
  });

  it('inserts the same fiscal_years row', async () => {
    const user = userEvent.setup();
    wrap(<FiscalPeriods />);
    await user.click(screen.getByRole('button', { name: 'Create new fiscal year' }));
    await user.click(screen.getByRole('button', { name: 'Create Fiscal Year' }));

    const year = new Date().getFullYear();
    await waitFor(() =>
      expect(h.insert).toHaveBeenCalledWith('fiscal_years', {
        company_id: 'co-1',
        year_number: year,
        start_date: `${year}-01-01`,
        end_date: `${year}-12-31`,
      }),
    );
    await waitFor(() => expect(h.insert).toHaveBeenCalledWith('fiscal_periods', expect.any(Array)));
  });
});

describe('Chart of Accounts dialog', () => {
  it('requires a number and a name inline', async () => {
    const user = userEvent.setup();
    wrap(<ChartOfAccounts />);
    await user.click(screen.getByRole('button', { name: 'Create new account' }));
    await user.click(screen.getByRole('button', { name: 'Create Account' }));

    expect(await screen.findByText('Account number is required')).toBeInTheDocument();
    expect(screen.getByText('Account name is required')).toBeInTheDocument();
    expect(h.createAccount).not.toHaveBeenCalled();
  });

  it('creates the same account row', async () => {
    const user = userEvent.setup();
    wrap(<ChartOfAccounts />);
    await user.click(screen.getByRole('button', { name: 'Create new account' }));
    await user.type(screen.getByLabelText('Account Number *'), '1010');
    await user.type(screen.getByLabelText('Account Name *'), 'Operating Cash');
    await user.type(screen.getByLabelText('Description'), 'Main checking');
    await user.click(screen.getByRole('button', { name: 'Create Account' }));

    await waitFor(() =>
      expect(h.createAccount).toHaveBeenCalledWith({
        company_id: 'co-1',
        account_number: '1010',
        account_name: 'Operating Cash',
        account_type: 'asset',
        account_subtype: 'bank',
        description: 'Main checking',
        is_active: true,
        allow_manual_entries: true,
        normal_balance: 'debit',
      }),
    );
  });
});
