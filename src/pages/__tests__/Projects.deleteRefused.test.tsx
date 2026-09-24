/**
 * Deleting a project with financial records fails with 23503 since
 * 20260924200000_missing_foreign_keys.sql. The page must say why and offer to
 * archive (close) the project instead of showing a raw constraint error.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  PROJECT_HAS_FINANCIAL_RECORDS_MESSAGE,
  ProjectHasFinancialRecordsError,
} from '@/lib/projectDeleteErrors';

const toast = vi.fn();
const getProjects = vi.fn();
const deleteProject = vi.fn();
const archiveProject = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'u1' },
    userProfile: { id: 'u1', company_id: 'c1', role: 'admin' },
    loading: false,
  }),
}));

vi.mock('@/contexts/SubscriptionContext', () => ({
  useSubscription: () => ({
    checkLimit: vi.fn().mockReturnValue(true),
    getUpgradeRequirement: vi.fn().mockReturnValue(null),
    subscriptionData: { plan: 'pro' },
    usage: {},
  }),
}));

vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));

vi.mock('@/services/projectService', () => ({
  projectService: {
    getProjects: (...a: unknown[]) => getProjects(...a),
    deleteProject: (...a: unknown[]) => deleteProject(...a),
    archiveProject: (...a: unknown[]) => archiveProject(...a),
  },
}));

vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast }) }));
vi.mock('@/hooks/useGoogleAnalytics', () => ({ gtag: { trackFeature: vi.fn(), trackProject: vi.fn(), event: vi.fn() } }));
vi.mock('@/hooks/usePersistedState', () => ({
  usePersistedState: (_k: string, d: unknown) => React.useState(d),
}));
vi.mock('@/hooks/useAccessibilityHelpers', () => {
  let n = 0;
  return {
    useFocusTrap: () => ({ current: null }),
    useAriaId: (p: string) => `${p}-${++n}`,
    useEscapeKey: vi.fn(),
    useClickOutside: () => ({ current: null }),
  };
});
vi.mock('@/components/layout/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/components/accessibility/AccessiblePageWrapper', () => ({
  AccessiblePageWrapper: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));
vi.mock('@/components/subscription/UpgradePrompt', () => ({ default: () => null }));
vi.mock('@/components/projects/SaveAsTemplateDialog', () => ({ SaveAsTemplateDialog: () => null }));
vi.mock('@/components/projects/BulkActionsToolbar', () => ({ BulkActionsToolbar: () => null }));
vi.mock('@/components/filters/FilterPresetsManager', () => ({ FilterPresetsManager: () => null }));
vi.mock('@/components/smart-import', () => ({ CSVImportButton: () => null }));
vi.mock('@/components/projects/ProjectHealthBadge', () => ({ ProjectHealthBadge: () => null }));
// Radix menus do not open in jsdom; render the items as plain buttons.
vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick, onSelect }: { children: React.ReactNode; onClick?: () => void; onSelect?: () => void }) => (
    <button type="button" onClick={() => { onClick?.(); onSelect?.(); }}>{children}</button>
  ),
  DropdownMenuSeparator: () => null,
  DropdownMenuLabel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import Projects from '../Projects';

const project = (status: string) => ({
  id: 'p1',
  name: 'Maple St remodel',
  client_name: 'Acme',
  status,
  completion_percentage: 40,
  company_id: 'c1',
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
});

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <Projects />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

async function deleteFirstProject() {
  const items = await screen.findAllByText('Delete Project');
  fireEvent.click(items[0]);
  fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
}

function refusalToast() {
  return toast.mock.calls
    .map(([arg]) => arg as { title: string; description: string; action?: React.ReactElement })
    .find((t) => t.description === PROJECT_HAS_FINANCIAL_RECORDS_MESSAGE);
}

describe('Projects page: delete refused because of financial records', () => {
  beforeEach(() => {
    toast.mockReset();
    getProjects.mockReset();
    deleteProject.mockReset();
    archiveProject.mockReset();
  });

  it('explains the refusal and archives from the toast action', async () => {
    getProjects.mockResolvedValue([project('active')]);
    deleteProject.mockRejectedValue(new ProjectHasFinancialRecordsError('p1'));
    archiveProject.mockResolvedValue(undefined);

    renderPage();
    await deleteFirstProject();

    await waitFor(() => expect(refusalToast()).toBeDefined());
    const t = refusalToast()!;
    expect(t.title).toBe('Project not deleted');
    expect(t.action).toBeDefined();

    (t.action!.props as { onClick: () => void }).onClick();
    await waitFor(() => expect(archiveProject).toHaveBeenCalledWith('p1'));
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Project archived' }))
    );
    expect(toast).not.toHaveBeenCalledWith(expect.objectContaining({ title: 'Project deleted' }));
  });

  it('shows the RPC reason when archiving is refused', async () => {
    getProjects.mockResolvedValue([project('active')]);
    deleteProject.mockRejectedValue(new ProjectHasFinancialRecordsError('p1'));
    archiveProject.mockRejectedValue({ code: 'P0001', message: 'Cannot close: 1200.00 is still outstanding on this job' });

    renderPage();
    await deleteFirstProject();
    await waitFor(() => expect(refusalToast()).toBeDefined());
    (refusalToast()!.action!.props as { onClick: () => void }).onClick();

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Could not archive project',
          description: 'Cannot close: 1200.00 is still outstanding on this job',
        })
      )
    );
  });
});
