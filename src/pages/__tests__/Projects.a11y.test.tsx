import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock auth context
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user', email: 'test@test.com' },
    userProfile: { id: 'test-user', company_id: 'test-company', role: 'admin' },
    loading: false,
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock subscription context
vi.mock('@/contexts/SubscriptionContext', () => ({
  useSubscription: () => ({
    checkLimit: vi.fn().mockReturnValue(true),
    getUpgradeRequirement: vi.fn().mockReturnValue(null),
    subscriptionData: { plan: 'pro' },
    usage: {},
  }),
  SubscriptionProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    }),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test' } }, error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
    channel: vi.fn().mockReturnValue({ on: vi.fn().mockReturnThis(), subscribe: vi.fn() }),
    removeChannel: vi.fn(),
  },
}));

// Mock project service
vi.mock('@/services/projectService', () => ({
  projectService: {
    getProjects: vi.fn().mockResolvedValue([]),
    deleteProject: vi.fn().mockResolvedValue(undefined),
  },
  ProjectWithRelations: {},
}));

// Mock hooks
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/hooks/useGoogleAnalytics', () => ({
  gtag: { trackFeature: vi.fn(), event: vi.fn() },
}));

vi.mock('@/hooks/usePersistedState', () => ({
  usePersistedState: (key: string, defaultValue: unknown) => {
    const [state, setState] = React.useState(defaultValue);
    return [state, setState];
  },
}));

// Mock accessibility hooks
vi.mock('@/hooks/useAccessibilityHelpers', () => {
  let idCounter = 0;
  return {
    useFocusTrap: () => ({ current: null }),
    useAriaId: (prefix: string) => `${prefix}-${++idCounter}`,
    useEscapeKey: vi.fn(),
    useClickOutside: () => ({ current: null }),
  };
});

// Mock DashboardLayout to simplify rendering
vi.mock('@/components/layout/DashboardLayout', () => ({
  DashboardLayout: ({ children, title }: { children: React.ReactNode; title: string }) => (
    <div data-testid="dashboard-layout">
      <h1>{title}</h1>
      {children}
    </div>
  ),
}));

// Mock AccessiblePageWrapper
vi.mock('@/components/accessibility/AccessiblePageWrapper', () => ({
  AccessiblePageWrapper: ({ children, pageTitle }: { children: React.ReactNode; pageTitle: string }) => (
    <main role="main" aria-label={pageTitle}>
      {children}
    </main>
  ),
}));

// Mock complex sub-components
vi.mock('@/components/tasks/TaskManager', () => ({
  TaskManager: () => <div data-testid="task-manager" />,
}));

vi.mock('@/components/subscription/UpgradePrompt', () => ({
  default: () => <div data-testid="upgrade-prompt" />,
}));

vi.mock('@/components/projects/SaveAsTemplateDialog', () => ({
  SaveAsTemplateDialog: () => null,
}));

vi.mock('@/components/projects/BulkActionsToolbar', () => ({
  BulkActionsToolbar: () => null,
}));

vi.mock('@/components/filters/FilterPresetsManager', () => ({
  FilterPresetsManager: () => null,
}));

vi.mock('@/components/smart-import', () => ({
  CSVImportButton: () => null,
}));

vi.mock('@/components/ui/virtualized-grid', () => ({
  VirtualizedGrid: () => <div data-testid="virtualized-grid" />,
}));

import Projects from '../Projects';

describe('Projects page a11y', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  const renderPage = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Projects />
        </BrowserRouter>
      </QueryClientProvider>
    );

  it('renders without crashing', () => {
    const { container } = renderPage();
    expect(container).toBeTruthy();
  });

  it('has a main landmark with accessible label', () => {
    renderPage();
    const main = screen.getByRole('main');
    expect(main).toBeInTheDocument();
    expect(main).toHaveAttribute('aria-label');
  });

  it('has a page heading', () => {
    renderPage();
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toBeInTheDocument();
    expect(heading.textContent).toBeTruthy();
  });
});
