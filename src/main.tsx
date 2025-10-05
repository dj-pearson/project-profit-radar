import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import './styles/accessibility.css';
import { reportWebVitals } from "./hooks/useWebVitals";

// Start Web Vitals reporting
if (typeof window !== 'undefined') {
  reportWebVitals((metric) => {
    if (import.meta.env.DEV) {
      console.log('[Web Vitals]', metric.name, metric.value);
    }
  });
}

createRoot(document.getElementById("root")!).render(<App />);
