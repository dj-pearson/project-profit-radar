import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './styles/accessibility.css'

// Service worker registration removed to prevent mixed cached bundles causing React duplication issues


createRoot(document.getElementById("root")!).render(<App />);
