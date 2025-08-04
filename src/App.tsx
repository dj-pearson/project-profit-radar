import React from 'react';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { NotificationPermission } from "@/components/NotificationPermission";
import Index from "./pages/Index";
import APIMarketplace from "./pages/APIMarketplace";
import Collaboration from "./pages/Collaboration";
import MobileTesting from "./pages/MobileTesting";
import Dashboard from "./pages/Dashboard";

const App = () => {
  return (
    <ThemeProvider>
      <HelmetProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/marketplace" element={<APIMarketplace />} />
            <Route path="/collaboration" element={<Collaboration />} />
            <Route path="/mobile-testing" element={<MobileTesting />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="*" element={
              <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
                <div className="text-center">
                  <h1 className="text-4xl font-bold mb-4">BuildDesk</h1>
                  <p className="text-muted-foreground">Page not found</p>
                </div>
              </div>
            } />
          </Routes>
          
          {/* PWA Components */}
          <PWAInstallPrompt />
          <OfflineIndicator />
          <NotificationPermission />
        </BrowserRouter>
      </HelmetProvider>
    </ThemeProvider>
  );
};

export default App;