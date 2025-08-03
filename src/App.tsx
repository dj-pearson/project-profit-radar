import React from 'react';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Index from "./pages/Index";

const App = () => {
  return (
    <ThemeProvider>
      <HelmetProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="*" element={
              <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
                <div className="text-center">
                  <h1 className="text-4xl font-bold mb-4">BuildDesk</h1>
                  <p className="text-muted-foreground">Page not found</p>
                </div>
              </div>
            } />
          </Routes>
        </BrowserRouter>
      </HelmetProvider>
    </ThemeProvider>
  );
};

export default App;