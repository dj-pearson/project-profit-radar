/**
 * US-364: the project financial tab read invoices.amount, expenses.date and a
 * `payments` table, none of which exist. These tests pin the real columns
 * (types.ts Row definitions) and the error state on a failed read.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

type Result = { data: unknown; error: { message: string } | null };

const calls: Array<{ table: string; select?: string; filters: Array<[string, string, unknown]> }> = [];
let results: Record<string, Result> = {};

const makeBuilder = (table: string) => {
  const call = { table, select: undefined as string | undefined, filters: [] as Array<[string, string, unknown]> };
  calls.push(call);
  const result = () => results[table] ?? { data: [], error: null };
  const builder: Record<string, unknown> = {
    select: (cols: string) => {
      call.select = cols;
      return builder;
    },
    eq: (col: string, val: unknown) => {
      call.filters.push(['eq', col, val]);
      return builder;
    },
    in: (col: string, val: unknown) => {
      call.filters.push(['in', col, val]);
      return builder;
    },
    single: () => Promise.resolve(result()),
    then: (resolve: (r: Result) => unknown, reject?: (e: unknown) => unknown) =>
      Promise.resolve(result()).then(resolve, reject),
  };
  return builder;
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn((table: string) => makeBuilder(table)) },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ userProfile: { company_id: 'company-1' } }),
}));

vi.mock('@/lib/sentry', () => ({ captureException: vi.fn() }));

// Charts need layout measurements jsdom does not provide.
vi.mock('recharts', () => {
  const Stub = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  return {
    LineChart: Stub, Line: Stub, XAxis: Stub, YAxis: Stub, CartesianGrid: Stub, Tooltip: Stub,
    Legend: Stub, ResponsiveContainer: Stub, PieChart: Stub, Pie: Stub, Cell: Stub,
  };
});

import { ProjectFinancialDashboard } from '../ProjectFinancialDashboard';

describe('ProjectFinancialDashboard (US-364)', () => {
  beforeEach(() => {
    calls.length = 0;
    results = {
      invoices: { data: [{ id: 'inv-1', total_amount: 1000, status: 'sent', created_at: '2026-09-01' }], error: null },
      expenses: { data: [{ amount: 300, expense_date: '2026-09-02' }], error: null },
      projects: { data: { budget: 5000 }, error: null },
      invoice_payments: { data: [{ payment_amount: 400, payment_date: '2026-09-03' }], error: null },
    };
  });

  it('queries real tables and columns and scopes payments through the project invoices', async () => {
    render(<ProjectFinancialDashboard projectId="project-1" />);

    await waitFor(() => expect(screen.getByText('Collected')).toBeInTheDocument());

    const byTable = Object.fromEntries(calls.map(c => [c.table, c]));
    expect(Object.keys(byTable).sort()).toEqual(['expenses', 'invoice_payments', 'invoices', 'projects']);
    expect(byTable.invoices.select).toBe('id, total_amount, status, created_at');
    expect(byTable.expenses.select).toBe('amount, expense_date');
    expect(byTable.invoice_payments.select).toBe('payment_amount, payment_date');
    expect(byTable.invoice_payments.filters).toContainEqual(['in', 'invoice_id', ['inv-1']]);
    expect(byTable.invoice_payments.filters).toContainEqual(['eq', 'company_id', 'company-1']);

    expect(screen.getByText('$1,000')).toBeInTheDocument(); // billed
    expect(screen.getByText('$400')).toBeInTheDocument(); // collected
    expect(screen.getByText('$600')).toBeInTheDocument(); // outstanding
  });

  it('renders the error state instead of zeros when a read fails', async () => {
    results.expenses = { data: null, error: { message: 'column expenses.date does not exist' } };

    render(<ProjectFinancialDashboard projectId="project-1" />);

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByText(/expenses \(column expenses.date does not exist\)/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    expect(screen.queryByText('$0')).not.toBeInTheDocument();
    expect(screen.queryByText('Collected')).not.toBeInTheDocument();
  });

  it('skips the payments read when the project has no invoices', async () => {
    results.invoices = { data: [], error: null };

    render(<ProjectFinancialDashboard projectId="project-1" />);

    await waitFor(() => expect(screen.getByText('Collected')).toBeInTheDocument());
    expect(calls.map(c => c.table)).not.toContain('invoice_payments');
  });
});
