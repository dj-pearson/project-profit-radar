import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import './styles/accessibility.css';
import { logger } from "./lib/logger";
import { validateEnvironment } from "./lib/envValidation";
import { initSentry } from "./lib/sentry";
import { logError } from "./services/errorLoggingService";
import { initDevicePerformance } from "./hooks/useDevicePerformance";

// Validate environment variables immediately (lightweight)
if (typeof window !== 'undefined') {
  validateEnvironment();
}

// Set the `low-gpu` class on <html> before the first paint so glass
// surfaces degrade gracefully on older iPhones / low-end Androids and
// on devices where the user has opted into Reduce Transparency.
initDevicePerformance();

// Initialize Sentry immediately for error tracking
initSentry();

// Global error handlers for error logging service
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    // Skip errors from browser extensions (no filename)
    if (!event.filename) return;
    logError({
      error: event.error instanceof Error ? event.error : new Error(event.message),
      errorType: 'runtime',
      severity: 'high',
      metadata: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason instanceof Error
      ? event.reason
      : new Error(String(event.reason));
    logError({
      error,
      errorType: 'unhandled_rejection',
      severity: 'high',
    });
  });
}

// Defer non-critical initializations until after first paint
const initDeferredServices = () => {

  // Initialize resource optimizations
  import("./utils/resourcePrioritization").then(({ initializeResourceOptimizations }) => {
    const pageType = window.location.pathname === '/' ? 'homepage' : 'dashboard';
    initializeResourceOptimizations(pageType);
  });

  // Initialize RUM tracking
  import("./utils/realUserMonitoring").then(({ initializeRUM }) => {
    initializeRUM();
  });

  // Start Web Vitals reporting (US-207)
  // Dev: log locally without spamming production analytics.
  // Prod: emit each metric to PostHog + Supabase for real-user monitoring.
  import("./hooks/useWebVitals").then(({ reportWebVitals }) => {
    reportWebVitals((metric) => {
      if (import.meta.env.DEV) {
        logger.debug(`Web Vitals: ${metric.name}`, { value: metric.value });
        return;
      }
      import("./lib/analytics")
        .then(({ trackWebVital }) => trackWebVital(metric))
        .catch(() => {
          /* never let perf telemetry break the app */
        });
    });
  });

  // Register service worker (production web only, not in Capacitor native)
  const isCapacitorNative = typeof window !== 'undefined' &&
    window.Capacitor?.isNativePlatform?.();
  if (import.meta.env.PROD && 'serviceWorker' in navigator && !isCapacitorNative) {
    import("./utils/serviceWorkerManager").then(({ registerServiceWorker }) => {
      registerServiceWorker({
        enabled: true,
        // US-220: check for a new SW every 15 min (was hourly) so a critical
        // fix reaches active sessions faster; the UpdatePrompt then lets the
        // user apply it immediately via skipWaiting.
        updateInterval: 15 * 60 * 1000,
      }).catch((error) => {
        logger.error('Service worker registration failed', error);
      });
    });
  }
};

// Defer initialization until after first paint
if (typeof window !== 'undefined') {
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(initDeferredServices, { timeout: 3000 });
  } else {
    // Fallback: defer until after first paint
    requestAnimationFrame(() => {
      setTimeout(initDeferredServices, 0);
    });
  }
}

// Wrap in StrictMode for development to catch potential issues
const rootElement = document.getElementById("root")!;
const app = import.meta.env.DEV ? (
  <StrictMode>
    <App />
  </StrictMode>
) : (
  <App />
);

createRoot(rootElement).render(app);
