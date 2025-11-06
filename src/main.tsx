import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import './styles/accessibility.css';
import { reportWebVitals } from "./hooks/useWebVitals";
import { initializeResourceOptimizations } from "./utils/resourcePrioritization";
import { initializeRUM } from "./utils/realUserMonitoring";
import { registerServiceWorker } from "./utils/serviceWorkerManager";
import { logger } from "./lib/logger";

// Initialize resource optimizations early
if (typeof window !== 'undefined') {
  // Determine page type from URL
  const pageType = window.location.pathname === '/' ? 'homepage' : 'dashboard';
  initializeResourceOptimizations(pageType);
}

// Initialize RUM tracking
if (typeof window !== 'undefined') {
  initializeRUM();
}

// Register service worker (production only)
if (import.meta.env.PROD && typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  registerServiceWorker({
    enabled: true,
    updateInterval: 60 * 60 * 1000, // Check for updates every hour
  }).catch((error) => {
    logger.error('Service worker registration failed', error);
  });
}

// Start Web Vitals reporting with RUM context
if (typeof window !== 'undefined') {
  reportWebVitals((metric) => {
    if (import.meta.env.DEV) {
      logger.debug(`Web Vitals: ${metric.name}`, { value: metric.value });
    }
  });
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
