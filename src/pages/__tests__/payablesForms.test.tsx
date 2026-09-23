import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// US-268: Journal Entries, Accounts Payable and Bill Payments validate with
// react-hook-form + src/lib/validations/accounting.ts. Payloads are pinned to
// what the useState versions sent.

const h = vi.hoisted(() => ({
  createEntry: vi.fn(),
  createBill: vi.fn(),
  insert: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock('@/components/ui/select', () => import('@/test/selectMock'));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u-1', user_metadata: { company_id: 'co-1' } } }),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const ACCOUNTS = [
  { id: 'a-cash', account_number: '1000', account_name: 'Cash', account_type: 'asset', is_bank_account: true },
  { id: 'a-exp', account_number: '6000', account_name: 'Supplies', account_type: 'expense', is_bank_account: false },
];
const BILLS = [
  { id: 'b-1', bill_number: 'BILL-1', vendor_id: 'v-1', vendor: { id: 'v-1', name: 'Acme' }, total_amount: 500, amount_due: 500, amount_paid: 0, due_date: '2026-10-01', status: 'open' },
];

vi.mock('@/hooks/useAccounting', () => ({
  useJournalEntries: () => ({ data: [], isLoading: false }),
  useChartOfAccounts: () => ({ data: ACCOUNTS }),
  useCreateJournalEntry: () => ({ mutateAsync: h.createEntry }),
  usePostJournalEntry: () => ({ mutateAsync: vi.fn() }),
  useBills: () => ({ data: BILLS, isLoading: false }),
  useCreateBill: () => ({ mutateAsync: h.createBill }),
}));

vi.mock('@/integrations/supabase/client', () => {
  const rows = (table: string) => (table === 'vendors' ? [{ id: 'v-1', name: 'Acme' }] : []);
  return {
    supabase: {
      from: (table: string) => {
        const q: Record<string, unknown> = {};
        for (const m of ['select', 'eq', 'order']) q[m] = () => q;
        q.then = (res: (v: unknown) => unknown) => Promise.resolve({ data: rows(table), error: null }).then(res);
        q.insert = (row: unknown) => {
          h.insert(table, row);
          return {
            select: () => ({ single: () => Promise.resolve({ data: { id: 'pay-1' }, error: null }) }),
            then: (res: (v: unknown) => unknown) => Promise.resolve({ error: null }).then(res),
          };
        };
        return q;
      },
      rpc: (...args: unknown[]) => {
        h.rpc(...args);
        return Promise.resolve({ error: null });
      },
    },
  };
});

import JournalEntries from '../JournalEntries';
import AccountsPayable from '../AccountsPayable';
import BillPayments from '../BillPayments';

const wrap = (ui: React.ReactElement) =>
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>);

beforeEach(() => {
  vi.clearAllMocks();
  h.createEntry.mockResolvedValue({});
  h.createBill.mockResolvedValue({});
});

const pickInRow = async (user: ReturnType<typeof userEvent.setup>, row: HTMLElement, name: string) =>
  user.click(within(row).getByRole('option', { name }));

describe('Create Journal Entry dialog', () => {
  it('flags a missing description and a line without an account inline', async () => {
    const user = userEvent.setup();
    wrap(<JournalEntries />);
    await user.click(screen.getByRole('button', { name: 'Create new journal entry' }));
    const rows = screen.getAllByRole('row').slice(1, 3);
    await pickInRow(user, rows[0], '6000 - Supplies');
    await user.type(screen.getByLabelText('Debit for line 1'), '100');
    await user.type(screen.getByLabelText('Credit for line 2'), '100');
    await user.click(screen.getByRole('button', { name: 'Create Entry' }));

    expect(await screen.findByText('Description is required')).toBeInTheDocument();
    expect(screen.getByLabelText('Description *')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Select an account')).toBeInTheDocument();
    expect(screen.getByLabelText('Select account for line 2')).toHaveAttribute('aria-invalid', 'true');
    expect(h.createEntry).not.toHaveBeenCalled();
  });

  it('sends the same createJournalEntry payload', async () => {
    const user = userEvent.setup();
    wrap(<JournalEntries />);
    await user.click(screen.getByRole('button', { name: 'Create new journal entry' }));
    await user.type(screen.getByLabelText('Description *'), 'Monthly depreciation');
    const rows = screen.getAllByRole('row').slice(1, 3);
    await pickInRow(user, rows[0], '6000 - Supplies');
    await pickInRow(user, rows[1], '1000 - Cash');
    await user.type(screen.getByLabelText('Debit for line 1'), '100');
    await user.type(screen.getByLabelText('Credit for line 2'), '100');
    await user.click(screen.getByRole('button', { name: 'Create Entry' }));

    await waitFor(() =>
      expect(h.createEntry).toHaveBeenCalledWith({
        companyId: 'co-1',
        entryDate: new Date().toISOString().split('T')[0],
        description: 'Monthly depreciation',
        memo: '',
        lines: [
          { accountId: 'a-exp', debitAmount: 100, creditAmount: 0, description: '' },
          { accountId: 'a-cash', debitAmount: 0, creditAmount: 100, description: '' },
        ],
      }),
    );
  });
});

describe('Create Bill dialog', () => {
  it('requires a vendor and an expense account inline', async () => {
    const user = userEvent.setup();
    wrap(<AccountsPayable />);
    await user.click(screen.getByRole('button', { name: 'Create new bill' }));
    await user.click(screen.getByRole('button', { name: 'Create Bill' }));

    expect(await screen.findByText('Select a vendor')).toBeInTheDocument();
    expect(screen.getByLabelText('Vendor')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Select an expense account')).toBeInTheDocument();
    expect(h.createBill).not.toHaveBeenCalled();
  });

  it('sends the same createBill payload', async () => {
    const user = userEvent.setup();
    wrap(<AccountsPayable />);
    await user.click(screen.getByRole('button', { name: 'Create new bill' }));
    await user.click(await screen.findByRole('option', { name: 'Acme' }));
    await user.type(screen.getByLabelText('Vendor Invoice #'), 'INV-9');
    await user.click(screen.getByRole('option', { name: '6000 - Supplies' }));
    await user.type(screen.getByPlaceholderText('Item description'), 'Lumber');
    const [qty, price] = screen.getAllByRole('spinbutton');
    await user.clear(qty);
    await user.type(qty, '2');
    await user.clear(price);
    await user.type(price, '25');
    await user.click(screen.getByRole('button', { name: 'Create Bill' }));

    await waitFor(() => expect(h.createBill).toHaveBeenCalledTimes(1));
    expect(h.createBill.mock.calls[0][0]).toEqual({
      companyId: 'co-1',
      vendorId: 'v-1',
      billDate: expect.any(String),
      dueDate: expect.any(String),
      vendorRefNumber: 'INV-9',
      memo: '',
      lineItems: [{ description: 'Lumber', quantity: 2, unitPrice: 25, amount: 50, expenseAccountId: 'a-exp' }],
    });
  });
});

describe('Pay Bills dialog', () => {
  it('requires a bank account and a bill inline', async () => {
    const user = userEvent.setup();
    wrap(<BillPayments />);
    await user.click(screen.getByRole('button', { name: 'Open pay bills dialog' }));
    await user.click(screen.getByRole('checkbox', { name: 'Pay bill BILL-1' }));
    const amount = screen.getByLabelText('Amount to pay on bill BILL-1');
    await user.clear(amount);
    await user.type(amount, '600');
    await user.click(screen.getByRole('button', { name: /Process Payment/ }));

    expect(await screen.findByText('Select a bank account')).toBeInTheDocument();
    expect(screen.getByText('More than the amount due')).toBeInTheDocument();
    expect(amount).toHaveAttribute('aria-invalid', 'true');
    expect(h.insert).not.toHaveBeenCalled();
  });

  it('inserts the same bill_payments row and application', async () => {
    const user = userEvent.setup();
    wrap(<BillPayments />);
    await user.click(screen.getByRole('button', { name: 'Open pay bills dialog' }));
    await user.click(screen.getByRole('option', { name: '1000 - Cash' }));
    await user.type(screen.getByLabelText('Check Number'), '1001');
    await user.click(screen.getByRole('checkbox', { name: 'Pay bill BILL-1' }));
    await user.click(screen.getByRole('button', { name: /Process Payment/ }));

    await waitFor(() =>
      expect(h.insert).toHaveBeenCalledWith('bill_payments', {
        company_id: 'co-1',
        payment_date: new Date().toISOString().split('T')[0],
        vendor_id: 'v-1',
        total_amount: 500,
        payment_method: 'check',
        check_number: '1001',
        reference_number: '',
        bank_account_id: 'a-cash',
        memo: '',
      }),
    );
    await waitFor(() =>
      expect(h.insert).toHaveBeenCalledWith('bill_payment_applications', [
        { bill_payment_id: 'pay-1', bill_id: 'b-1', company_id: 'co-1', amount_applied: 500 },
      ]),
    );
    expect(h.rpc).toHaveBeenCalledWith('apply_bill_payment', { p_bill_id: 'b-1', p_amount: 500 });
  });
});
