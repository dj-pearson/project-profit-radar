import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { usePWA } from "@/hooks/usePWA";
import { RouteGuard } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Setup from "./pages/Setup";
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
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
import LogoShowcase from "./components/LogoShowcase";
import SubscriptionSettings from "./pages/SubscriptionSettings";
import Upgrade from "./pages/Upgrade";
import ComplimentarySubscriptionManager from "./components/admin/ComplimentarySubscriptionManager";
import Promotions from "./pages/admin/Promotions";
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
import MaterialTracking from "./pages/MaterialTracking";
import EquipmentTracking from "./pages/EquipmentTracking";
import CrewScheduling from "./pages/CrewScheduling";
import NotFound from "./pages/NotFound";
import CustomerSupportChat from "./components/support/CustomerSupportChat";
import KnowledgeBase from "./components/knowledge/KnowledgeBase";
import VideoTutorialSystem from "./components/onboarding/VideoTutorialSystem";
import EmailMarketingIntegration from "./components/marketing/EmailMarketingIntegration";
import FeatureAnnouncementSystem from "./components/announcements/FeatureAnnouncementSystem";
import AutomatedWorkflows from "./components/workflows/AutomatedWorkflows";
import EnhancedEmailIntegration from "./components/integrations/EnhancedEmailIntegration";
import CalendarIntegration from "./components/calendar/CalendarIntegration";
import PurchaseOrders from "./pages/PurchaseOrders";
import Vendors from "./pages/Vendors";
import PurchaseOrderForm from "./components/purchasing/PurchaseOrderForm";
import WarrantyManagement from "./pages/WarrantyManagement";
import PermitManagement from "./pages/PermitManagement";
import BondInsuranceManagement from "./pages/BondInsuranceManagement";
import PublicProcurement from "./pages/PublicProcurement";
import ServiceDispatch from "./pages/ServiceDispatch";
import EnvironmentalPermitting from "./pages/EnvironmentalPermitting";

const queryClient = new QueryClient();

const AppContent = () => {
  usePWA();

  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/setup" element={<Setup />} />
      <Route
        path="/dashboard"
        element={
          <RouteGuard routePath="/dashboard">
            <Dashboard />
          </RouteGuard>
        }
      />
      <Route
        path="/projects"
        element={
          <RouteGuard routePath="/projects">
            <Projects />
          </RouteGuard>
        }
      />
      <Route
        path="/create-project"
        element={
          <RouteGuard routePath="/create-project">
            <CreateProject />
          </RouteGuard>
        }
      />
      <Route
        path="/project/:projectId"
        element={
          <RouteGuard routePath="/dashboard">
            <ProjectDetail />
          </RouteGuard>
        }
      />
      <Route
        path="/team"
        element={
          <RouteGuard routePath="/team">
            <TeamManagement />
          </RouteGuard>
        }
      />
      <Route
        path="/time-tracking"
        element={
          <RouteGuard routePath="/time-tracking">
            <TimeTracking />
          </RouteGuard>
        }
      />
      <Route
        path="/job-costing"
        element={
          <RouteGuard routePath="/job-costing">
            <JobCosting />
          </RouteGuard>
        }
      />
      <Route
        path="/documents"
        element={
          <RouteGuard routePath="/documents">
            <DocumentManagement />
          </RouteGuard>
        }
      />
      <Route
        path="/project/:projectId/documents"
        element={
          <RouteGuard routePath="/documents">
            <DocumentManagement />
          </RouteGuard>
        }
      />
      <Route
        path="/financial"
        element={
          <RouteGuard routePath="/financial">
            <FinancialDashboard />
          </RouteGuard>
        }
      />
      <Route
        path="/daily-reports"
        element={
          <RouteGuard routePath="/daily-reports">
            <DailyReports />
          </RouteGuard>
        }
      />
      <Route
        path="/change-orders"
        element={
          <RouteGuard routePath="/change-orders">
            <ChangeOrders />
          </RouteGuard>
        }
      />
      <Route
        path="/reports"
        element={
          <RouteGuard routePath="/reports">
            <Reports />
          </RouteGuard>
        }
      />
      <Route
        path="/analytics"
        element={
          <RouteGuard routePath="/analytics">
            <Reports />
          </RouteGuard>
        }
      />
      <Route
        path="/blog-manager"
        element={
          <RouteGuard routePath="/blog-manager">
            <BlogManager />
          </RouteGuard>
        }
      />
      <Route
        path="/admin/companies"
        element={
          <RouteGuard routePath="/admin/companies">
            <Companies />
          </RouteGuard>
        }
      />
      <Route
        path="/admin/users"
        element={
          <RouteGuard routePath="/admin/users">
            <Users />
          </RouteGuard>
        }
      />
      <Route
        path="/admin/complimentary"
        element={
          <RouteGuard routePath="/admin/complimentary">
            <ComplimentarySubscriptionManager />
          </RouteGuard>
        }
      />
      <Route
        path="/admin/analytics"
        element={
          <RouteGuard routePath="/admin/analytics">
            <Analytics />
          </RouteGuard>
        }
      />
      <Route
        path="/admin/settings"
        element={
          <RouteGuard routePath="/admin/settings">
            <AdminSettings />
          </RouteGuard>
        }
      />
      <Route
        path="/admin/promotions"
        element={
          <RouteGuard routePath="/admin/promotions">
            <Promotions />
          </RouteGuard>
        }
      />
      <Route
        path="/admin/seo"
        element={
          <RouteGuard routePath="/admin/seo">
            <SEOManager />
          </RouteGuard>
        }
      />
      <Route path="/resources" element={<Resources />} />
      <Route path="/roi-calculator" element={<ROICalculator />} />
      <Route path="/logo-showcase" element={<LogoShowcase />} />
      <Route path="/subscription" element={<SubscriptionSettings />} />
      <Route
        path="/upgrade"
        element={
          <RouteGuard routePath="/upgrade">
            <Upgrade />
          </RouteGuard>
        }
      />
      <Route path="/client-portal" element={<ClientPortal />} />
      <Route
        path="/security-monitoring"
        element={
          <RouteGuard routePath="/security-monitoring">
            <SecurityMonitoring />
          </RouteGuard>
        }
      />
      <Route
        path="/safety"
        element={
          <RouteGuard routePath="/safety">
            <Safety />
          </RouteGuard>
        }
      />
      <Route
        path="/compliance-audit"
        element={
          <RouteGuard routePath="/compliance-audit">
            <ComplianceAudit />
          </RouteGuard>
        }
      />
      <Route
        path="/gdpr-compliance"
        element={
          <RouteGuard routePath="/gdpr-compliance">
            <GDPRCompliance />
          </RouteGuard>
        }
      />
      <Route
        path="/rate-limiting"
        element={
          <RouteGuard routePath="/rate-limiting">
            <RateLimitingDashboard />
          </RouteGuard>
        }
      />
      <Route
        path="/materials"
        element={
          <RouteGuard routePath="/materials">
            <MaterialTracking />
          </RouteGuard>
        }
      />
      <Route
        path="/equipment"
        element={
          <RouteGuard routePath="/equipment">
            <EquipmentTracking />
          </RouteGuard>
        }
      />
      <Route
        path="/crew-scheduling"
        element={
          <RouteGuard routePath="/crew-scheduling">
            <CrewScheduling />
          </RouteGuard>
        }
      />
      <Route
        path="/support"
        element={
          <RouteGuard routePath="/support">
            <CustomerSupportChat />
          </RouteGuard>
        }
      />
      <Route path="/knowledge-base" element={<KnowledgeBase />} />
      <Route path="/tutorials" element={<VideoTutorialSystem />} />
      <Route
        path="/email-marketing"
        element={
          <RouteGuard routePath="/email-marketing">
            <EmailMarketingIntegration />
          </RouteGuard>
        }
      />
      <Route
        path="/announcements"
        element={
          <RouteGuard routePath="/announcements">
            <FeatureAnnouncementSystem />
          </RouteGuard>
        }
      />
      <Route
        path="/workflows"
        element={
          <RouteGuard routePath="/workflows">
            <AutomatedWorkflows />
          </RouteGuard>
        }
      />
      <Route
        path="/enhanced-email"
        element={
          <RouteGuard routePath="/enhanced-email">
            <EnhancedEmailIntegration />
          </RouteGuard>
        }
      />
      <Route
        path="/calendar"
        element={
          <RouteGuard routePath="/calendar">
            <CalendarIntegration />
          </RouteGuard>
        }
      />
      <Route
        path="/purchase-orders"
        element={
          <RouteGuard routePath="/purchase-orders">
            <PurchaseOrders />
          </RouteGuard>
        }
      />
      <Route
        path="/purchase-orders/new"
        element={
          <RouteGuard routePath="/purchase-orders">
            <PurchaseOrderForm />
          </RouteGuard>
        }
      />
      <Route
        path="/purchase-orders/:id"
        element={
          <RouteGuard routePath="/purchase-orders">
            <PurchaseOrderForm />
          </RouteGuard>
        }
      />
      <Route
        path="/purchase-orders/:id/edit"
        element={
          <RouteGuard routePath="/purchase-orders">
            <PurchaseOrderForm />
          </RouteGuard>
        }
      />
      <Route
        path="/vendors"
        element={
          <RouteGuard routePath="/vendors">
            <Vendors />
          </RouteGuard>
        }
      />
      <Route
        path="/warranty-management"
        element={
          <RouteGuard routePath="/warranty-management">
            <WarrantyManagement />
          </RouteGuard>
        }
      />
      <Route
        path="/permit-management"
        element={
          <RouteGuard routePath="/permit-management">
            <PermitManagement />
          </RouteGuard>
        }
      />
      <Route
        path="/bond-insurance"
        element={
          <RouteGuard routePath="/bond-insurance">
            <BondInsuranceManagement />
          </RouteGuard>
        }
      />
      <Route
        path="/public-procurement"
        element={
          <RouteGuard routePath="/public-procurement">
            <PublicProcurement />
          </RouteGuard>
        }
      />
      <Route
        path="/service-dispatch"
        element={
          <RouteGuard routePath="/service-dispatch">
            <ServiceDispatch />
          </RouteGuard>
        }
      />
      <Route
        path="/environmental-permitting"
        element={
          <RouteGuard routePath="/environmental-permitting">
            <EnvironmentalPermitting />
          </RouteGuard>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppContent />
          </BrowserRouter>
          <CustomerSupportChat />
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
