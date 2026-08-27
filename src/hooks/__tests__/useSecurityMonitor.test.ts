import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import {
  useSecurityMonitor,
  logSecurityEvent,
  getQueuedSecurityEvents,
  type SecurityEvent,
} from '../useSecurityMonitor';

// --- Mocks ---

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
      }),
    },
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: null }),
    }),
  },
}));

// We need to access the mock to verify calls
import { supabase } from '@/integrations/supabase/client';

describe('useSecurityMonitor', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // --- Brute force detection ---

  describe('brute force detection', () => {
    it('does not emit for 3 or fewer failures within 60s', () => {
      const onEvent = vi.fn();
      const { result } = renderHook(() => useSecurityMonitor({ onEvent }));

      act(() => {
        result.current.recordAuthFailure();
        result.current.recordAuthFailure();
        result.current.recordAuthFailure();
      });

      expect(onEvent).not.toHaveBeenCalled();
    });

    it('emits brute_force_attempt after >3 failures within 60s', () => {
      const onEvent = vi.fn();
      const { result } = renderHook(() => useSecurityMonitor({ onEvent }));

      act(() => {
        result.current.recordAuthFailure(); // 1
        result.current.recordAuthFailure(); // 2
        result.current.recordAuthFailure(); // 3
        result.current.recordAuthFailure(); // 4 — triggers
      });

      expect(onEvent).toHaveBeenCalledTimes(1);
      expect(onEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'brute_force_attempt',
          details: expect.objectContaining({ attempts: 4 }),
        }),
      );
    });

    it('does not emit when failures are outside the 60s window', () => {
      const onEvent = vi.fn();
      const { result } = renderHook(() => useSecurityMonitor({ onEvent }));

      act(() => {
        result.current.recordAuthFailure(); // 1
        result.current.recordAuthFailure(); // 2
        result.current.recordAuthFailure(); // 3
      });

      // Advance past the 60s window
      act(() => {
        vi.advanceTimersByTime(61_000);
      });

      act(() => {
        result.current.recordAuthFailure(); // 1 (window reset)
      });

      expect(onEvent).not.toHaveBeenCalled();
    });

    it('resets counter after emitting to avoid duplicate alerts', () => {
      const onEvent = vi.fn();
      const { result } = renderHook(() => useSecurityMonitor({ onEvent }));

      act(() => {
        for (let i = 0; i < 5; i++) {
          result.current.recordAuthFailure();
        }
      });

      // Should only have emitted once (on the 4th call, then reset)
      expect(onEvent).toHaveBeenCalledTimes(1);

      // Additional single failure should not trigger again
      act(() => {
        result.current.recordAuthFailure();
      });

      expect(onEvent).toHaveBeenCalledTimes(1);
    });

    it('does not track when authMonitoring is disabled', () => {
      const onEvent = vi.fn();
      const { result } = renderHook(() =>
        useSecurityMonitor({ onEvent, authMonitoring: false }),
      );

      act(() => {
        for (let i = 0; i < 10; i++) {
          result.current.recordAuthFailure();
        }
      });

      expect(onEvent).not.toHaveBeenCalled();
    });
  });

  // --- API recon detection ---

  describe('API recon detection', () => {
    it('does not emit for 20 or fewer unique endpoints in 30s', () => {
      const onEvent = vi.fn();
      const { result } = renderHook(() => useSecurityMonitor({ onEvent }));

      act(() => {
        for (let i = 0; i < 20; i++) {
          result.current.recordApiCall(`/api/endpoint-${i}`);
        }
      });

      expect(onEvent).not.toHaveBeenCalled();
    });

    it('emits recon_behavior after >20 unique endpoints in 30s', () => {
      const onEvent = vi.fn();
      const { result } = renderHook(() => useSecurityMonitor({ onEvent }));

      act(() => {
        for (let i = 0; i < 21; i++) {
          result.current.recordApiCall(`/api/endpoint-${i}`);
        }
      });

      expect(onEvent).toHaveBeenCalledTimes(1);
      expect(onEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'recon_behavior',
          details: expect.objectContaining({ uniqueEndpoints: 21 }),
        }),
      );
    });

    it('does not count duplicate endpoints toward threshold', () => {
      const onEvent = vi.fn();
      const { result } = renderHook(() => useSecurityMonitor({ onEvent }));

      act(() => {
        // Hit 5 unique endpoints many times
        for (let i = 0; i < 100; i++) {
          result.current.recordApiCall(`/api/endpoint-${i % 5}`);
        }
      });

      expect(onEvent).not.toHaveBeenCalled();
    });

    it('resets window after 30 seconds', () => {
      const onEvent = vi.fn();
      const { result } = renderHook(() => useSecurityMonitor({ onEvent }));

      act(() => {
        for (let i = 0; i < 15; i++) {
          result.current.recordApiCall(`/api/endpoint-${i}`);
        }
      });

      // Advance past the 30s window
      act(() => {
        vi.advanceTimersByTime(31_000);
      });

      act(() => {
        for (let i = 0; i < 15; i++) {
          result.current.recordApiCall(`/api/other-${i}`);
        }
      });

      // Neither batch exceeded 20
      expect(onEvent).not.toHaveBeenCalled();
    });

    it('does not track when apiMonitoring is disabled', () => {
      const onEvent = vi.fn();
      const { result } = renderHook(() =>
        useSecurityMonitor({ onEvent, apiMonitoring: false }),
      );

      act(() => {
        for (let i = 0; i < 30; i++) {
          result.current.recordApiCall(`/api/endpoint-${i}`);
        }
      });

      expect(onEvent).not.toHaveBeenCalled();
    });
  });

  // --- DOM injection detection ---

  describe('DOM injection detection', () => {
    it('detects injected script elements', async () => {
      // happy-dom doesn't reliably fire MutationObserver for `<script>`
      // insertions when fake timers are running, so use real timers and
      // a real `waitFor` for this specific test.
      vi.useRealTimers();
      const onEvent = vi.fn();
      renderHook(() => useSecurityMonitor({ onEvent }));

      const script = document.createElement('script');
      script.textContent = 'alert("xss")';

      act(() => {
        document.body.appendChild(script);
      });

      await waitFor(() => {
        expect(onEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'dom_injection_attempt',
            details: expect.objectContaining({ isScript: true }),
          }),
        );
      });

      document.body.removeChild(script);
    });

    it('detects elements with inline event handlers', async () => {
      // Same MutationObserver-flush issue as the previous test —
      // happy-dom's observer doesn't reliably fire under fake timers.
      vi.useRealTimers();
      const onEvent = vi.fn();
      renderHook(() => useSecurityMonitor({ onEvent }));

      const div = document.createElement('div');
      div.setAttribute('onclick', 'alert("xss")');

      act(() => {
        document.body.appendChild(div);
      });

      await waitFor(() => {
        expect(onEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'dom_injection_attempt',
            details: expect.objectContaining({ hasInlineHandler: true }),
          }),
        );
      });

      document.body.removeChild(div);
    });

    it('ignores normal DOM additions', async () => {
      const onEvent = vi.fn();
      renderHook(() => useSecurityMonitor({ onEvent }));

      const div = document.createElement('div');
      div.textContent = 'Safe content';

      act(() => {
        document.body.appendChild(div);
      });

      await vi.advanceTimersByTimeAsync(0);

      expect(onEvent).not.toHaveBeenCalled();

      document.body.removeChild(div);
    });

    it('does not observe when domMonitoring is disabled', async () => {
      const onEvent = vi.fn();
      renderHook(() =>
        useSecurityMonitor({ onEvent, domMonitoring: false }),
      );

      const script = document.createElement('script');

      act(() => {
        document.body.appendChild(script);
      });

      await vi.advanceTimersByTimeAsync(0);

      expect(onEvent).not.toHaveBeenCalled();

      document.body.removeChild(script);
    });
  });

  // --- Event batching and flushing ---

  describe('event batching', () => {
    it('queues events via logSecurityEvent', () => {
      const event: SecurityEvent = {
        type: 'devtools_open',
        timestamp: Date.now(),
        details: {},
      };

      logSecurityEvent(event);

      // The event is queued — not sent immediately.
      // We verify it is flushed on interval below.
    });

    it('never writes to the audit trail from the browser', async () => {
      // This test used to assert the opposite - that events were flushed into
      // audit_logs on an interval. That write never landed (supabase-js returns
      // its errors, and the surrounding catch could not see them), and as of
      // migration 20260827080000 the audit trail refuses client writes
      // outright, because it carried two permissive PUBLIC INSERT policies and
      // anyone could forge entries. So the assertion is inverted deliberately:
      // a client-side insert here is the hole US-306 closed (US-299).
      renderHook(() => useSecurityMonitor());
      vi.mocked(supabase.from).mockClear();

      act(() => {
        logSecurityEvent({
          type: 'recon_behavior',
          timestamp: Date.now(),
          details: { uniqueEndpoints: 25 },
        });
      });

      await act(async () => {
        vi.advanceTimersByTime(60_000);
      });

      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('keeps the event, so a real sink can be wired to it later', () => {
      const before = getQueuedSecurityEvents().length;
      act(() => {
        logSecurityEvent({
          type: 'dom_injection_attempt',
          timestamp: Date.now(),
          details: { selector: 'script' },
        });
      });
      expect(getQueuedSecurityEvents().length).toBe(before + 1);
    });

    it('bounds the queue, since nothing drains it', () => {
      act(() => {
        for (let i = 0; i < 260; i += 1) {
          logSecurityEvent({ type: 'devtools_open', timestamp: i, details: {} });
        }
      });
      // An unbounded array fed by devtools detection is a slow leak on a tab
      // left open all day.
      expect(getQueuedSecurityEvents().length).toBeLessThanOrEqual(200);
    });

    it('does not write on beforeunload either', async () => {
      // Same inversion as above: this asserted a flush to audit_logs on unload.
      // There is no flush, because there is no sink (US-299).
      renderHook(() => useSecurityMonitor());
      vi.mocked(supabase.from).mockClear();

      act(() => {
        logSecurityEvent({
          type: 'brute_force_attempt',
          timestamp: Date.now(),
          details: { attempts: 5 },
        });
      });

      act(() => {
        window.dispatchEvent(new Event('beforeunload'));
      });

      await act(async () => {
        vi.advanceTimersByTime(5);
      });

      expect(supabase.from).not.toHaveBeenCalled();
    });
  });

  // --- Options ---

  describe('options', () => {
    it('calls onEvent callback when events are detected', () => {
      const onEvent = vi.fn();
      const { result } = renderHook(() => useSecurityMonitor({ onEvent }));

      act(() => {
        for (let i = 0; i < 4; i++) {
          result.current.recordAuthFailure();
        }
      });

      expect(onEvent).toHaveBeenCalledTimes(1);
      expect(onEvent.mock.calls[0][0].type).toBe('brute_force_attempt');
    });

    it('exposes logSecurityEvent method on the hook return', () => {
      const onEvent = vi.fn();
      const { result } = renderHook(() => useSecurityMonitor({ onEvent }));

      act(() => {
        result.current.logSecurityEvent({
          type: 'dom_injection_attempt',
          timestamp: Date.now(),
          details: { custom: true },
        });
      });

      expect(onEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'dom_injection_attempt',
          details: expect.objectContaining({ custom: true }),
        }),
      );
    });
  });
});
