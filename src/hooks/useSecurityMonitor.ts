/**
 * Security Monitoring Hook (US-016)
 *
 * Client-side anomaly detection for:
 * - Brute force auth attempts
 * - API reconnaissance behavior
 * - DOM injection attempts
 * - DevTools open detection
 *
 * Uses batched logging with requestIdleCallback for minimal performance impact.
 */
import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
  /** Batch flush interval in ms (default: 10000) */
  flushInterval?: number;
  /** Callback when a security event is detected */
  onEvent?: (event: SecurityEvent) => void;
}

// --- Constants ---

const AUTH_FAIL_THRESHOLD = 3;
const AUTH_FAIL_WINDOW_MS = 60_000;
const RECON_ENDPOINT_THRESHOLD = 20;
const RECON_WINDOW_MS = 30_000;
const DEFAULT_FLUSH_INTERVAL = 10_000;

// --- Idle callback shim ---

const scheduleIdle =
  typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function'
    ? window.requestIdleCallback
    : (cb: () => void) => setTimeout(cb, 1) as unknown as number;

const cancelIdle =
  typeof window !== 'undefined' && typeof window.cancelIdleCallback === 'function'
    ? window.cancelIdleCallback
    : (id: number) => clearTimeout(id);

// --- Shared event queue (singleton across hook instances) ---

let eventQueue: SecurityEvent[] = [];
let flushTimerId: ReturnType<typeof setInterval> | null = null;
let instanceCount = 0;

async function flushEvents(): Promise<void> {
  if (eventQueue.length === 0) return;

  const batch = eventQueue.splice(0, eventQueue.length);

  scheduleIdle(() => {
    sendBatchToServer(batch).catch(() => {
      // Re-queue on failure — drop if queue grows too large to avoid memory leak
      if (eventQueue.length < 200) {
        eventQueue.push(...batch);
      }
    });
  });
}

async function sendBatchToServer(batch: SecurityEvent[]): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const rows = batch.map((evt) => ({
      user_id: user.id,
      action_type: evt.type,
      resource_type: 'security',
      risk_level: getRiskLevel(evt.type),
      description: `Security event: ${evt.type}`,
      metadata: JSON.stringify(evt.details),
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      created_at: new Date(evt.timestamp).toISOString(),
    }));

    await supabase.from('audit_logs').insert(rows);
  } catch {
    // Silently fail — security logging must not break the app
  }
}

function getRiskLevel(type: SecurityEventType): string {
  switch (type) {
    case 'brute_force_attempt':
      return 'critical';
    case 'dom_injection_attempt':
      return 'critical';
    case 'recon_behavior':
      return 'high';
    case 'devtools_open':
      return 'medium';
    default:
      return 'medium';
  }
}

// --- Public logging function ---

export function logSecurityEvent(event: SecurityEvent): void {
  eventQueue.push(event);
}

// --- Hook ---

export function useSecurityMonitor(options: SecurityMonitorOptions = {}) {
  const {
    authMonitoring = true,
    apiMonitoring = true,
    domMonitoring = true,
    devtoolsMonitoring = true,
    flushInterval = DEFAULT_FLUSH_INTERVAL,
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

  // --- Batch flush lifecycle ---

  useEffect(() => {
    instanceCount++;

    if (flushTimerId === null) {
      flushTimerId = setInterval(flushEvents, flushInterval);
    }

    const handleUnload = () => {
      flushEvents();
    };

    window.addEventListener('beforeunload', handleUnload);

    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      instanceCount--;

      if (instanceCount <= 0) {
        if (flushTimerId !== null) {
          clearInterval(flushTimerId);
          flushTimerId = null;
        }
        flushEvents();
        instanceCount = 0;
      }
    };
  }, [flushInterval]);

  return {
    recordAuthFailure,
    recordApiCall,
    logSecurityEvent: emit,
  };
}
