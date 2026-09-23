import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';

// US-268: Create Project validates with react-hook-form + createProjectFormSchema.
// A bad budget or an end date before the start is reported inline and nothing
// is created; a valid form sends the same insert the useState version built.

const h = vi.hoisted(() => ({ createProject: vi.fn(), navigate: vi.fn(), toast: vi.fn() }));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u-1' }, userProfile: { company_id: 'co-1', role: 'admin' }, loading: false }),
}));
vi.mock('react-router-dom', async (orig) => ({
  ...(await orig<typeof import('react-router-dom')>()),
  useNavigate: () => h.navigate,
}));
vi.mock('@/integrations/supabase/client', () => {
  const q: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'order']) q[m] = () => q;
  q.limit = () => Promise.resolve({ data: [], error: null });
  return { supabase: { from: () => q } };
});
vi.mock('@/services/projectService', () => ({ projectService: { createProject: h.createProject } }));
vi.mock('@/hooks/use-toast', () => ({ toast: h.toast }));
vi.mock('@/components/layout/DashboardLayout', () => ({ DashboardLayout: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('@/components/accessibility/AccessiblePageWrapper', () => ({
  AccessiblePageWrapper: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock('@/components/customers/ContactPicker', () => ({ ContactPicker: () => null }));
vi.mock('@/components/projects/ProjectTemplatesLibrary', () => ({ ProjectTemplatesLibrary: () => null }));
vi.mock('@/components/help/HelpTooltip', () => ({ FormFieldHelp: () => null }));

import CreateProject from '../CreateProject';

const iso = (d: Date) => d.toISOString().split('T')[0];

const renderPage = (path = '/create-project') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <CreateProject />
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  h.createProject.mockResolvedValue({ id: 'p-1' });
});

describe('Create Project form (US-268)', () => {
  it('reports a negative budget inline and creates nothing', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByLabelText(/Project Name/), 'Deck rebuild - Reyes');
    await user.type(screen.getByLabelText(/Total Budget/), '-5');
    await user.click(screen.getByRole('button', { name: 'Create Project' }));

    expect(await screen.findByText('Enter a budget of 0 or more')).toBeInTheDocument();
    expect(screen.getByLabelText(/Total Budget/)).toHaveAttribute('aria-invalid', 'true');
    expect(h.createProject).not.toHaveBeenCalled();
  });

  it('reports an end date before the start date inline', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByLabelText(/Project Name/), 'Deck rebuild - Reyes');
    const end = screen.getByLabelText('Target End Date');
    await user.clear(end);
    await user.type(end, '2020-01-01');
    await user.click(screen.getByRole('button', { name: 'Create Project' }));

    expect(await screen.findByText('End date must be on or after the start date')).toBeInTheDocument();
    expect(h.createProject).not.toHaveBeenCalled();
  });

  it('sends the same insert as before', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByLabelText(/Project Name/), 'Deck rebuild - Reyes');
    await user.type(screen.getByLabelText(/Total Budget/), '12500.50');
    await user.click(screen.getByRole('button', { name: 'Create Project' }));

    await waitFor(() => expect(h.createProject).toHaveBeenCalledTimes(1));
    const today = new Date();
    const plus30 = new Date(today);
    plus30.setDate(plus30.getDate() + 30);
    expect(h.createProject.mock.calls[0][0]).toStrictEqual({
      name: 'Deck rebuild - Reyes',
      description: undefined,
      project_type: undefined,
      status: 'planning',
      client_id: undefined,
      client_name: '',
      client_email: undefined,
      site_address: undefined,
      start_date: iso(today),
      end_date: iso(plus30),
      budget: 12500.5,
      estimated_hours: undefined,
      permit_numbers: undefined,
      company_id: 'co-1',
      created_by: 'u-1',
      opportunity_id: undefined,
    });
    expect(h.navigate).toHaveBeenCalledWith('/dashboard');
  });

  it('keeps the CRM prefill: name, budget, type, active status and the opportunity link', async () => {
    const user = userEvent.setup();
    renderPage('/create-project?opportunity=opp-9&name=Warehouse%20fit-out&budget=90000&type=commercial_new');
    expect(await screen.findByDisplayValue('Warehouse fit-out')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Create Project' }));

    await waitFor(() => expect(h.createProject).toHaveBeenCalledTimes(1));
    expect(h.createProject.mock.calls[0][0]).toMatchObject({
      name: 'Warehouse fit-out',
      budget: 90000,
      project_type: 'commercial_new',
      status: 'active',
      opportunity_id: 'opp-9',
    });
  });
});
