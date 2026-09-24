/**
 * US-368: the client portal ordered milestone tasks by tasks.target_date,
 * which does not exist. The 400 was swallowed and the timeline was always
 * empty. It now reads tasks' real columns and shows an error when a query
 * fails.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

type Result = { data: unknown; error: { message: string } | null };
type Call = { table: string; method: string; args: unknown[] };

const calls: Call[] = [];
let results: Record<string, Result> = {};
const timelineProps: unknown[] = [];

function builder(table: string) {
  const b: Record<string, unknown> = {};
  for (const method of ['select', 'eq', 'in', 'order', 'limit']) {
    b[method] = (...args: unknown[]) => {
      calls.push({ table, method, args });
      return b;
    };
  }
  b.then = (resolve: (r: Result) => unknown, reject?: (e: unknown) => unknown) =>
    Promise.resolve(results[table] ?? { data: [], error: null }).then(resolve, reject);
  return b;
}

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => builder(table),
    functions: { invoke: vi.fn() },
  },
}));
// Stable identities: the page's load effect depends on user, userProfile and
// navigate, so fresh objects per render would reload forever.
const auth = vi.hoisted(() => ({
  user: { id: 'u1', email: 'client@example.com' },
  userProfile: { id: 'u1', role: 'client_portal', company_id: null },
  loading: false,
}));
const navigate = vi.hoisted(() => () => undefined);
vi.mock('react-router-dom', () => ({ useNavigate: () => navigate }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }));
vi.mock('@/components/accessibility/AccessiblePageWrapper', () => ({
  AccessiblePageWrapper: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));
vi.mock('@/components/layout/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/components/client-portal', () => ({
  ClientProjectOverview: () => null,
  ClientProgressTimeline: (props: { milestones: unknown[] }) => {
    timelineProps.push(props.milestones);
    return <div data-testid="timeline">{props.milestones.length} milestones</div>;
  },
  ClientBudgetSummary: () => null,
  ClientDocumentGallery: () => null,
  ClientUpdatesFeed: () => null,
  ClientMessageCenter: () => null,
  ClientChangeOrderApproval: () => null,
}));
vi.mock('@/components/client/ClientPortalSelections', () => ({ ClientPortalSelections: () => null }));
vi.mock('@/components/client/ClientPortalRFIs', () => ({ ClientPortalRFIs: () => null }));

import ClientPortalEnhancedPage from '../ClientPortalEnhanced';

// The reads moved into TanStack Query hooks (US-266); a fresh client per
// render keeps one test's cache out of the next.
const ClientPortalEnhanced = () => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <ClientPortalEnhancedPage />
  </QueryClientProvider>
);

const taskCalls = (method: string) => calls.filter((c) => c.table === 'tasks' && c.method === method);

describe('ClientPortalEnhanced (US-368)', () => {
  beforeEach(() => {
    calls.length = 0;
    timelineProps.length = 0;
    results = {
      client_portal_access: { data: [{ project_id: 'p1' }], error: null },
      projects: { data: [{ id: 'p1', name: 'Kitchen', status: 'active', company_id: 'c1' }], error: null },
    };
  });

  it('reads milestone tasks by due_date and maps real columns', async () => {
    results.tasks = {
      data: [{
        id: 't1', name: 'Rough-in inspection', description: null, status: 'in_progress',
        due_date: '2026-10-01', end_date: null, completion_percentage: 40, category: 'Electrical',
      }],
      error: null,
    };
    render(<ClientPortalEnhanced />);

    await waitFor(() => expect(screen.getAllByTestId('timeline')[0].textContent).toBe('1 milestones'));

    const select = taskCalls('select')[0].args[0] as string;
    expect(select).not.toMatch(/target_date|title|completed_at|progress\b|phase/);
    expect(taskCalls('order')[0].args[0]).toBe('due_date');

    const milestones = timelineProps.at(-1) as Array<Record<string, unknown>>;
    expect(milestones[0]).toMatchObject({
      title: 'Rough-in inspection',
      targetDate: '2026-10-01',
      progress: 40,
      phase: 'Electrical',
      status: 'in_progress',
    });
  });

  it('shows an error instead of an empty timeline when the tasks query fails', async () => {
    results.tasks = { data: null, error: { message: 'column tasks.target_date does not exist' } };
    render(<ClientPortalEnhanced />);

    expect(await screen.findByText(/could not load milestones/i)).toBeTruthy();
  });

  it('shows an error instead of "No Projects Found" when the project load fails', async () => {
    results.projects = { data: null, error: { message: 'permission denied for table projects' } };
    render(<ClientPortalEnhanced />);

    expect(await screen.findByText('permission denied for table projects')).toBeTruthy();
    expect(screen.queryByText(/no projects found/i)).toBeNull();
  });
});
