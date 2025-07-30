import React from 'react';
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './styles/accessibility.css'

// Ensure React is properly available before rendering
if (typeof React !== 'object' || !React.useState) {
  console.error('React is not properly loaded');
  throw new Error('React is not properly loaded');
}

createRoot(document.getElementById("root")!).render(<App />);
