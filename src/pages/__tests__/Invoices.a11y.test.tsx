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

vi.mock('@/hooks/usePersistedState', () => ({
  usePersistedState: (key: string, defaultValue: unknown) => {
    const [state, setState] = React.useState(defaultValue);
    return [state, setState];
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

// Mock AccessiblePageWrapper
vi.mock('@/components/accessibility/AccessiblePageWrapper', () => ({
  AccessiblePageWrapper: ({ children, pageTitle }: { children: React.ReactNode; pageTitle: string }) => (
    <main role="main" aria-label={pageTitle}>
      {children}
    </main>
  ),
}));

// Mock invoice sub-components
vi.mock('@/components/InvoiceGenerator', () => ({
  default: () => <div data-testid="invoice-generator">Invoice Generator</div>,
}));
vi.mock('@/components/invoices/InvoiceList', () => ({
  default: () => <div data-testid="invoice-list">Invoice List</div>,
}));
vi.mock('@/components/invoices/InvoiceStats', () => ({
  default: () => <div data-testid="invoice-stats">Invoice Stats</div>,
}));
vi.mock('@/components/invoices/ProgressBillingManager', () => ({
  default: () => <div data-testid="progress-billing">Progress Billing</div>,
}));
vi.mock('@/components/invoices/RetentionManager', () => ({
  default: () => <div data-testid="retention-manager">Retention</div>,
}));

import Invoices from '../Invoices';

describe('Invoices page a11y', () => {
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
          <Invoices />
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
    const headings = screen.getAllByRole('heading');
    expect(headings.length).toBeGreaterThan(0);
    // The page should have at least one heading with invoice-related text
    const hasInvoiceHeading = headings.some(
      (h) => h.textContent && /invoice/i.test(h.textContent)
    );
    expect(hasInvoiceHeading).toBe(true);
  });

  it('renders tab navigation for invoice sections', () => {
    renderPage();
    const tablist = screen.getByRole('tablist');
    expect(tablist).toBeInTheDocument();
    const tabs = screen.getAllByRole('tab');
    expect(tabs.length).toBeGreaterThan(0);
  });
});
