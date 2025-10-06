import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import './styles/accessibility.css';
import { reportWebVitals } from "./hooks/useWebVitals";
import { initializeResourceOptimizations } from "./utils/resourcePrioritization";

// Initialize resource optimizations early
if (typeof window !== 'undefined') {
  // Determine page type from URL
  const pageType = window.location.pathname === '/' ? 'homepage' : 'dashboard';
  initializeResourceOptimizations(pageType);
}

// Start Web Vitals reporting
if (typeof window !== 'undefined') {
  reportWebVitals((metric) => {
    if (import.meta.env.DEV) {
      console.log('[Web Vitals]', metric.name, metric.value);
    }
  });
}

createRoot(document.getElementById("root")!).render(<App />);
