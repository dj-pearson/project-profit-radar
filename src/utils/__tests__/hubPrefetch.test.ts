/**
 * US-220: navigation-aware hub warm-up
 *
 * warmForRoute should, for a matching hub, warm that hub's primary TanStack
 * query (correct key) and stay a no-op for unmatched routes or when no company
 * is known. Chunk imports are scheduled on timers; we use fake timers so they
 * never actually load page modules during the test.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn() },
}));

import { warmForRoute, HUB_WARMUPS } from '@/utils/hubPrefetch';

const makeQueryClient = () =>
  ({ prefetchQuery: vi.fn().mockResolvedValue(undefined) }) as unknown as Parameters<
    typeof warmForRoute
  >[1];

describe('warmForRoute (US-220)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('has at least one hub registered with chunks and data', () => {
    expect(HUB_WARMUPS.length).toBeGreaterThan(0);
    for (const hub of HUB_WARMUPS) {
      expect(hub.chunks.length).toBeGreaterThan(0);
      expect(hub.data.length).toBeGreaterThan(0);
    }
  });

  it('warms the projects query on the projects hub', () => {
    const qc = makeQueryClient();
    warmForRoute('/projects-hub', qc, 'company-1');
    expect(qc.prefetchQuery).toHaveBeenCalledTimes(1);
    expect((qc.prefetchQuery as ReturnType<typeof vi.fn>).mock.calls[0][0].queryKey).toEqual([
      'projects',
    ]);
  });

  it('warms the invoices query on the financial hub', () => {
    const qc = makeQueryClient();
    warmForRoute('/financial-hub', qc, 'company-1');
    expect(qc.prefetchQuery).toHaveBeenCalledTimes(1);
    expect((qc.prefetchQuery as ReturnType<typeof vi.fn>).mock.calls[0][0].queryKey).toEqual([
      'invoices',
    ]);
  });

  it('no-ops on routes that match no hub', () => {
    const qc = makeQueryClient();
    warmForRoute('/settings/profile', qc, 'company-1');
    expect(qc.prefetchQuery).not.toHaveBeenCalled();
  });

  it('skips data prefetch when no company id is known', () => {
    const qc = makeQueryClient();
    warmForRoute('/projects-hub', qc, undefined);
    expect(qc.prefetchQuery).not.toHaveBeenCalled();
  });
});
