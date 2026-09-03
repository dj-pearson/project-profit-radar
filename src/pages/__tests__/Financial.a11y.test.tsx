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

vi.mock('@/hooks/useGoogleAnalytics', () => ({
  gtag: { trackFeature: vi.fn(), event: vi.fn() },
}));

// Mock RoleGuard to just render children
vi.mock('@/components/auth/RoleGuard', () => ({
  RoleGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  ROLE_GROUPS: {
    FINANCIAL_VIEWERS: ['admin', 'accounting'],
    ALL: ['admin'],
  },
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

// Mock mobile helpers
vi.mock('@/utils/mobileHelpers', () => ({
  mobileGridClasses: vi.fn().mockReturnValue(''),
  mobileFilterClasses: vi.fn().mockReturnValue(''),
  mobileButtonClasses: vi.fn().mockReturnValue(''),
  mobileTextClasses: vi.fn().mockReturnValue(''),
}));

// Mock financial sub-components
vi.mock('@/components/financial/CashFlowSnapshot', () => ({
  default: () => <div data-testid="cash-flow-snapshot">Cash Flow</div>,
}));
vi.mock('@/components/financial/JobProfitabilityOverview', () => ({
  default: () => <div data-testid="job-profitability">Profitability</div>,
}));
vi.mock('@/components/financial/InvoicingPayments', () => ({
  default: () => <div data-testid="invoicing-payments">Invoicing</div>,
}));
vi.mock('@/components/financial/ExpensesByCategory', () => ({
  default: () => <div data-testid="expenses">Expenses</div>,
}));
vi.mock('@/components/financial/UpcomingPayments', () => ({
  default: () => <div data-testid="upcoming-payments">Upcoming</div>,
}));
vi.mock('@/components/financial/ProjectPipeline', () => ({
  default: () => <div data-testid="project-pipeline">Pipeline</div>,
}));
vi.mock('@/components/financial/EstimateTracking', () => ({
  default: () => <div data-testid="estimate-tracking">Estimates</div>,
}));
vi.mock('@/components/financial/ProfitLossSummary', () => ({
  default: () => <div data-testid="profit-loss">P&L</div>,
}));
vi.mock('@/components/financial/BudgetVsActualTracking', () => ({
  BudgetVsActualTracking: () => <div data-testid="budget-tracking">Budget</div>,
}));
vi.mock('@/components/financial/CashFlowForecasting', () => ({
  CashFlowForecasting: () => <div data-testid="cash-flow-forecasting">Forecasting</div>,
}));
vi.mock('@/components/expenses/ExpenseTracker', () => ({
  ExpenseTracker: () => <div data-testid="expense-tracker">Expense Tracker</div>,
}));
vi.mock('@/components/InvoiceGenerator', () => ({
  default: () => <div data-testid="invoice-generator">Invoice Generator</div>,
}));
vi.mock('@/components/financial/Form1099Manager', () => ({
  default: () => <div data-testid="form-1099">1099</div>,
}));
vi.mock('@/components/financial/StripePaymentProcessor', () => ({
  StripePaymentProcessor: () => <div data-testid="stripe-processor">Stripe</div>,
}));
vi.mock('@/components/financial/PaymentSettings', () => ({
  PaymentSettings: () => <div data-testid="payment-settings">Payment Settings</div>,
}));

import FinancialDashboard from '../FinancialDashboard';

describe('Financial Dashboard page a11y', () => {
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
          <FinancialDashboard />
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
    expect(main).toHaveAttribute('aria-label', 'Financial Dashboard');
  });

  it('has a page heading', () => {
    renderPage();
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toBeInTheDocument();
    expect(heading.textContent).toContain('Financial Dashboard');
  });

  it('uses AccessiblePageWrapper for proper page structure', () => {
    renderPage();
    const main = screen.getByRole('main');
    expect(main).toHaveAttribute('aria-label');
  });
});
