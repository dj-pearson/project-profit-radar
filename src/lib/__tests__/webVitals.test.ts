/**
 * US-207: Core Web Vitals are routed to analytics (PostHog + Supabase)
 *
 * Verifies the trackWebVital helper emits a `web_vital` event with useful
 * dimensions via the shared Analytics layer (which sends to PostHog when
 * configured and always persists to Supabase user_events).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Keep the import side-effect free: stub the Supabase client so importing
// the analytics module (which calls Analytics.init on import) does no network.
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    from: vi.fn(() => ({
      insert: vi.fn().mockResolvedValue({ error: null }),
      upsert: vi.fn().mockResolvedValue({ error: null }),
    })),
  },
}));

import Analytics, { trackWebVital } from '@/lib/analytics';

describe('trackWebVital (US-207)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('emits a single web_vital event through the Analytics layer', () => {
    const trackSpy = vi.spyOn(Analytics, 'track').mockResolvedValue(undefined);

    trackWebVital({
      name: 'LCP',
      value: 2345.678,
      rating: 'good',
      delta: 2345.678,
      id: 'v1-123',
    });

    expect(trackSpy).toHaveBeenCalledTimes(1);
    expect(trackSpy).toHaveBeenCalledWith('web_vital', expect.any(Object));
  });

  it('includes the metric name, rating and rounded value as dimensions', () => {
    const trackSpy = vi.spyOn(Analytics, 'track').mockResolvedValue(undefined);

    trackWebVital({
      name: 'CLS',
      value: 0.123456,
      rating: 'needs-improvement',
      delta: 0.0009,
      id: 'v1-cls',
    });

    const props = trackSpy.mock.calls[0][1] as Record<string, unknown>;
    expect(props.metric_name).toBe('CLS');
    expect(props.metric_rating).toBe('needs-improvement');
    // value rounded to 3 decimals
    expect(props.metric_value).toBe(0.123);
    expect(props.metric_id).toBe('v1-cls');
    expect(props).toHaveProperty('page_path');
  });
});
