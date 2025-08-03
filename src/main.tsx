import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './styles/accessibility.css'

createRoot(document.getElementById("root")!).render(<App />);
