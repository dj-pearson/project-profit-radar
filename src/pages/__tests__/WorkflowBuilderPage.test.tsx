import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * /crm/workflows/builder/:id used to ignore the id and open a blank builder,
 * so there was no way back into a saved workflow. It now reads the row (RLS
 * limits the read to the caller's company) and says so when there is none.
 */

const maybeSingle = vi.fn();
const eq = vi.fn(() => ({ maybeSingle }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: () => ({ select: () => ({ eq }) }) },
}));
vi.mock('@/components/crm/WorkflowBuilder', () => ({
  WorkflowBuilder: (props: { workflowId?: string; initialWorkflow?: { name: string } }) => (
    <div data-testid="builder">{props.initialWorkflow ? `editing ${props.initialWorkflow.name} (${props.workflowId})` : 'blank'}</div>
  ),
}));

import WorkflowBuilderPage from '../WorkflowBuilderPage';

function renderAt(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/crm/workflows/builder" element={<WorkflowBuilderPage />} />
          <Route path="/crm/workflows/builder/:id" element={<WorkflowBuilderPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('WorkflowBuilderPage', () => {
  beforeEach(() => {
    maybeSingle.mockReset();
    eq.mockClear();
  });

  it('opens a blank builder without an id and reads nothing', () => {
    renderAt('/crm/workflows/builder');
    expect(screen.getByTestId('builder').textContent).toBe('blank');
    expect(eq).not.toHaveBeenCalled();
  });

  it('loads the workflow named by the id into the builder', async () => {
    maybeSingle.mockResolvedValue({
      data: { id: 'wf-1', name: 'Lead follow-up', description: null, trigger_type: 'manual', workflow_steps: [] },
      error: null,
    });
    renderAt('/crm/workflows/builder/wf-1');
    expect((await screen.findByTestId('builder')).textContent).toBe('editing Lead follow-up (wf-1)');
    expect(eq).toHaveBeenCalledWith('id', 'wf-1');
  });

  it('shows not-found, not a blank builder, when no row comes back', async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });
    renderAt('/crm/workflows/builder/someone-elses');
    expect(await screen.findByText('Workflow not found')).toBeTruthy();
    expect(screen.queryByTestId('builder')).toBeNull();
    expect(screen.getByRole('link', { name: 'Back to workflows' }).getAttribute('href')).toBe('/crm/workflows');
  });

  it('shows a load error when the read fails', async () => {
    maybeSingle.mockResolvedValue({ data: null, error: { message: 'boom' } });
    renderAt('/crm/workflows/builder/wf-2');
    expect(await screen.findByText('Could not load this workflow')).toBeTruthy();
    expect(screen.queryByTestId('builder')).toBeNull();
  });
});
