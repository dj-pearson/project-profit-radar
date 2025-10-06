import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import './styles/accessibility.css';
import { reportWebVitals } from "./hooks/useWebVitals";
import { initializeResourceOptimizations } from "./utils/resourcePrioritization";
import { initializeRUM } from "./utils/realUserMonitoring";
import { registerServiceWorker } from "./utils/serviceWorkerManager";

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
if (import.meta.env.PROD && typeof window !== 'undefined') {
  registerServiceWorker({
    enabled: true,
    updateInterval: 60 * 60 * 1000, // Check for updates every hour
  });
}

// Start Web Vitals reporting with RUM context
if (typeof window !== 'undefined') {
  reportWebVitals((metric) => {
    if (import.meta.env.DEV) {
      console.log('[Web Vitals]', metric.name, metric.value);
    }
  });
}

createRoot(document.getElementById("root")!).render(<App />);
