/**
 * Sentry, loaded on demand (US-388).
 *
 * @sentry/react used to be a static import here, and main.tsx imports this
 * file, so about 95 KB of SDK (plus replay and tracing) sat in the entry chunk
 * that every marketing page parses before it can paint. Nothing below imports
 * the SDK statically any more: initSentry() fetches it once the browser is
 * idle, and every other helper waits for that init to finish.
 *
 * With no DSN, or before init, the helpers do nothing, which is what the
 * static import did too (no client to send to).
 */
type SentryModule = typeof import('@sentry/react');

let resolveReady: (sdk: SentryModule) => void = () => {};
const ready = new Promise<SentryModule>((resolve) => {
  resolveReady = resolve;
});

/** Run `fn` against the SDK once initSentry() has set it up. */
const withSentry = (fn: (Sentry: SentryModule) => void) => {
  if (!import.meta.env.VITE_SENTRY_DSN) return;
  ready.then(fn).catch(() => {
    /* error reporting must never throw into the app */
  });
};

/** Defer work until the page is idle, so it never competes with first paint. */
const whenIdle = (fn: () => void) => {
  if (typeof window === 'undefined') {
    fn();
    return;
  }
  const ric = (window as Window & {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  }).requestIdleCallback;
  if (ric) ric(fn, { timeout: 4000 });
  else setTimeout(fn, 2000);
};

/**
 * Initialize Sentry for error tracking and performance monitoring
 *
 * To enable Sentry, set VITE_SENTRY_DSN in your environment variables.
 * Get your DSN from https://sentry.io/
 */
export const initSentry = () => {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  const environment = import.meta.env.MODE;
  // Release tag so errors are attributable to a specific deploy and uploaded
  // sourcemaps can de-minify stack traces. Falls back to 'unknown' if unset.
  const release = import.meta.env.VITE_APP_VERSION || undefined;

  // Only initialize if DSN is provided
  if (!dsn) {
    if (import.meta.env.PROD) {
      // Use console.warn directly (not the logger, which suppresses warn in
      // production) so a missing DSN is visible in deploy/runtime logs.
      // eslint-disable-next-line no-console
      console.warn(
        '[Sentry] VITE_SENTRY_DSN not set — error tracking is disabled in production.'
      );
    }
    return;
  }

  whenIdle(() => {
    import('@sentry/react')
      .then((Sentry) => {
        Sentry.init({
          dsn,
          environment,
          release,

          // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring.
          // We recommend adjusting this value in production
          tracesSampleRate: environment === 'production' ? 0.1 : 1.0,

          // Capture Replay for 10% of all sessions,
          // plus 100% of sessions with an error
          replaysSessionSampleRate: environment === 'production' ? 0.1 : 1.0,
          replaysOnErrorSampleRate: 1.0,

          integrations: [
            // Enable performance monitoring
            Sentry.browserTracingIntegration(),

            // Enable session replay
            Sentry.replayIntegration({
              // Mask all text content to protect user privacy
              maskAllText: true,
              // Block all media (images, video, audio) to reduce bandwidth
              blockAllMedia: true,
            }),
          ],

          // Filter out sensitive information before sending to Sentry
          beforeSend(event, hint) {
            // Remove sensitive data from breadcrumbs
            if (event.breadcrumbs) {
              event.breadcrumbs = event.breadcrumbs.map(breadcrumb => {
                if (breadcrumb.data) {
                  // Remove password fields
                  if (breadcrumb.data.password) {
                    breadcrumb.data.password = '[Filtered]';
                  }
                  // Remove token fields
                  if (breadcrumb.data.token) {
                    breadcrumb.data.token = '[Filtered]';
                  }
                  // Remove email from sensitive contexts
                  if (breadcrumb.category === 'auth' && breadcrumb.data.email) {
                    breadcrumb.data.email = '[Filtered]';
                  }
                }
                return breadcrumb;
              });
            }

            // Filter sensitive data from error context
            if (event.contexts) {
              // Remove sensitive user data
              if (event.contexts.user) {
                const { email, ...safeUser } = event.contexts.user;
                event.contexts.user = safeUser;
              }
            }

            return event;
          },

          // Ignore certain errors that are not actionable
          ignoreErrors: [
            // Browser extensions
            'top.GLOBALS',
            // Random plugins/extensions
            'originalCreateNotification',
            'canvas.contentDocument',
            'MyApp_RemoveAllHighlights',
            // Network errors that we can't control
            'NetworkError',
            'Network request failed',
            // ResizeObserver loop errors (benign)
            'ResizeObserver loop limit exceeded',
            'ResizeObserver loop completed with undelivered notifications',
          ],

          // Only track errors from our domain. NOTE: the production domain is
          // brikly.net (not .com); the previous .com entries meant Sentry silently
          // dropped every real production event.
          allowUrls: [
            /https?:\/\/(www\.)?brikly\.net/,
            /https?:\/\/[a-z0-9-]+\.pages\.dev/,
            /localhost/,
          ],
        });
        resolveReady(Sentry);
      })
      .catch(() => {
        /* no error tracking this session; the app carries on */
      });
  });
};

/**
 * Set user context for Sentry
 * Call this after user authentication
 */
export const setSentryUser = (user: {
  id: string;
  email?: string;
  role?: string;
  company_id?: string;
}) => withSentry((Sentry) => {
  Sentry.setUser({
    id: user.id,
    // Only send email in development
    ...(import.meta.env.MODE === 'development' && user.email ? { email: user.email } : {}),
    role: user.role,
    company_id: user.company_id,
  });
});

/**
 * Clear user context on logout
 */
export const clearSentryUser = () => withSentry((Sentry) => {
  Sentry.setUser(null);
});

/**
 * Manually capture an exception
 */
export const captureException = (error: Error, context?: Record<string, any>) =>
  withSentry((Sentry) => {
    if (context) {
      Sentry.setContext('custom', context);
    }
    Sentry.captureException(error);
  });

/**
 * Manually capture a message
 */
export const captureMessage = (
  message: string,
  level: 'fatal' | 'error' | 'warning' | 'info' | 'debug' = 'info'
) => withSentry((Sentry) => {
  Sentry.captureMessage(message, level);
});

/**
 * Add breadcrumb for tracking user actions
 */
export const addBreadcrumb = (
  category: string,
  message: string,
  data?: Record<string, any>
) => withSentry((Sentry) => {
  Sentry.addBreadcrumb({
    category,
    message,
    data,
    level: 'info',
  });
});

/**
 * Start a performance span (replaces deprecated startTransaction). The SDK
 * loads on demand, so the span is not handed back to the caller.
 */
export const startTransaction = (name: string, op: string) =>
  withSentry((Sentry) => {
    Sentry.startSpan({ name, op }, () => undefined);
  });
