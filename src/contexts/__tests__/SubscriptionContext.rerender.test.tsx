/**
 * US-219: render counts for SubscriptionContext consumers.
 *
 * Two things used to cascade through every useSubscription() consumer:
 *  - an auth token refresh, which replaces the User object, re-ran the load
 *    effect (loading true -> false plus two fresh objects);
 *  - a realtime refetch, which stored a new object even when the row was
 *    unchanged.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, waitFor } from '@testing-library/react';
import React, { createContext, useContext, useState } from 'react';

type FakeAuth = {
  user: { id: string; email: string } | null;
  userProfile: { id: string; company_id: string } | null;
};

const FakeAuthContext = createContext<FakeAuth>({ user: null, userProfile: null });

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => useContext(FakeAuthContext),
}));
vi.mock('../AuthContext', () => ({
  useAuth: () => useContext(FakeAuthContext),
}));

let realtimePayload: (() => void) | null = null;
vi.mock('@/hooks/useSupabaseSubscription', () => ({
  useSupabaseSubscription: (cfg: { onPayload: () => void }) => {
    realtimePayload = cfg.onPayload;
  },
}));

const mockInvoke = vi.fn();
const companyRow = { trial_end_date: null, subscription_status: 'active' };

function countQuery(n: number) {
  // The seat count adds .neq('role', 'client_portal') after .eq (US-335).
  const result = Promise.resolve({ count: n });
  return { eq: vi.fn(() => Object.assign(result, { neq: vi.fn(() => result) })) };
}

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: { invoke: (...args: unknown[]) => mockInvoke(...args) },
    // company_storage_used_bytes (US-335).
    rpc: vi.fn(() => Promise.resolve({ data: 0, error: null })),
    from: vi.fn((table: string) => {
      if (table === 'companies') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: { ...companyRow } }),
            }),
          }),
        };
      }
      if (table === 'user_profiles') return { select: () => countQuery(3) };
      if (table === 'projects') return { select: () => countQuery(7) };
      return { select: vi.fn() };
    }),
  },
}));

import {
  SubscriptionProvider,
  useSubscription,
  useSubscriptionActions,
} from '../SubscriptionContext';

const USER_ID = '550e8400-e29b-41d4-a716-446655440000';
const COMPANY_ID = '660e8400-e29b-41d4-a716-446655440001';
const makeUser = () => ({ id: USER_ID, email: 'a@example.com' });
const makeProfile = () => ({ id: USER_ID, company_id: COMPANY_ID });
const makeSub = (tier = 'professional') => ({
  subscription_tier: tier,
  billing_period: 'monthly',
  subscription_end: '2027-01-01',
  subscribed: true,
  stripe_customer_id: 'cus_1',
});

const counts = { data: 0, actions: 0 };
let latest: ReturnType<typeof useSubscription> | null = null;
let latestActions: ReturnType<typeof useSubscriptionActions> | null = null;
let setAuth: ((a: FakeAuth) => void) | null = null;

const DataConsumer = React.memo(function DataConsumer() {
  const value = useSubscription();
  counts.data++;
  latest = value;
  return <span>{value.limits.name}</span>;
});

const ActionsConsumer = React.memo(function ActionsConsumer() {
  latestActions = useSubscriptionActions();
  counts.actions++;
  return null;
});

function Harness() {
  const [auth, set] = useState<FakeAuth>({ user: makeUser(), userProfile: makeProfile() });
  setAuth = set;
  return (
    <FakeAuthContext.Provider value={auth}>
      <SubscriptionProvider>
        <DataConsumer />
        <ActionsConsumer />
      </SubscriptionProvider>
    </FakeAuthContext.Provider>
  );
}

async function renderLoaded() {
  render(<Harness />);
  await waitFor(() => {
    expect(latest?.loading).toBe(false);
    expect(latest?.subscriptionStatus?.tier).toBe('professional');
    expect(latest?.usage.projects).toBe(7);
  });
  counts.data = 0;
  counts.actions = 0;
}

describe('SubscriptionContext re-renders (US-219)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    counts.data = 0;
    counts.actions = 0;
    latest = null;
    latestActions = null;
    realtimePayload = null;
    mockInvoke.mockImplementation(() => Promise.resolve({ data: makeSub(), error: null }));
  });

  it('an auth token refresh (new User object, same id) does not refetch or re-render', async () => {
    await renderLoaded();
    const invokesBefore = mockInvoke.mock.calls.length;

    await act(async () => {
      setAuth!({ user: makeUser(), userProfile: makeProfile() });
    });
    // Let any refetch the effect might have started settle.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(mockInvoke.mock.calls.length).toBe(invokesBefore);
    expect(counts.data).toBe(0);
    expect(counts.actions).toBe(0);
  });

  it('a realtime refetch returning the same row does not re-render consumers', async () => {
    await renderLoaded();
    const before = latest!;

    await act(async () => {
      realtimePayload!();
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(mockInvoke).toHaveBeenCalledTimes(2);
    expect(counts.data).toBe(0);
    expect(counts.actions).toBe(0);
    expect(latest).toBe(before);
  });

  it('a realtime refetch with a changed tier reaches data readers only', async () => {
    await renderLoaded();
    const actionsBefore = latestActions;
    mockInvoke.mockImplementation(() => Promise.resolve({ data: makeSub('enterprise'), error: null }));

    await act(async () => {
      realtimePayload!();
      await new Promise((r) => setTimeout(r, 0));
    });

    await waitFor(() => expect(latest?.subscriptionData?.subscription_tier).toBe('enterprise'));
    expect(latest?.hasUnlimitedAccess()).toBe(true);
    expect(latest?.limits.name).not.toBe('Professional');
    expect(counts.data).toBeGreaterThan(0);
    expect(counts.actions).toBe(0);
    expect(latestActions).toBe(actionsBefore);
  });

  it('refreshUsage with unchanged counts does not re-render', async () => {
    await renderLoaded();

    await act(async () => {
      await latestActions!.refreshUsage();
    });

    expect(counts.data).toBe(0);
  });

  it('useSubscription() keeps its public shape and the actions match', async () => {
    await renderLoaded();
    expect(Object.keys(latest!).sort()).toEqual(
      [
        'subscriptionData',
        'subscriptionStatus',
        'usage',
        'limits',
        'loading',
        'checkLimit',
        'getUpgradeRequirement',
        'refreshSubscription',
        'refreshUsage',
        'isSubscribed',
        'canUseFeature',
        'hasUnlimitedAccess',
      ].sort()
    );
    expect(latest!.refreshSubscription).toBe(latestActions!.refreshSubscription);
    expect(latest!.refreshUsage).toBe(latestActions!.refreshUsage);
    expect(latest!.checkLimit('projects', 1)).toMatchObject({ currentUsage: 7, canAdd: true });
  });

  it('switching company still refetches', async () => {
    await renderLoaded();
    const invokesBefore = mockInvoke.mock.calls.length;

    await act(async () => {
      setAuth!({
        user: makeUser(),
        userProfile: { id: USER_ID, company_id: '770e8400-e29b-41d4-a716-446655440002' },
      });
    });
    await waitFor(() => expect(mockInvoke.mock.calls.length).toBeGreaterThan(invokesBefore));
  });
});
