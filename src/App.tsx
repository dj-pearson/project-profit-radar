import React from 'react';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { NotificationPermission } from "@/components/NotificationPermission";
import Index from "./pages/Index";
import APIMarketplace from "./pages/APIMarketplace";
import Collaboration from "./pages/Collaboration";
import MobileTesting from "./pages/MobileTesting";
import MobileDashboard from "./pages/MobileDashboard";
import Dashboard from "./pages/Dashboard";
import FieldManagement from "./pages/FieldManagement";
import WorkflowManagement from "./pages/WorkflowManagement";
import WorkflowTesting from "./pages/WorkflowTesting";
import Auth from "./pages/Auth";
import Resources from "./pages/Resources";
import Tools from "./pages/Tools";
import BlogPost from "./pages/BlogPost";
import ProjectsHub from "./pages/hubs/ProjectsHub";
import FinancialHub from "./pages/hubs/FinancialHub";
import PeopleHub from "./pages/hubs/PeopleHub";
import OperationsHub from "./pages/hubs/OperationsHub";
import AdminHub from "./pages/hubs/AdminHub";
import MyTasks from "./pages/MyTasks";
import { UserSettings } from "./pages/UserSettings";
import SubscriptionSettings from "./pages/SubscriptionSettings";

const App = () => {
  return (
    <AuthProvider>
      <ThemeProvider>
        <HelmetProvider>
          <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/marketplace" element={<APIMarketplace />} />
            <Route path="/collaboration" element={<Collaboration />} />
            <Route path="/mobile-testing" element={<MobileTesting />} />
            <Route path="/mobile-dashboard" element={<MobileDashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/my-tasks" element={<MyTasks />} />
            <Route path="/projects-hub" element={<ProjectsHub />} />
            <Route path="/financial-hub" element={<FinancialHub />} />
            <Route path="/people-hub" element={<PeopleHub />} />
            <Route path="/operations-hub" element={<OperationsHub />} />
            <Route path="/admin-hub" element={<AdminHub />} />
            <Route path="/field-management" element={<FieldManagement />} />
            <Route path="/user-settings" element={<UserSettings />} />
            <Route path="/subscription-settings" element={<SubscriptionSettings />} />
            <Route path="/workflow-management" element={<WorkflowManagement />} />
            <Route path="/workflow-testing" element={<WorkflowTesting />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/tools" element={<Tools />} />
            <Route path="/resources" element={<Resources />} />
            <Route path="/resources/:slug" element={<BlogPost />} />
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
    </AuthProvider>
  );
};

export default App;