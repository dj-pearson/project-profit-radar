import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

const MOCK_AUTH = { userProfile: { id: 'u-1', company_id: 'co-1', role: 'admin' } };
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => MOCK_AUTH }));

const toast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast }) }));

type Call = [string, ...unknown[]];
let calls: Call[] = [];
let result: { data: unknown; error: unknown } = { data: [], error: null };

// Chainable PostgREST stand-in: records every call, resolves to `result`.
function builder() {
  const b: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'neq', 'order', 'update']) {
    b[m] = (...args: unknown[]) => {
      calls.push([m, ...args]);
      return b;
    };
  }
  b.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject);
  return b;
}

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => {
      calls.push(['from', table]);
      return builder();
    },
  },
}));

import { EnhancedPipelineKanban } from '../EnhancedPipelineKanban';

const LEADS = [
  { id: 'l-1', first_name: 'Ana', last_name: 'Cruz', company_name: 'Cruz Remodel', email: 'a@x.com', phone: null, estimated_budget: 12000, status: 'new', priority: 'high', created_at: '2026-09-01' },
  { id: 'l-2', first_name: 'Bo', last_name: 'Lee', company_name: 'Lee Roofing', email: 'b@x.com', phone: null, estimated_budget: 5000, status: 'proposal_sent', priority: 'low', created_at: '2026-09-02' },
];

describe('EnhancedPipelineKanban (US-365)', () => {
  beforeEach(() => {
    calls = [];
    result = { data: LEADS, error: null };
    vi.clearAllMocks();
  });

  it('loads leads scoped to the company and filters on status, not the missing stage column', async () => {
    render(<EnhancedPipelineKanban />);
    await screen.findByText('Cruz Remodel');

    expect(calls).toContainEqual(['from', 'leads']);
    expect(calls).toContainEqual(['eq', 'company_id', 'co-1']);
    expect(calls).toContainEqual(['neq', 'status', 'lost']);
    expect(calls.some(c => c.includes('stage'))).toBe(false);

    // proposal_sent lands in the Proposal column
    expect(screen.getByTestId('pipeline-stage-proposal_sent')).toHaveTextContent('Lee Roofing');
    expect(screen.getByTestId('pipeline-stage-new')).toHaveTextContent('Cruz Remodel');
  });

  it('writes the new status on drop, scoped to the company', async () => {
    render(<EnhancedPipelineKanban />);
    const card = await screen.findByText('Cruz Remodel');
    calls = [];
    result = { data: null, error: null };

    fireEvent.dragStart(card.closest('[draggable]')!);
    fireEvent.drop(screen.getByTestId('pipeline-stage-qualified'));

    await waitFor(() => expect(calls).toContainEqual(['update', { status: 'qualified' }]));
    expect(calls).toContainEqual(['eq', 'id', 'l-1']);
    expect(calls).toContainEqual(['eq', 'company_id', 'co-1']);
    await waitFor(() =>
      expect(screen.getByTestId('pipeline-stage-qualified')).toHaveTextContent('Cruz Remodel'),
    );
  });

  it('shows an error state instead of an empty board when the load fails', async () => {
    result = { data: null, error: { message: 'column leads.stage does not exist' } };
    render(<EnhancedPipelineKanban />);

    expect(await screen.findByText("Couldn't load the pipeline")).toBeInTheDocument();
    expect(screen.getByText('column leads.stage does not exist')).toBeInTheDocument();
    expect(screen.queryByTestId('pipeline-stage-new')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('reports a failed move instead of claiming success', async () => {
    render(<EnhancedPipelineKanban />);
    const card = await screen.findByText('Cruz Remodel');
    result = { data: null, error: { message: 'permission denied' } };

    fireEvent.dragStart(card.closest('[draggable]')!);
    fireEvent.drop(screen.getByTestId('pipeline-stage-won'));

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' })),
    );
    expect(screen.getByTestId('pipeline-stage-new')).toHaveTextContent('Cruz Remodel');
  });
});
