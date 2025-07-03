import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { RouteGuard } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Setup from "./pages/Setup";
import Dashboard from "./pages/Dashboard";
import CreateProject from "./pages/CreateProject";
import ProjectDetail from "./pages/ProjectDetail";
import TeamManagement from "./pages/TeamManagement";
import TimeTracking from "./pages/TimeTracking";
import JobCosting from "./pages/JobCosting";
import DocumentManagement from "./pages/DocumentManagement";
import FinancialDashboard from "./pages/FinancialDashboard";
import DailyReports from "./pages/DailyReports";
import ChangeOrders from "./pages/ChangeOrders";
import ClientPortal from "./pages/ClientPortal";
import Reports from "./pages/Reports";
import BlogManager from "./pages/BlogManager";
import Resources from "./pages/Resources";
import ROICalculator from "./pages/ROICalculator";
import SubscriptionSettings from "./pages/SubscriptionSettings";
import Companies from "./pages/admin/Companies";
import Users from "./pages/admin/Users";
import Billing from "./pages/admin/Billing";
import Analytics from "./pages/admin/Analytics";
import AdminSettings from "./pages/admin/Settings";
import SEOManager from "./pages/admin/SEOManager";
import SecurityMonitoring from "./pages/SecurityMonitoring";
import Safety from "./pages/Safety";
import ComplianceAudit from "./pages/ComplianceAudit";
import GDPRCompliance from "./pages/GDPRCompliance";
import RateLimitingDashboard from "./pages/RateLimitingDashboard";
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
            <Route path="/dashboard" element={<RouteGuard routePath="/dashboard"><Dashboard /></RouteGuard>} />
            <Route path="/create-project" element={<RouteGuard routePath="/create-project"><CreateProject /></RouteGuard>} />
            <Route path="/project/:projectId" element={<RouteGuard routePath="/dashboard"><ProjectDetail /></RouteGuard>} />
            <Route path="/team" element={<RouteGuard routePath="/team"><TeamManagement /></RouteGuard>} />
            <Route path="/time-tracking" element={<RouteGuard routePath="/time-tracking"><TimeTracking /></RouteGuard>} />
            <Route path="/job-costing" element={<RouteGuard routePath="/job-costing"><JobCosting /></RouteGuard>} />
            <Route path="/documents" element={<RouteGuard routePath="/documents"><DocumentManagement /></RouteGuard>} />
            <Route path="/project/:projectId/documents" element={<RouteGuard routePath="/documents"><DocumentManagement /></RouteGuard>} />
            <Route path="/financial" element={<RouteGuard routePath="/financial"><FinancialDashboard /></RouteGuard>} />
            <Route path="/daily-reports" element={<RouteGuard routePath="/daily-reports"><DailyReports /></RouteGuard>} />
            <Route path="/change-orders" element={<RouteGuard routePath="/change-orders"><ChangeOrders /></RouteGuard>} />
            <Route path="/reports" element={<RouteGuard routePath="/reports"><Reports /></RouteGuard>} />
            <Route path="/blog-manager" element={<RouteGuard routePath="/blog-manager"><BlogManager /></RouteGuard>} />
            <Route path="/admin/companies" element={<RouteGuard routePath="/admin/companies"><Companies /></RouteGuard>} />
            <Route path="/admin/users" element={<RouteGuard routePath="/admin/users"><Users /></RouteGuard>} />
            <Route path="/admin/billing" element={<RouteGuard routePath="/admin/billing"><Billing /></RouteGuard>} />
            <Route path="/admin/analytics" element={<RouteGuard routePath="/admin/analytics"><Analytics /></RouteGuard>} />
            <Route path="/admin/settings" element={<RouteGuard routePath="/admin/settings"><AdminSettings /></RouteGuard>} />
            <Route path="/admin/seo" element={<RouteGuard routePath="/admin/seo"><SEOManager /></RouteGuard>} />
            <Route path="/resources" element={<Resources />} />
            <Route path="/roi-calculator" element={<ROICalculator />} />
            <Route path="/subscription" element={<SubscriptionSettings />} />
            <Route path="/client-portal" element={<ClientPortal />} />
            <Route path="/security-monitoring" element={<RouteGuard routePath="/security-monitoring"><SecurityMonitoring /></RouteGuard>} />
            <Route path="/safety" element={<RouteGuard routePath="/safety"><Safety /></RouteGuard>} />
            <Route path="/compliance-audit" element={<RouteGuard routePath="/compliance-audit"><ComplianceAudit /></RouteGuard>} />
            <Route path="/gdpr-compliance" element={<RouteGuard routePath="/gdpr-compliance"><GDPRCompliance /></RouteGuard>} />
            <Route path="/rate-limiting" element={<RouteGuard routePath="/rate-limiting"><RateLimitingDashboard /></RouteGuard>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
