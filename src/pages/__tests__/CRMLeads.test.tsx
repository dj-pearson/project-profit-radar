import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

// Stable references: the page's effect depends on user and userProfile.
const MOCK_USER = { id: 'u-1', email: 'pm@example.com' };
let MOCK_PROFILE: { id: string; company_id: string | null; role: string } = { id: 'u-1', company_id: 'co-1', role: 'admin' };
const MOCK_AUTH = { user: MOCK_USER, get userProfile() { return MOCK_PROFILE; }, loading: false };
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => MOCK_AUTH }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/components/layout/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/components/crm/LeadsKanbanBoard', () => ({ LeadsKanbanBoard: () => null }));
vi.mock('@/components/crm/LeadDetailView', () => ({ LeadDetailView: () => null }));
vi.mock('@/components/smart-import', () => ({ CSVImportButton: () => null }));

type Call = [string, ...unknown[]];
let calls: Call[] = [];

function builder() {
  const b: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'neq', 'order', 'update', 'insert']) {
    b[m] = (...args: unknown[]) => {
      calls.push([m, ...args]);
      return b;
    };
  }
  b.then = (resolve: (v: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(resolve);
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

import CRMLeads from '../CRMLeads';

describe('CRMLeads tenant scoping (US-365)', () => {
  beforeEach(() => {
    calls = [];
    MOCK_PROFILE = { id: 'u-1', company_id: 'co-1', role: 'admin' };
  });

  it("filters the leads query on the caller's company_id", async () => {
    render(<MemoryRouter><CRMLeads /></MemoryRouter>);
    await waitFor(() => expect(calls).toContainEqual(['from', 'leads']));
    expect(calls).toContainEqual(['eq', 'company_id', 'co-1']);
  });

  it('does not query leads at all without a company', async () => {
    MOCK_PROFILE = { id: 'u-1', company_id: null, role: 'root_admin' };
    render(<MemoryRouter><CRMLeads /></MemoryRouter>);
    await new Promise(r => setTimeout(r, 20));
    expect(calls).not.toContainEqual(['from', 'leads']);
  });
});
