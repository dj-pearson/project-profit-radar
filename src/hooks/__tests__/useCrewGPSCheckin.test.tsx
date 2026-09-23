/**
 * US-367: crew_assignments_pending_checkin has crew_member_id, not user_id
 * (20251110000002_crew_gps_checkin.sql and types.ts). Filtering on user_id
 * made PostgREST reject the query, so the pending list never loaded.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

type Call = { table: string; method: string; args: unknown[] };
const calls: Call[] = [];

function builder(table: string) {
  const b: Record<string, unknown> = {};
  for (const method of ['select', 'eq', 'order']) {
    b[method] = (...args: unknown[]) => {
      calls.push({ table, method, args });
      return b;
    };
  }
  b.then = (resolve: (r: unknown) => unknown) =>
    Promise.resolve({ data: [{ id: 'a1', crew_member_id: 'user-1' }], error: null }).then(resolve);
  return b;
}

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (table: string) => builder(table), rpc: vi.fn() },
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/hooks/useGPSLocation', () => ({
  useGPSLocation: () => ({ location: null, error: null, requestLocation: vi.fn() }),
}));

import { useCrewGPSCheckin } from '../useCrewGPSCheckin';

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
);

describe('useCrewGPSCheckin pending check-ins (US-367)', () => {
  beforeEach(() => {
    calls.length = 0;
  });

  it('filters the pending-checkin view by crew_member_id', async () => {
    const { result } = renderHook(() => useCrewGPSCheckin(), { wrapper });

    await waitFor(() => expect(result.current.myPendingCheckins).toHaveLength(1));

    const viewFilters = calls.filter(
      (c) => c.table === 'crew_assignments_pending_checkin' && c.method === 'eq'
    );
    expect(viewFilters.map((c) => c.args)).toEqual([['crew_member_id', 'user-1']]);
  });
});
