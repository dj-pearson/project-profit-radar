import { describe, it, expect, vi, beforeEach } from 'vitest';
import { waitFor } from '@testing-library/react';

// US-360: session replays must not carry customer data.

type Captured = { __posthogInit?: unknown[][] };
const g = globalThis as Captured;

vi.mock('@/lib/consent/consentStore', () => ({
  mayLoadAnalytics: () => true,
  subscribeToConsent: () => () => {},
}));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { auth: { getUser: vi.fn() }, from: vi.fn() },
}));
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() } }));

describe('PostHog session recording (US-360)', () => {
  beforeEach(() => {
    vi.resetModules();
    g.__posthogInit = [];
    vi.stubEnv('VITE_POSTHOG_API_KEY', 'phc_test');
    // doMock after resetModules so the dynamic import inside initPostHog gets
    // this instead of the real SDK. Calls are recorded on globalThis because
    // the factory runs in a fresh module scope.
    vi.doMock('posthog-js', () => ({
      default: {
        init: (...a: unknown[]) => { (globalThis as Captured).__posthogInit!.push(a); },
        capture: () => {}, identify: () => {}, reset: () => {},
      },
    }));
  });

  it('masks every input and all page text, and skips cross-origin frames', async () => {
    // analytics.ts calls Analytics.init() itself when imported.
    await import('../analytics');

    await waitFor(() => expect(g.__posthogInit).toHaveLength(1));
    const config = g.__posthogInit![0][1] as Record<string, unknown>;
    expect(config.mask_all_text).toBe(true);
    expect(config.session_recording).toMatchObject({
      maskAllInputs: true,
      maskTextSelector: '*',
      recordCrossOriginIframes: false,
    });
  });
});
