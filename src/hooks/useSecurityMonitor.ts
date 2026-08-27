/**
 * Security Monitoring Hook (US-016)
 *
 * Client-side anomaly detection for:
 * - Brute force auth attempts
 * - API reconnaissance behavior
 * - DOM injection attempts
 * - DevTools open detection
 *
 * Detection only. Events reach the `onEvent` callback and go nowhere else, and
 * the hook is mounted nowhere in the app today.
 *
 * IT DOES NOT PERSIST ANYTHING, and it never did (US-299/US-306). It used to
 * batch events and insert them into `audit_logs` straight from the browser,
 * wrapped in `try { … } catch { }` with the comment "Silently fail - security
 * logging must not break the app". Two things were wrong with that:
 *
 *   1. supabase-js RETURNS its errors rather than throwing, so the catch never
 *      saw a rejected insert. The failure was invisible by construction.
 *   2. The rows it built carried no `company_id`, which is its own tell that
 *      nothing ever exercised the path.
 *
 * And as of migration 20260827080000 the audit trail refuses client writes
 * outright - audit_logs had two permissive PUBLIC INSERT policies, so any
 * browser session, signed in or not, could forge entries. A trail the audited
 * actor can write is not a trail.
 *
 * So the sink is gone rather than left looking functional. If these events are
 * worth collecting, they go through an edge function with the service role, the
 * way every other audit write in this codebase does (see
 * supabase/functions/_shared/audit-log.ts). Wiring `onEvent` to a fetch of such
 * a function is the whole remaining job. Do NOT restore a direct client insert:
 * that is the hole US-306 closed.
 */
import { useEffect, useRef, useCallback } from 'react';

// --- Types ---

export type SecurityEventType =
  | 'brute_force_attempt'
  | 'recon_behavior'
  | 'dom_injection_attempt'
  | 'devtools_open';

export interface SecurityEvent {
  type: SecurityEventType;
  timestamp: number;
  details: Record<string, unknown>;
}

interface SecurityMonitorOptions {
  /** Enable brute force detection (default: true) */
  authMonitoring?: boolean;
  /** Enable API recon detection (default: true) */
  apiMonitoring?: boolean;
  /** Enable DOM injection detection (default: true) */
  domMonitoring?: boolean;
  /** Enable devtools detection (default: true) */
  devtoolsMonitoring?: boolean;
  /** Callback when a security event is detected */
  onEvent?: (event: SecurityEvent) => void;
}

// --- Constants ---

const AUTH_FAIL_THRESHOLD = 3;
const AUTH_FAIL_WINDOW_MS = 60_000;
const RECON_ENDPOINT_THRESHOLD = 20;
const RECON_WINDOW_MS = 30_000;

// --- Shared event queue (singleton across hook instances) ---
//
// Bounded, because nothing drains it any more: logSecurityEvent() below is a
// public export that appends, and with the audit_logs sink removed the queue is
// only a short in-memory record for whoever wires a real one up. An unbounded
// array fed by devtools-open detection is a slow leak on a tab left open all
// day. The idle-callback shim that used to schedule the flush went with it.
const MAX_QUEUED_EVENTS = 200;
const eventQueue: SecurityEvent[] = [];

// --- Public logging function ---

export function logSecurityEvent(event: SecurityEvent): void {
  eventQueue.push(event);
  if (eventQueue.length > MAX_QUEUED_EVENTS) {
    eventQueue.splice(0, eventQueue.length - MAX_QUEUED_EVENTS);
  }
}

/** The events recorded so far this session. Detection only - see the file header. */
export function getQueuedSecurityEvents(): readonly SecurityEvent[] {
  return eventQueue;
}

// --- Hook ---

export function useSecurityMonitor(options: SecurityMonitorOptions = {}) {
  const {
    authMonitoring = true,
    apiMonitoring = true,
    domMonitoring = true,
    devtoolsMonitoring = true,
    onEvent,
  } = options;

  const failedAuthTimestamps = useRef<number[]>([]);
  const apiEndpointHits = useRef<Map<string, number>>(new Map());
  const apiWindowStart = useRef<number>(Date.now());
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const emit = useCallback((event: SecurityEvent) => {
    logSecurityEvent(event);
    onEventRef.current?.(event);
  }, []);

  // --- Auth failure tracking ---

  const recordAuthFailure = useCallback(() => {
    if (!authMonitoring) return;

    const now = Date.now();
    const timestamps = failedAuthTimestamps.current;
    timestamps.push(now);

    // Prune entries outside the window
    const cutoff = now - AUTH_FAIL_WINDOW_MS;
    while (timestamps.length > 0 && timestamps[0] < cutoff) {
      timestamps.shift();
    }

    if (timestamps.length > AUTH_FAIL_THRESHOLD) {
      emit({
        type: 'brute_force_attempt',
        timestamp: now,
        details: {
          attempts: timestamps.length,
          windowMs: AUTH_FAIL_WINDOW_MS,
        },
      });
      // Reset after emitting to avoid duplicate events per attempt
      failedAuthTimestamps.current = [];
    }
  }, [authMonitoring, emit]);

  // --- API recon tracking ---

  const recordApiCall = useCallback(
    (endpoint: string) => {
      if (!apiMonitoring) return;

      const now = Date.now();
      const elapsed = now - apiWindowStart.current;

      if (elapsed > RECON_WINDOW_MS) {
        // Reset window
        apiEndpointHits.current.clear();
        apiWindowStart.current = now;
      }

      apiEndpointHits.current.set(endpoint, (apiEndpointHits.current.get(endpoint) || 0) + 1);

      if (apiEndpointHits.current.size > RECON_ENDPOINT_THRESHOLD) {
        emit({
          type: 'recon_behavior',
          timestamp: now,
          details: {
            uniqueEndpoints: apiEndpointHits.current.size,
            windowMs: RECON_WINDOW_MS,
          },
        });
        // Reset to avoid repeated alerts
        apiEndpointHits.current.clear();
        apiWindowStart.current = now;
      }
    },
    [apiMonitoring, emit],
  );

  // --- DOM injection detection via MutationObserver ---

  useEffect(() => {
    if (!domMonitoring) return;
    if (typeof window === 'undefined' || typeof MutationObserver === 'undefined') return;

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (let i = 0; i < mutation.addedNodes.length; i++) {
          const node = mutation.addedNodes[i];
          if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as Element;
            const isScript = el.tagName === 'SCRIPT';
            const hasInlineHandler = Array.from(el.attributes || []).some(
              (attr) => attr.name.startsWith('on'),
            );

            if (isScript || hasInlineHandler) {
              emit({
                type: 'dom_injection_attempt',
                timestamp: Date.now(),
                details: {
                  tagName: el.tagName,
                  isScript,
                  hasInlineHandler,
                  outerHTML: el.outerHTML.slice(0, 200),
                },
              });
            }
          }
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
    };
  }, [domMonitoring, emit]);

  // --- DevTools detection ---

  useEffect(() => {
    if (!devtoolsMonitoring) return;
    if (typeof window === 'undefined') return;

    let devtoolsOpen = false;

    const checkDevTools = () => {
      const widthThreshold = window.outerWidth - window.innerWidth > 160;
      const heightThreshold = window.outerHeight - window.innerHeight > 160;
      const isOpen = widthThreshold || heightThreshold;

      if (isOpen && !devtoolsOpen) {
        devtoolsOpen = true;
        emit({
          type: 'devtools_open',
          timestamp: Date.now(),
          details: {
            widthDiff: window.outerWidth - window.innerWidth,
            heightDiff: window.outerHeight - window.innerHeight,
          },
        });
      } else if (!isOpen) {
        devtoolsOpen = false;
      }
    };

    const intervalId = setInterval(checkDevTools, 2000);

    return () => {
      clearInterval(intervalId);
    };
  }, [devtoolsMonitoring, emit]);


  return {
    recordAuthFailure,
    recordApiCall,
    logSecurityEvent: emit,
  };
}
