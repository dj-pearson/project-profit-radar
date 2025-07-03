import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Setup from "./pages/Setup";
import Dashboard from "./pages/Dashboard";
import CreateProject from "./pages/CreateProject";
import ProjectDetail from "./pages/ProjectDetail";
import TeamManagement from "./pages/TeamManagement";
import TimeTracking from "./pages/TimeTracking";
import DocumentManagement from "./pages/DocumentManagement";
import FinancialDashboard from "./pages/FinancialDashboard";
import DailyReports from "./pages/DailyReports";
import ChangeOrders from "./pages/ChangeOrders";
import ClientPortal from "./pages/ClientPortal";
import Reports from "./pages/Reports";
import BlogManager from "./pages/BlogManager";
import Resources from "./pages/Resources";
import ROICalculator from "./pages/ROICalculator";
import Companies from "./pages/admin/Companies";
import Users from "./pages/admin/Users";
import Billing from "./pages/admin/Billing";
import Analytics from "./pages/admin/Analytics";
import AdminSettings from "./pages/admin/Settings";
import SEOManager from "./pages/admin/SEOManager";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/setup" element={<Setup />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/create-project" element={<CreateProject />} />
            <Route path="/project/:projectId" element={<ProjectDetail />} />
            <Route path="/team" element={<TeamManagement />} />
            <Route path="/time-tracking" element={<TimeTracking />} />
            <Route path="/documents" element={<DocumentManagement />} />
            <Route path="/project/:projectId/documents" element={<DocumentManagement />} />
            <Route path="/financial" element={<FinancialDashboard />} />
            <Route path="/daily-reports" element={<DailyReports />} />
            <Route path="/change-orders" element={<ChangeOrders />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/blog-manager" element={<BlogManager />} />
            <Route path="/admin/companies" element={<Companies />} />
            <Route path="/admin/users" element={<Users />} />
            <Route path="/admin/billing" element={<Billing />} />
            <Route path="/admin/analytics" element={<Analytics />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
            <Route path="/admin/seo" element={<SEOManager />} />
            <Route path="/resources" element={<Resources />} />
            <Route path="/roi-calculator" element={<ROICalculator />} />
            <Route path="/client-portal" element={<ClientPortal />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
