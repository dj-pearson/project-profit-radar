import { describe, it, expect, vi } from 'vitest';
import { render, waitFor, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { HelmetProvider } from 'react-helmet-async';
import type { AxeResults } from 'axe-core';
import { runAxe } from '@/test/accessibility-utils';

// US-221: axe-core over the authenticated pages that sit next in line after the
// top ~20 (US-010..014). Each page renders with its real children and the real
// AccessiblePageWrapper; only the data layer and the app chrome are stubbed.
//
// The bar is the same one tests/e2e/accessibility.spec.ts holds public pages
// to: zero serious or critical violations. Moderate and minor are left out
// because several are judgement calls axe cannot make from a fragment.
// color-contrast is off because happy-dom does no layout or style resolution,
// so axe cannot compute a colour for anything; the Playwright suite covers it.

type Result = { data: unknown; error: unknown; count?: number };
const EMPTY: Result = { data: [], error: null, count: 0 };

// Every query-builder method returns the builder; awaiting it yields no rows.
// single()/maybeSingle() resolve to a null row, which is what PostgREST gives a
// new account and what these empty-state renders are about.
function builder(result: Result = EMPTY): unknown {
  const b: unknown = new Proxy(function noop() {}, {
    get(_t, prop) {
      if (prop === 'then') {
        return (res: (v: Result) => unknown, rej: (e: unknown) => unknown) =>
          Promise.resolve(result).then(res, rej);
      }
      if (prop === 'single' || prop === 'maybeSingle') {
        return () => builder({ data: null, error: null });
      }
      return () => b;
    },
  });
  return b;
}

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => builder(),
    rpc: () => builder(),
    functions: { invoke: vi.fn(async () => ({ data: null, error: null })) },
    storage: {
      from: () => ({
        upload: vi.fn(),
        createSignedUrl: vi.fn(async () => ({ data: null, error: null })),
        getPublicUrl: () => ({ data: { publicUrl: '' } }),
        remove: vi.fn(),
        list: vi.fn(async () => ({ data: [], error: null })),
      }),
    },
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
    channel: vi.fn().mockReturnValue({ on: vi.fn().mockReturnThis(), subscribe: vi.fn() }),
    removeChannel: vi.fn(),
  },
}));

// Stable identities: pages' effects depend on user/userProfile, and the real
// AuthContext memoises its value.
const AUTH = {
  user: { id: 'u1', email: 'a@b.co' },
  userProfile: { id: 'u1', company_id: 'c1', role: 'admin', first_name: 'Ada', last_name: 'Lovelace', email: 'a@b.co' },
  loading: false,
  signOut: vi.fn(),
  refreshProfile: vi.fn(),
};
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => AUTH,
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light', setTheme: vi.fn(), resolvedTheme: 'light' }),
}));

vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/hooks/useSubscriptionLimits', () => ({
  useSubscriptionLimits: () => ({
    checkLimit: () => ({ canAdd: true, limit: -1 }),
    getUpgradeRequirement: () => null,
    subscriptionData: null,
    usage: {},
    loading: false,
    refreshData: vi.fn(),
  }),
}));

vi.mock('@/components/auth/RoleGuard', () => ({
  RoleGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  ROLE_GROUPS: new Proxy({}, { get: () => ['admin'] }),
}));

// The layout's own chrome (sidebar, search, notifications) has its own tests;
// here it would only add network calls. Keep the parts that decide the page's
// landmarks and its one <h1>, which is what heading-order and landmark rules
// look at.
vi.mock('@/components/layout/DashboardLayout', async () => {
  const { PageHeader } = await import('@/components/ui/PageHeader');
  return {
    DashboardLayout: ({
      children,
      title,
      description,
      headerActions,
      hasAccessibleWrapper,
    }: {
      children: React.ReactNode;
      title?: string;
      description?: React.ReactNode;
      headerActions?: React.ReactNode;
      hasAccessibleWrapper?: boolean;
    }) => {
      const body = (
        <>
          {title ? (
            <PageHeader title={title} description={description} actions={headerActions} />
          ) : (
            <h1 id="page-title">Brikly</h1>
          )}
          {children}
        </>
      );
      return (
        <div>
          <header role="banner" aria-label="Dashboard header" />
          {hasAccessibleWrapper ? (
            <div>{body}</div>
          ) : (
            <main role="main" aria-labelledby="page-title">
              {body}
            </main>
          )}
        </div>
      );
    },
  };
});

vi.mock('@/components/smart-import', () => ({ CSVImportButton: () => null }));
vi.mock('@/components/smart-import/SmartImportWizard', () => ({ SmartImportWizard: () => null }));

import TimeTracking from '../TimeTracking';
import EstimatesHub from '../EstimatesHub';
import CRMDashboard from '../CRMDashboard';
import Equipment from '../Equipment';
import Materials from '../Materials';
import Safety from '../Safety';
import Reports from '../Reports';
import TeamManagement from '../TeamManagement';
import DocumentManagement from '../DocumentManagement';
import UserSettings from '../UserSettings';
import PurchaseOrders from '../PurchaseOrders';
import RFIs from '../RFIs';
import PunchList from '../PunchList';

const PAGES: Array<[string, React.ComponentType, string]> = [
  ['TimeTracking', TimeTracking, '/time-tracking'],
  ['EstimatesHub', EstimatesHub, '/estimates'],
  ['CRMDashboard', CRMDashboard, '/crm'],
  ['Equipment', Equipment, '/equipment'],
  ['Materials', Materials, '/materials'],
  ['Safety', Safety, '/safety'],
  ['Reports', Reports, '/reports'],
  ['TeamManagement', TeamManagement, '/team'],
  ['DocumentManagement', DocumentManagement, '/documents'],
  ['UserSettings', UserSettings, '/settings'],
  ['PurchaseOrders', PurchaseOrders, '/purchase-orders'],
  ['RFIs', RFIs, '/rfis'],
  ['PunchList', PunchList, '/punch-list'],
];

function blocking(violations: AxeResults['violations']): string[] {
  return violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .flatMap((v) => v.nodes.map((n) => `[${v.impact}] ${v.id}: ${n.html.slice(0, 200)}`));
}

const AXE_OPTIONS = {
  runOnly: { type: 'tag' as const, values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
  rules: { 'color-contrast': { enabled: false } },
};

const settle = () => act(() => new Promise((r) => setTimeout(r, 50)));

describe('authenticated pages a11y (US-221)', () => {
  // Radix only mounts the active tab panel, so a scan of the first render
  // misses every other tab. Walk them all: that is where most of these pages
  // keep their forms.
  it.each(PAGES)('%s has no serious or critical axe violations on any tab', async (_name, Page, path) => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { container } = render(
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={[path]}>
            <Page />
          </MemoryRouter>
        </QueryClientProvider>
      </HelmetProvider>,
    );

    // Let the initial queries settle so axe sees the loaded (empty) page, not
    // the first skeleton frame.
    await waitFor(() => expect(container.querySelector('h1')).not.toBeNull());
    await settle();

    const found: string[] = [];
    const scan = async (where: string) => {
      const results = await runAxe(container, AXE_OPTIONS);
      found.push(...blocking(results.violations).map((f) => `${where} ${f}`));
    };

    await scan('(initial)');
    const tabs = Array.from(container.querySelectorAll<HTMLElement>('[role="tab"]'));
    for (const tab of tabs) {
      if (tab.getAttribute('aria-selected') === 'true') continue;
      fireEvent.mouseDown(tab, { button: 0, ctrlKey: false });
      await settle();
      await scan(`(tab "${tab.textContent?.trim()}")`);
    }

    expect(found, found.join('\n')).toEqual([]);
  });

  it.each(PAGES)('%s exposes exactly one main landmark and one h1', async (_name, Page, path) => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { container } = render(
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={[path]}>
            <Page />
          </MemoryRouter>
        </QueryClientProvider>
      </HelmetProvider>,
    );
    await waitFor(() => expect(container.querySelector('h1')).not.toBeNull());
    expect(container.querySelectorAll('main, [role="main"]')).toHaveLength(1);
    expect(container.querySelectorAll('h1')).toHaveLength(1);
  });
});
