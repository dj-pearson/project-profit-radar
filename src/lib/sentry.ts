import * as Sentry from '@sentry/react';

/**
 * Initialize Sentry for error tracking and performance monitoring
 *
 * To enable Sentry, set VITE_SENTRY_DSN in your environment variables.
 * Get your DSN from https://sentry.io/
 */
export const initSentry = () => {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  const environment = import.meta.env.MODE;

  // Only initialize if DSN is provided
  if (!dsn) {
    return;
  }

  Sentry.init({
    dsn,
    environment,

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

    // Only track errors from our domain
    allowUrls: [
      /https?:\/\/(www\.)?builddesk\.com/,
      /https?:\/\/(www\.)?build-desk\.com/,
      /localhost/,
    ],
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
}) => {
  Sentry.setUser({
    id: user.id,
    // Only send email in development
    ...(import.meta.env.MODE === 'development' && user.email ? { email: user.email } : {}),
    role: user.role,
    company_id: user.company_id,
  });
};

/**
 * Clear user context on logout
 */
export const clearSentryUser = () => {
  Sentry.setUser(null);
};

/**
 * Manually capture an exception
 */
export const captureException = (error: Error, context?: Record<string, any>) => {
  if (context) {
    Sentry.setContext('custom', context);
  }
  Sentry.captureException(error);
};

/**
 * Manually capture a message
 */
export const captureMessage = (
  message: string,
  level: 'fatal' | 'error' | 'warning' | 'info' | 'debug' = 'info'
) => {
  Sentry.captureMessage(message, level);
};

/**
 * Add breadcrumb for tracking user actions
 */
export const addBreadcrumb = (
  category: string,
  message: string,
  data?: Record<string, any>
) => {
  Sentry.addBreadcrumb({
    category,
    message,
    data,
    level: 'info',
  });
};

/**
 * Start a performance span (replaces deprecated startTransaction)
 */
export const startTransaction = (name: string, op: string) => {
  return Sentry.startSpan({
    name,
    op,
  }, (span) => span);
};
