import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import './styles/accessibility.css';
import { logger } from "./lib/logger";
import { validateEnvironment } from "./lib/envValidation";
import { initSentry } from "./lib/sentry";

// Validate environment variables immediately (lightweight)
if (typeof window !== 'undefined') {
  validateEnvironment();
}

// Initialize Sentry immediately for error tracking
initSentry();

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

  // Start Web Vitals reporting
  import("./hooks/useWebVitals").then(({ reportWebVitals }) => {
    reportWebVitals((metric) => {
      if (import.meta.env.DEV) {
        logger.debug(`Web Vitals: ${metric.name}`, { value: metric.value });
      }
    });
  });

  // Register service worker (production only)
  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    import("./utils/serviceWorkerManager").then(({ registerServiceWorker }) => {
      registerServiceWorker({
        enabled: true,
        updateInterval: 60 * 60 * 1000,
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
