import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// US-375: the list pages swallowed load failures behind a toast and then
// rendered their "nothing here yet" copy, so a failed query read as an empty
// account. Each now renders ErrorState with a retry on failure and a shared
// EmptyStates component with a create CTA when the query returns zero rows.

type Result = { data: unknown; error: unknown };
const db: { result: Result; fn: Result } = {
  result: { data: [], error: null },
  fn: { data: { changeOrders: [] }, error: null },
};

// Every query-builder method returns the builder; awaiting it yields db.result.
function builder(): unknown {
  const b: unknown = new Proxy(function noop() {}, {
    get(_t, prop) {
      if (prop === 'then') {
        return (res: (v: Result) => unknown, rej: (e: unknown) => unknown) =>
          Promise.resolve(db.result).then(res, rej);
      }
      return () => b;
    },
  });
  return b;
}

const from = vi.fn(() => builder());
const invoke = vi.fn(async () => db.fn);

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: unknown[]) => from(...(args as [])),
    functions: { invoke: (...args: unknown[]) => invoke(...(args as [])) },
    storage: { from: () => ({ upload: vi.fn(), createSignedUrl: vi.fn(), remove: vi.fn() }) },
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
    channel: vi.fn().mockReturnValue({ on: vi.fn().mockReturnThis(), subscribe: vi.fn() }),
    removeChannel: vi.fn(),
  },
}));

// Stable identities: the pages' effects depend on user/userProfile, and the
// real AuthContext does not hand out a new object every render.
const auth = {
  user: { id: 'u1', email: 'a@b.co' },
  userProfile: { id: 'u1', company_id: 'c1', role: 'admin' },
  loading: false,
};
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth }));
const navigateFn = vi.fn();
vi.mock('react-router-dom', async (orig) => ({
  ...(await orig<typeof import('react-router-dom')>()),
  useNavigate: () => navigateFn,
}));

const getProjects = vi.fn();
vi.mock('@/services/projectService', () => ({
  projectService: {
    getProjects: (...args: unknown[]) => getProjects(...args),
    deleteProject: vi.fn(),
  },
}));

vi.mock('@/contexts/SubscriptionContext', () => ({
  useSubscription: () => ({
    checkLimit: () => ({ canAdd: true }),
    getUpgradeRequirement: () => null,
    subscriptionData: null,
    usage: {},
  }),
}));

vi.mock('@/hooks/useSubscriptionLimits', () => ({
  useSubscriptionLimits: () => ({
    checkLimit: () => ({ canAdd: true, limit: -1 }),
    getUpgradeRequirement: () => null,
    subscriptionData: null,
    refreshData: vi.fn(),
  }),
}));

vi.mock('@/hooks/useBillingDefaults', () => ({
  useBillingDefaults: () => ({ defaults: { markupPercent: 0, taxRate: 0 } }),
}));

vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => false }));

vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/hooks/useGoogleAnalytics', () => ({
  gtag: { trackProject: vi.fn(), trackFeature: vi.fn(), event: vi.fn() },
}));

vi.mock('@/hooks/usePersistedState', () => ({
  usePersistedState: (_key: string, initial: unknown) => React.useState(initial),
}));

vi.mock('@/components/layout/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/accessibility/AccessiblePageWrapper', () => ({
  AccessiblePageWrapper: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/smart-import', () => ({ CSVImportButton: () => null }));
vi.mock('@/components/projects/BulkActionsToolbar', () => ({ BulkActionsToolbar: () => null }));
vi.mock('@/components/filters/FilterPresetsManager', () => ({ FilterPresetsManager: () => null }));
vi.mock('@/components/InvoiceGenerator', () => ({
  default: () => <div data-testid="invoice-generator" />,
}));
vi.mock('@/components/invoices/InvoiceList', () => ({
  default: () => <div data-testid="invoice-list" />,
}));
vi.mock('@/components/invoices/InvoiceStats', () => ({
  default: () => <div data-testid="invoice-stats" />,
}));
vi.mock('@/components/invoices/ProgressBillingManager', () => ({ default: () => null }));
vi.mock('@/components/invoices/RetentionManager', () => ({ default: () => null }));
vi.mock('@/components/invoices/TimeAndMaterialsBilling', () => ({ default: () => null }));
vi.mock('@/components/invoices/RecurringInvoicesTab', () => ({ default: () => null }));

import Projects from '../Projects';
import Invoices from '../Invoices';
import TeamManagement from '../TeamManagement';
import ChangeOrders from '../ChangeOrders';
import DailyReports from '../DailyReports';
import DocumentManagement from '../DocumentManagement';
import { EstimatesTable } from '@/components/estimates/EstimatesTable';

function renderPage(node: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{node}</MemoryRouter>
    </QueryClientProvider>
  );
}

// The page header often carries a button with the same label; scope the CTA
// lookup to the empty-state card that owns the heading.
async function emptyStateCta(heading: string, name: string) {
  const card = (await screen.findByText(heading)).closest('.max-w-md') as HTMLElement;
  return within(card).getByRole('button', { name });
}

const fail = () => {
  db.result = { data: null, error: { message: 'boom' } };
  db.fn = { data: null, error: { message: 'boom' } };
};

beforeEach(() => {
  db.result = { data: [], error: null };
  db.fn = { data: { changeOrders: [] }, error: null };
  from.mockClear();
  invoke.mockClear();
  getProjects.mockReset();
  getProjects.mockResolvedValue([]);
});

describe('Projects', () => {
  it('shows ErrorState, not "No active projects", when the load fails, and retries', async () => {
    getProjects.mockRejectedValueOnce(new Error('boom'));
    renderPage(<Projects />);

    expect(await screen.findByText('Projects did not load')).toBeInTheDocument();
    expect(screen.queryByText('No active projects')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Try Again' }));
    await waitFor(() => expect(getProjects).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('No projects yet')).toBeInTheDocument();
  });

  it('shows NoProjects with a create CTA when there are zero projects', async () => {
    renderPage(<Projects />);
    expect(await screen.findByText('No projects yet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Project' })).toBeInTheDocument();
  });
});

describe('Invoices', () => {
  it('shows ErrorState and hides the $0 stats when the load fails', async () => {
    fail();
    renderPage(<Invoices />);

    expect(await screen.findByText('Invoices did not load')).toBeInTheDocument();
    expect(screen.queryByTestId('invoice-stats')).not.toBeInTheDocument();
    expect(screen.queryByTestId('invoice-list')).not.toBeInTheDocument();

    db.result = { data: [], error: null };
    fireEvent.click(screen.getByRole('button', { name: 'Try Again' }));
    expect(await screen.findByText('No invoices found')).toBeInTheDocument();
  });

  it('shows NoInvoices whose CTA opens the invoice generator', async () => {
    renderPage(<Invoices />);
    fireEvent.click(await emptyStateCta('No invoices found', 'Create Invoice'));
    expect(screen.getByTestId('invoice-generator')).toBeInTheDocument();
  });
});

describe('EstimatesTable', () => {
  it('shows ErrorState instead of "No estimates" when the fetch fails', async () => {
    fail();
    renderPage(<EstimatesTable searchTerm="" statusFilter="all" />);
    expect(await screen.findByText('Estimates did not load')).toBeInTheDocument();
    expect(screen.queryByText('No estimates yet')).not.toBeInTheDocument();
  });

  it('shows NoEstimates with the create CTA when unfiltered and empty', async () => {
    const onCreate = vi.fn();
    renderPage(<EstimatesTable searchTerm="" statusFilter="all" onCreate={onCreate} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Create Estimate' }));
    expect(onCreate).toHaveBeenCalledTimes(1);
  });

  it('shows a no-match message, not the first-estimate CTA, on a filtered tab', async () => {
    renderPage(<EstimatesTable searchTerm="" statusFilter="draft" onCreate={vi.fn()} />);
    expect(await screen.findByText('No estimates match')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Create Estimate' })).not.toBeInTheDocument();
  });
});

describe('TeamManagement', () => {
  it('shows ErrorState and hides the member counts when the load fails', async () => {
    fail();
    renderPage(<TeamManagement />);
    expect(await screen.findByText('Team members did not load')).toBeInTheDocument();
    expect(screen.queryByLabelText('Team statistics')).not.toBeInTheDocument();
  });

  it('shows NoTeamMembers with an invite CTA when zero rows come back', async () => {
    renderPage(<TeamManagement />);
    expect(await screen.findByText('No team members yet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Invite Team' })).toBeInTheDocument();
  });
});

describe('ChangeOrders', () => {
  it('shows ErrorState when the change-orders call fails', async () => {
    db.fn = { data: null, error: { message: 'boom' } };
    renderPage(<ChangeOrders />);
    expect(await screen.findByText('Change orders did not load')).toBeInTheDocument();
    expect(screen.queryByText('No change orders yet')).not.toBeInTheDocument();
  });

  it('shows NoChangeOrders with a create CTA when there are none', async () => {
    renderPage(<ChangeOrders />);
    expect(await emptyStateCta('No change orders yet', 'Create Change Order')).toBeInTheDocument();
  });
});

describe('DailyReports', () => {
  it('shows ErrorState when the load fails', async () => {
    fail();
    renderPage(<DailyReports />);
    expect(await screen.findByText('Daily reports did not load')).toBeInTheDocument();
    expect(screen.queryByText('No daily reports yet')).not.toBeInTheDocument();
  });

  it('shows NoDailyReports with a create CTA when there are none', async () => {
    renderPage(<DailyReports />);
    expect(await screen.findByText('No daily reports yet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Daily Report' })).toBeInTheDocument();
  });
});

describe('DocumentManagement', () => {
  it('shows ErrorState when the documents load fails', async () => {
    fail();
    renderPage(<DocumentManagement />);
    expect(await screen.findByText('Documents did not load')).toBeInTheDocument();
    expect(screen.queryByText('No documents yet')).not.toBeInTheDocument();
  });

  it('shows NoDocuments with an upload CTA when there are none', async () => {
    renderPage(<DocumentManagement />);
    expect(await emptyStateCta('No documents yet', 'Upload Files')).toBeInTheDocument();
  });
});
