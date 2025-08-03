import React from 'react';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="*" element={
          <div className="min-h-screen bg-white text-black flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-4xl font-bold mb-4">BuildDesk</h1>
              <p className="text-gray-600">Page not found</p>
            </div>
          </div>
        } />
      </Routes>
    </BrowserRouter>
  );
};

export default App;