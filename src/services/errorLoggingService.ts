import { supabase } from '@/integrations/supabase/client';

// --- Types ---

interface ErrorLogUser {
  id: string;
  email?: string;
  role?: string;
  company_id?: string;
}

interface LogErrorOptions {
  error: Error | string;
  errorType?: 'runtime' | 'unhandled_rejection' | 'network' | 'render' | 'chunk_load' | 'custom';
  severity?: 'low' | 'medium' | 'high' | 'critical';
  componentStack?: string;
  component?: string;
  userAction?: string;
  metadata?: Record<string, unknown>;
}

interface LogNetworkErrorOptions {
  url: string;
  method?: string;
  status?: number;
  statusText?: string;
  error?: Error | string;
}

interface ErrorLogEntry {
  error_type: string;
  error_message: string;
  stack_trace: string | null;
  component_stack: string | null;
  component: string | null;
  severity: string;
  url: string | null;
  page_route: string | null;
  user_id: string | null;
  user_email: string | null;
  user_role: string | null;
  company_id: string | null;
  browser: string | null;
  os: string | null;
  device_type: string | null;
  screen_resolution: string | null;
  viewport_size: string | null;
  user_agent: string | null;
  browser_info: Record<string, unknown> | null;
  session_id: string | null;
  user_action: string | null;
  metadata: Record<string, unknown>;
  environment: string;
}

// --- State ---

let currentUser: ErrorLogUser | null = null;
const sessionId = typeof crypto !== 'undefined' && crypto.randomUUID
  ? crypto.randomUUID()
  : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const errorQueue: ErrorLogEntry[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

// Rate limiting: sliding window
const rateLimitWindow: number[] = [];
const RATE_LIMIT_MAX = 50;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_STACK_LENGTH = 10_000;
const BATCH_SIZE = 10;
const FLUSH_INTERVAL_MS = 5_000;

// --- User context ---

export function setErrorLoggingUser(user: ErrorLogUser | null): void {
  currentUser = user;
}

// --- Browser / device detection ---

function detectBrowser(): string | null {
  if (typeof navigator === 'undefined') return null;
  const ua = navigator.userAgent;
  if (ua.includes('Firefox/')) return 'Firefox';
  if (ua.includes('Edg/')) return 'Edge';
  if (ua.includes('Chrome/') && !ua.includes('Edg/')) return 'Chrome';
  if (ua.includes('Safari/') && !ua.includes('Chrome/')) return 'Safari';
  if (ua.includes('Opera/') || ua.includes('OPR/')) return 'Opera';
  return 'Other';
}

function detectOS(): string | null {
  if (typeof navigator === 'undefined') return null;
  const ua = navigator.userAgent;
  if (ua.includes('Windows')) return 'Windows';
  if (ua.includes('Mac OS')) return 'macOS';
  if (ua.includes('Linux') && !ua.includes('Android')) return 'Linux';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
  return 'Other';
}

function detectDeviceType(): string | null {
  if (typeof navigator === 'undefined') return null;
  const ua = navigator.userAgent;
  if (ua.includes('Mobi') || ua.includes('Android')) return 'mobile';
  if (ua.includes('Tablet') || ua.includes('iPad')) return 'tablet';
  return 'desktop';
}

function getScreenResolution(): string | null {
  if (typeof screen === 'undefined') return null;
  return `${screen.width}x${screen.height}`;
}

function getViewportSize(): string | null {
  if (typeof window === 'undefined') return null;
  return `${window.innerWidth}x${window.innerHeight}`;
}

function truncate(str: string | undefined | null, max: number): string | null {
  if (!str) return null;
  return str.length > max ? str.slice(0, max) + '...[truncated]' : str;
}

// --- Rate limiting ---

function isRateLimited(): boolean {
  const now = Date.now();
  // Remove entries outside the window
  while (rateLimitWindow.length > 0 && rateLimitWindow[0] < now - RATE_LIMIT_WINDOW_MS) {
    rateLimitWindow.shift();
  }
  if (rateLimitWindow.length >= RATE_LIMIT_MAX) {
    return true;
  }
  rateLimitWindow.push(now);
  return false;
}

// --- Queue & flush ---

function scheduleFlush(): void {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flushQueue();
  }, FLUSH_INTERVAL_MS);
}

async function flushQueue(): Promise<void> {
  if (errorQueue.length === 0) return;

  const batch = errorQueue.splice(0, errorQueue.length);

  try {
    const { error } = await supabase
      .from('error_logs')
      .insert(batch);

    if (error) {
      // Don't re-queue to avoid infinite loops - just log to console
      console.error('[ErrorLogging] Failed to flush error batch:', error.message);
    }
  } catch (e) {
    console.error('[ErrorLogging] Exception flushing error batch:', e);
  }
}

// --- Public API ---

export function logError(options: LogErrorOptions): void {
  if (isRateLimited()) return;

  const {
    error,
    errorType = 'runtime',
    severity = 'medium',
    componentStack,
    component,
    userAction,
    metadata = {},
  } = options;

  const errorMessage = error instanceof Error ? error.message : String(error);
  const stackTrace = error instanceof Error ? error.stack : null;

  const entry: ErrorLogEntry = {
    error_type: errorType,
    error_message: errorMessage,
    stack_trace: truncate(stackTrace, MAX_STACK_LENGTH),
    component_stack: truncate(componentStack, MAX_STACK_LENGTH),
    component: component || null,
    severity,
    url: typeof window !== 'undefined' ? window.location.href : null,
    page_route: typeof window !== 'undefined' ? window.location.pathname : null,
    user_id: currentUser?.id || null,
    user_email: currentUser?.email || null,
    user_role: currentUser?.role || null,
    company_id: currentUser?.company_id || null,
    browser: detectBrowser(),
    os: detectOS(),
    device_type: detectDeviceType(),
    screen_resolution: getScreenResolution(),
    viewport_size: getViewportSize(),
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    browser_info: {
      browser: detectBrowser(),
      os: detectOS(),
      deviceType: detectDeviceType(),
    },
    session_id: sessionId,
    user_action: userAction || null,
    metadata,
    environment: import.meta.env.PROD ? 'production' : 'development',
  };

  errorQueue.push(entry);

  // Flush immediately if batch size reached, otherwise schedule
  if (errorQueue.length >= BATCH_SIZE) {
    flushQueue();
  } else {
    scheduleFlush();
  }
}

export function logNetworkError(options: LogNetworkErrorOptions): void {
  const { url, method = 'GET', status, statusText, error } = options;

  const errorMessage = error
    ? (error instanceof Error ? error.message : String(error))
    : `Network error: ${method} ${url} → ${status} ${statusText || ''}`.trim();

  logError({
    error: error instanceof Error ? error : new Error(errorMessage),
    errorType: 'network',
    severity: status && status >= 500 ? 'high' : 'medium',
    metadata: {
      requestUrl: url,
      method,
      status,
      statusText,
    },
  });
}

// --- Flush on page unload ---

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (errorQueue.length > 0) {
      // Use sendBeacon for reliable delivery during unload
      try {
        const batch = errorQueue.splice(0, errorQueue.length);
        // sendBeacon is more reliable than fetch during unload
        // but we need to use the Supabase REST API directly
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
        const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
        if (supabaseUrl && supabaseKey) {
          navigator.sendBeacon(
            `${supabaseUrl}/rest/v1/error_logs`,
            new Blob([JSON.stringify(batch)], { type: 'application/json' })
          );
        }
      } catch {
        // Last resort - nothing we can do
      }
    }
  });
}
