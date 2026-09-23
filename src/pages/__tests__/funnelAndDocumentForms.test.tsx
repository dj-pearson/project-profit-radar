import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// US-268: admin FunnelManager "Create New Funnel" and Document Management
// "Upload Documents" validate with react-hook-form.

const h = vi.hoisted(() => ({
  insert: vi.fn(),
  upload: vi.fn(),
  docInsert: vi.fn(),
  auth: { user: { id: 'u-1' }, userProfile: { id: 'u-1', company_id: 'co-1' } },
}));

vi.mock('@/components/ui/select', () => import('@/test/selectMock'));
vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn(), useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => h.auth }));
vi.mock('@/components/layout/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/components/accessibility/AccessiblePageWrapper', () => ({
  AccessiblePageWrapper: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/components/funnel/FunnelAnalytics', () => ({ FunnelAnalytics: () => null }));
vi.mock('@/components/smart-import/SmartImportWizard', () => ({ SmartImportWizard: () => null }));
vi.mock('@/components/documents/DocumentPreviewModal', () => ({ DocumentPreviewModal: () => null }));
vi.mock('@/hooks/useDocumentManagement', () => ({
  useDocumentManagement: () => ({
    documents: [],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    categories: [{ id: 'c-1', name: 'Plans' }],
    projects: [],
    optionsError: null,
    refetchOptions: vi.fn(),
    invalidate: vi.fn(),
    insert: { mutateAsync: h.docInsert },
    remove: { mutateAsync: vi.fn() },
    move: { mutateAsync: vi.fn() },
    tag: { mutateAsync: vi.fn() },
  }),
}));
vi.mock('@/integrations/supabase/client', () => {
  const chain = (table: string) => {
    const q: Record<string, unknown> = {};
    for (const m of ['select', 'eq', 'order']) q[m] = () => q;
    q.then = (res: (v: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(res);
    q.single = () =>
      Promise.resolve({ data: table === 'user_profiles' ? { company_id: 'co-1' } : { id: 'f-1' }, error: null });
    q.insert = (row: unknown) => {
      h.insert(table, row);
      return q;
    };
    return q;
  };
  return {
    supabase: {
      from: chain,
      auth: { getUser: () => Promise.resolve({ data: { user: { id: 'u-1' } } }) },
      storage: {
        from: (bucket: string) => ({
          upload: (path: string, file: File) => {
            h.upload(bucket, path, file);
            return Promise.resolve({ error: null });
          },
        }),
      },
    },
  };
});

import FunnelManager from '../admin/FunnelManager';
import DocumentManagement from '../DocumentManagement';

const wrap = (ui: React.ReactElement) =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  h.docInsert.mockResolvedValue({});
});

describe('Create New Funnel dialog', () => {
  it('requires a name and trigger inline, then inserts the same row', async () => {
    const user = userEvent.setup();
    wrap(<FunnelManager />);
    await user.click(screen.getByRole('button', { name: /Create Funnel/ }));
    await user.click(screen.getByRole('button', { name: 'Create Funnel' }));
    expect(await screen.findByText('Funnel name is required')).toBeInTheDocument();
    expect(screen.getByText('Select a trigger event')).toBeInTheDocument();
    expect(screen.getByLabelText('Funnel Name')).toHaveAttribute('aria-invalid', 'true');
    expect(h.insert).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText('Funnel Name'), 'Trial Onboarding');
    await user.click(screen.getByRole('option', { name: 'Trial Signup' }));
    await user.click(screen.getByRole('button', { name: 'Create Funnel' }));
    await waitFor(() =>
      expect(h.insert).toHaveBeenCalledWith('lead_funnels', [
        { name: 'Trial Onboarding', description: '', trigger_event: 'trial_signup', company_id: 'co-1' },
      ]),
    );
  });
});

describe('Upload Documents dialog', () => {
  it('asks for a file inline, then uploads and records it', async () => {
    const user = userEvent.setup();
    wrap(<DocumentManagement />);
    await user.click(screen.getAllByRole('button', { name: /Upload Files/ })[0]);
    await user.click(screen.getByRole('button', { name: 'Upload' }));
    expect(await screen.findByText('Select at least one file')).toBeInTheDocument();
    expect(screen.getByLabelText('Files *')).toHaveAttribute('aria-invalid', 'true');
    expect(h.upload).not.toHaveBeenCalled();

    const file = new File(['spec'], 'spec.txt', { type: 'text/plain' });
    await user.upload(screen.getByLabelText('Files *'), file);
    await user.click(screen.getByRole('option', { name: 'Plans' }));
    await user.type(screen.getByLabelText('Description'), 'Framing spec');
    await user.click(screen.getByRole('button', { name: 'Upload' }));

    await waitFor(() => expect(h.docInsert).toHaveBeenCalledTimes(1));
    expect(h.upload).toHaveBeenCalledWith('company-documents', expect.stringMatching(/^co-1\/.+\.txt$/), file);
    expect(h.docInsert.mock.calls[0][0]).toEqual({
      name: 'spec.txt',
      description: 'Framing spec',
      file_path: expect.stringMatching(/^co-1\//),
      file_type: 'text/plain',
      file_size: 4,
      category_id: 'c-1',
      project_id: null,
      company_id: 'co-1',
      uploaded_by: 'u-1',
      version: 1,
      is_current_version: true,
    });
  });
});
