import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// US-375: the ledger statements used to read only isLoading, so a failed
// query rendered a full statement of zeros ("Balance Sheet is Balanced").

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'u1', user_metadata: { company_id: 'c1' } },
    userProfile: { id: 'u1', company_id: 'c1', role: 'accounting' },
    loading: false,
  }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn() },
}));

const navigate = vi.fn();
vi.mock('react-router-dom', async (orig) => ({
  ...(await orig<typeof import('react-router-dom')>()),
  useNavigate: () => navigate,
}));

type QueryState = {
  data?: unknown;
  isLoading: boolean;
  isError: boolean;
  refetch: ReturnType<typeof vi.fn>;
};

let ledgerActivity: QueryState;
let chartOfAccounts: QueryState;

vi.mock('@/hooks/useAccounting', () => ({
  useLedgerActivity: () => ledgerActivity,
  useLedgerLines: () => ({ data: undefined, isLoading: false, isError: false, refetch: vi.fn() }),
  useLedgerPostingEnabled: () => ({ data: true }),
  useChartOfAccounts: () => chartOfAccounts,
  useSetLedgerPosting: () => ({ mutate: vi.fn(), isPending: false }),
  useBackfillLedger: () => ({ mutate: vi.fn(), isPending: false }),
}));

import BalanceSheet from '../BalanceSheet';
import ProfitAndLoss from '../ProfitAndLoss';
import GeneralLedger from '../GeneralLedger';
import CashFlowStatement from '../CashFlowStatement';
import TrialBalance from '../TrialBalance';

const failed = (): QueryState => ({ data: undefined, isLoading: false, isError: true, refetch: vi.fn() });
const empty = (): QueryState => ({ data: [], isLoading: false, isError: false, refetch: vi.fn() });

function renderPage(Page: React.ComponentType) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <Page />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  navigate.mockReset();
  ledgerActivity = empty();
  chartOfAccounts = empty();
});

describe('ledger statements: error state', () => {
  it('BalanceSheet shows ErrorState, not a balanced sheet of zeros, and retries', () => {
    ledgerActivity = failed();
    renderPage(BalanceSheet);

    expect(screen.getByText('The balance sheet did not load')).toBeInTheDocument();
    expect(screen.queryByText(/Balance Sheet is Balanced/)).not.toBeInTheDocument();
    expect(screen.queryByText('TOTAL ASSETS')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Try Again' }));
    expect(ledgerActivity.refetch).toHaveBeenCalledTimes(1);
  });

  it('ProfitAndLoss shows ErrorState and hides the key metrics', () => {
    ledgerActivity = failed();
    renderPage(ProfitAndLoss);

    expect(screen.getByText('The profit and loss statement did not load')).toBeInTheDocument();
    expect(screen.queryByText('NET INCOME')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Key financial metrics')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Try Again' }));
    expect(ledgerActivity.refetch).toHaveBeenCalledTimes(1);
  });

  // US-334: both read the posted ledger now, not the chart's running totals.
  it('TrialBalance shows ErrorState and no "Balanced" badge', () => {
    ledgerActivity = failed();
    renderPage(TrialBalance);

    expect(screen.getByText('The trial balance did not load')).toBeInTheDocument();
    expect(screen.queryByText('Balanced')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Try Again' }));
    expect(ledgerActivity.refetch).toHaveBeenCalledTimes(1);
  });

  it('CashFlowStatement shows ErrorState', () => {
    ledgerActivity = failed();
    renderPage(CashFlowStatement);

    expect(screen.getByText('The cash flow statement did not load')).toBeInTheDocument();
    expect(screen.queryByLabelText('Statement of cash flows')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Try Again' }));
    expect(ledgerActivity.refetch).toHaveBeenCalledTimes(1);
  });

  it('GeneralLedger shows ErrorState when the accounts fail', () => {
    chartOfAccounts = failed();
    renderPage(GeneralLedger);

    expect(screen.getByText('The general ledger did not load')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Try Again' }));
    expect(chartOfAccounts.refetch).toHaveBeenCalledTimes(1);
  });
});

describe('ledger statements: empty state', () => {
  it('BalanceSheet with no posted activity offers to record a journal entry', () => {
    renderPage(BalanceSheet);

    expect(screen.getByText('Nothing has been posted to the ledger yet')).toBeInTheDocument();
    expect(screen.queryByText('TOTAL ASSETS')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Record Journal Entry' }));
    expect(navigate).toHaveBeenCalledWith('/finance/journal-entries');
  });

  it('ProfitAndLoss with no posted activity offers to record a journal entry', () => {
    renderPage(ProfitAndLoss);

    expect(screen.getByText('Nothing has been posted to the ledger yet')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Record Journal Entry' }));
    expect(navigate).toHaveBeenCalledWith('/finance/journal-entries');
  });

  it('GeneralLedger with no chart of accounts links to set one up', () => {
    renderPage(GeneralLedger);

    expect(screen.getByText('No chart of accounts yet')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Set Up Chart of Accounts' }));
    expect(navigate).toHaveBeenCalledWith('/finance/chart-of-accounts');
  });

  it('TrialBalance with nothing posted says so instead of showing a balanced table of nothing', () => {
    renderPage(TrialBalance);

    expect(screen.getByText('Nothing is posted to this date')).toBeInTheDocument();
    expect(screen.queryByText('Balanced')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Record Journal Entry' }));
    expect(navigate).toHaveBeenCalledWith('/finance/journal-entries');
  });

  it('CashFlowStatement with nothing posted offers to record a journal entry', () => {
    renderPage(CashFlowStatement);

    expect(screen.getByText('Nothing has been posted to the ledger yet')).toBeInTheDocument();
    expect(screen.queryByLabelText('Statement of cash flows')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Record Journal Entry' }));
    expect(navigate).toHaveBeenCalledWith('/finance/journal-entries');
  });

  it('still renders the statement while loading, not the empty state', () => {
    ledgerActivity = { data: undefined, isLoading: true, isError: false, refetch: vi.fn() };
    renderPage(BalanceSheet);

    expect(screen.queryByText('Nothing has been posted to the ledger yet')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Balance sheet report')).toBeInTheDocument();
  });
});
