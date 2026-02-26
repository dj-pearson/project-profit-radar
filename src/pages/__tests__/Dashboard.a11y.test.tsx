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

// Mock hooks
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/hooks/useDashboardData', () => ({
  useDashboardData: () => ({
    data: {
      projects: [],
      recentActivity: [],
      stats: { totalProjects: 0, totalRevenue: 0, totalExpenses: 0 },
    },
    loading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock('@/utils/criticalCSSExtractor', () => ({
  useCriticalCSS: vi.fn(),
}));

// Mock DashboardLayout
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

// Mock dashboard sub-components
vi.mock('@/components/dashboard/RoleDashboard', () => ({
  RoleDashboard: () => <div data-testid="role-dashboard">Dashboard Content</div>,
}));
vi.mock('@/components/dashboard/EmptyDashboard', () => ({
  EmptyDashboard: () => <div data-testid="empty-dashboard">No data</div>,
}));
vi.mock('@/components/dashboard/DashboardSkeleton', () => ({
  DashboardSkeleton: () => <div data-testid="dashboard-skeleton">Loading...</div>,
}));
vi.mock('@/components/onboarding/OnboardingChecklist', () => ({
  OnboardingChecklist: () => <div data-testid="onboarding-checklist" />,
}));
vi.mock('@/components/subscription/SubscriptionUsageWidget', () => ({
  SubscriptionUsageWidget: () => <div data-testid="subscription-widget" />,
}));

import Dashboard from '../Dashboard';

describe('Dashboard page a11y', () => {
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
          <Dashboard />
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
    expect(main).toHaveAttribute('aria-label', 'Dashboard');
  });

  it('has a page heading', () => {
    renderPage();
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toBeInTheDocument();
    expect(heading.textContent).toContain('Dashboard');
  });

  it('uses AccessiblePageWrapper for semantic page structure', () => {
    renderPage();
    // AccessiblePageWrapper provides the main landmark
    const main = screen.getByRole('main');
    expect(main).toHaveAttribute('aria-label');
  });
});
