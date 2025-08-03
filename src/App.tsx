import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { usePWA } from "@/hooks/usePWA";
import { useGoogleAnalytics } from "@/hooks/useGoogleAnalytics";
import {
  initializeGoogleAnalytics,
  trackPageView,
} from "@/utils/googleAnalyticsSync";
import { RouteGuard } from "@/components/ProtectedRoute";
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useHashScroll } from "@/hooks/useHashScroll";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Setup from "./pages/Setup";
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import CreateProject from "./pages/CreateProject";
import ProjectDetail from "./pages/ProjectDetail";
import TeamManagement from "./pages/TeamManagement";
import { MyTasksDashboard } from "./pages/tasks/MyTasksDashboard";
import CommunicationHub from "./pages/CommunicationHub";
import TimeTracking from "./pages/TimeTracking";
import JobCosting from "./pages/JobCosting";
import DocumentManagement from "./pages/DocumentManagement";
import FinancialDashboard from "./pages/FinancialDashboard";
import DailyReports from "./pages/DailyReports";
import ChangeOrders from "./pages/ChangeOrders";
import RFIs from "./pages/RFIs";
import Submittals from "./pages/Submittals";
import PunchList from "./pages/PunchList";
import ClientPortal from "./pages/ClientPortal";
import Reports from "./pages/Reports";
import BlogManager from "./pages/BlogManager";
import Resources from "./pages/Resources";
import BlogPost from "./pages/BlogPost";
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
import SecurityMonitoringPage from "./pages/SecurityMonitoringPage";
import Safety from "./pages/Safety";
import ComplianceAudit from "./pages/ComplianceAudit";
import GDPRCompliance from "./pages/GDPRCompliance";
import RateLimitingDashboard from "./pages/RateLimitingDashboard";
import MaterialTracking from "./pages/MaterialTracking";
import EquipmentTracking from "./pages/EquipmentTracking";
import Equipment from "./pages/Equipment";
import CrewScheduling from "./pages/CrewScheduling";
import NotFound from "./pages/NotFound";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import CustomerSupportChat from "./components/support/CustomerSupportChat";
import Support from "./pages/Support";
import KnowledgeBase from "./pages/KnowledgeBase";
import KnowledgeBaseArticle from "./pages/KnowledgeBaseArticle";
import KnowledgeBaseAdmin from "./pages/KnowledgeBaseAdmin";
import VideoTutorialSystem from "./components/onboarding/VideoTutorialSystem";
import EmailMarketingIntegration from "./components/marketing/EmailMarketingIntegration";
import EmailMarketing from "./pages/EmailMarketing";
import FeatureAnnouncementSystem from "./components/announcements/FeatureAnnouncementSystem";
import AutomatedWorkflows from "./components/workflows/AutomatedWorkflows";
import AutomatedWorkflowsPage from "./pages/AutomatedWorkflows";
import Materials from "./pages/Materials";
import EnhancedEmailIntegration from "./components/integrations/EnhancedEmailIntegration";
import CalendarIntegration from "./components/calendar/CalendarIntegration";
import CalendarSync from "./pages/CalendarSync";
import PurchaseOrders from "./pages/PurchaseOrders";
import Vendors from "./pages/Vendors";
import PurchaseOrderForm from "./components/purchasing/PurchaseOrderForm";
import WarrantyManagement from "./pages/WarrantyManagement";
import PermitManagement from "./pages/PermitManagement";
import BondInsuranceManagement from "./pages/BondInsuranceManagement";
import PublicProcurement from "./pages/PublicProcurement";
import ServiceDispatch from "./pages/ServiceDispatch";
import EnvironmentalPermitting from "./pages/EnvironmentalPermitting";
import EquipmentManagement from "./pages/EquipmentManagement";
import CRMDashboard from "./pages/CRMDashboard";
import CRMLeads from "./pages/CRMLeads";
import CRMOpportunities from "./pages/CRMOpportunities";
import CRMContacts from "./pages/CRMContacts";
import CRMPipeline from "./pages/CRMPipeline";
import CRMLeadIntelligence from "./pages/CRMLeadIntelligence";
import CRMWorkflows from "./pages/CRMWorkflows";
import CRMCampaigns from "./pages/CRMCampaigns";
import CRMAnalytics from "./pages/CRMAnalytics";
import QuickBooksRouting from "./pages/QuickBooksRouting";
import ProjectsHub from "./pages/hubs/ProjectsHub";
import FinancialHub from "./pages/hubs/FinancialHub";
import PeopleHub from "./pages/hubs/PeopleHub";
import OperationsHub from "./pages/hubs/OperationsHub";
import AdminHub from "./pages/hubs/AdminHub";
import SEOAnalyticsDashboard from "./pages/SEOAnalyticsDashboard";
import MCPSEOAnalytics from "./pages/MCPSEOAnalytics";
import CompanySettings from "./pages/CompanySettings";
import ScheduleManagement from "./pages/ScheduleManagement";
import EstimatesHub from "./pages/EstimatesHub";
import { UserSettings } from "./pages/UserSettings";
import CompanyAdminSettings from "./pages/CompanyAdminSettings";
import SystemAdminSettings from "./pages/SystemAdminSettings";
import SecuritySettings from "./pages/SecuritySettings";
import { SocialMediaManager } from "./pages/admin/SocialMediaManager";
import SupportTickets from "./pages/admin/SupportTickets";
import FunnelManager from "./pages/admin/FunnelManager";
import Tools from "./pages/Tools";
import ScheduleBuilder from "./pages/tools/ScheduleBuilder";

const queryClient = new QueryClient();

const AppContent = () => {
  usePWA();
  useGoogleAnalytics(); // Enable automatic page view tracking
  useHashScroll(); // Enable hash scrolling for anchor links

  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/reset-password" element={<ResetPassword />} />
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
        path="/my-tasks"
        element={
          <RouteGuard routePath="/my-tasks">
            <MyTasksDashboard />
          </RouteGuard>
        }
      />
      <Route
        path="/communication-hub"
        element={
          <RouteGuard routePath="/communication-hub">
            <CommunicationHub />
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
        path="/rfis"
        element={
          <RouteGuard routePath="/rfis">
            <RFIs />
          </RouteGuard>
        }
      />
      <Route
        path="/submittals"
        element={
          <RouteGuard routePath="/submittals">
            <Submittals />
          </RouteGuard>
        }
      />
      <Route
        path="/punch-list"
        element={
          <RouteGuard routePath="/punch-list">
            <PunchList />
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
        path="/admin/billing"
        element={
          <RouteGuard routePath="/admin/billing">
            <Billing />
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
      <Route
        path="/admin/seo-analytics"
        element={
          <RouteGuard routePath="/admin/seo-analytics">
            <MCPSEOAnalytics />
          </RouteGuard>
        }
      />
      <Route
        path="/admin/seo-analytics-legacy"
        element={
          <RouteGuard routePath="/admin/seo-analytics-legacy">
            <SEOAnalyticsDashboard />
          </RouteGuard>
        }
      />
      <Route
        path="/admin/social-media"
        element={
          <RouteGuard routePath="/admin/social-media">
            <SocialMediaManager />
          </RouteGuard>
        }
      />
      <Route
        path="/admin/support-tickets"
        element={
          <RouteGuard routePath="/admin/support-tickets">
            <SupportTickets />
          </RouteGuard>
        }
      />
      <Route
        path="/admin/funnels"
        element={
          <RouteGuard routePath="/admin/funnels">
            <FunnelManager />
          </RouteGuard>
        }
      />
      <Route
        path="/company-settings"
        element={
          <RouteGuard routePath="/company-settings">
            <CompanySettings />
          </RouteGuard>
        }
      />
      <Route
        path="/user-settings"
        element={
          <RouteGuard routePath="/user-settings">
            <UserSettings />
          </RouteGuard>
        }
      />
      <Route
        path="/company-admin-settings"
        element={
          <RouteGuard routePath="/company-admin-settings">
            <CompanyAdminSettings />
          </RouteGuard>
        }
      />
      <Route
        path="/system-admin/settings"
        element={
          <RouteGuard routePath="/system-admin/settings">
            <SystemAdminSettings />
          </RouteGuard>
        }
      />
      <Route
        path="/security-settings"
        element={
          <RouteGuard routePath="/security-settings">
            <SecuritySettings />
          </RouteGuard>
        }
      />
      <Route path="/resources" element={<Resources />} />
      <Route path="/resources/:slug" element={<BlogPost />} />
      <Route path="/tools" element={<Tools />} />
      <Route path="/tools/schedule-builder" element={<ScheduleBuilder />} />
      <Route path="/roi-calculator" element={<ROICalculator />} />
      <Route path="/logo-showcase" element={<LogoShowcase />} />
      <Route path="/subscription" element={<SubscriptionSettings />} />
      <Route
        path="/subscription-settings"
        element={
          <RouteGuard routePath="/subscription-settings">
            <SubscriptionSettings />
          </RouteGuard>
        }
      />
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
            <SecurityMonitoringPage />
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
            <Materials />
          </RouteGuard>
        }
      />
      <Route
        path="/material-tracking"
        element={
          <RouteGuard routePath="/material-tracking">
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
        path="/equipment-management"
        element={
          <RouteGuard routePath="/equipment-management">
            <Equipment />
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
        path="/schedule-management"
        element={
          <RouteGuard routePath="/schedule-management">
            <ScheduleManagement />
          </RouteGuard>
        }
      />
      <Route
        path="/estimates"
        element={
          <RouteGuard routePath="/estimates">
            <EstimatesHub />
          </RouteGuard>
        }
      />
      <Route
        path="/support"
        element={
          <RouteGuard routePath="/support">
            <Support />
          </RouteGuard>
        }
      />
      <Route
        path="/knowledge-base"
        element={
          <RouteGuard routePath="/knowledge-base">
            <KnowledgeBase />
          </RouteGuard>
        }
      />
      <Route
        path="/knowledge-base/category/:categorySlug"
        element={
          <RouteGuard routePath="/knowledge-base">
            <KnowledgeBase />
          </RouteGuard>
        }
      />
      <Route
        path="/knowledge-base/article/:slug"
        element={
          <RouteGuard routePath="/knowledge-base">
            <KnowledgeBaseArticle />
          </RouteGuard>
        }
      />
      <Route
        path="/knowledge-base-admin"
        element={
          <RouteGuard routePath="/knowledge-base-admin">
            <KnowledgeBaseAdmin />
          </RouteGuard>
        }
      />
      <Route path="/tutorials" element={<VideoTutorialSystem />} />
      <Route
        path="/email-marketing"
        element={
          <RouteGuard routePath="/email-marketing">
            <EmailMarketing />
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
            <AutomatedWorkflowsPage />
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
            <CalendarSync />
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
      <Route
        path="/crm"
        element={
          <RouteGuard routePath="/crm">
            <CRMDashboard />
          </RouteGuard>
        }
      />
      <Route
        path="/crm/leads"
        element={
          <RouteGuard routePath="/crm/leads">
            <CRMLeads />
          </RouteGuard>
        }
      />
      <Route
        path="/crm/opportunities"
        element={
          <RouteGuard routePath="/crm/opportunities">
            <CRMOpportunities />
          </RouteGuard>
        }
      />
      <Route
        path="/crm/contacts"
        element={
          <RouteGuard routePath="/crm/contacts">
            <CRMContacts />
          </RouteGuard>
        }
      />
      <Route
        path="/crm/leads/new"
        element={
          <RouteGuard routePath="/crm/leads">
            <CRMLeads />
          </RouteGuard>
        }
      />
      <Route
        path="/crm/opportunities/new"
        element={
          <RouteGuard routePath="/crm/opportunities">
            <CRMOpportunities />
          </RouteGuard>
        }
      />
      <Route
        path="/crm/pipeline"
        element={
          <RouteGuard routePath="/crm/pipeline">
            <CRMPipeline />
          </RouteGuard>
        }
      />
      <Route
        path="/crm/lead-intelligence"
        element={
          <RouteGuard routePath="/crm/lead-intelligence">
            <CRMLeadIntelligence />
          </RouteGuard>
        }
      />
      <Route
        path="/crm/workflows"
        element={
          <RouteGuard routePath="/crm/workflows">
            <CRMWorkflows />
          </RouteGuard>
        }
      />
      <Route
        path="/crm/campaigns"
        element={
          <RouteGuard routePath="/crm/campaigns">
            <CRMCampaigns />
          </RouteGuard>
        }
      />
      <Route
        path="/crm/analytics"
        element={
          <RouteGuard routePath="/crm/analytics">
            <CRMAnalytics />
          </RouteGuard>
        }
      />
      <Route
        path="/quickbooks-routing"
        element={
          <RouteGuard routePath="/quickbooks-routing">
            <QuickBooksRouting />
          </RouteGuard>
        }
      />
      <Route
        path="/projects-hub"
        element={
          <RouteGuard routePath="/projects-hub">
            <ProjectsHub />
          </RouteGuard>
        }
      />
      <Route
        path="/financial-hub"
        element={
          <RouteGuard routePath="/financial-hub">
            <FinancialHub />
          </RouteGuard>
        }
      />
      <Route
        path="/people-hub"
        element={
          <RouteGuard routePath="/people-hub">
            <PeopleHub />
          </RouteGuard>
        }
      />
      <Route
        path="/operations-hub"
        element={
          <RouteGuard routePath="/operations-hub">
            <OperationsHub />
          </RouteGuard>
        }
      />
      <Route
        path="/admin-hub"
        element={
          <RouteGuard routePath="/admin-hub">
            <AdminHub />
          </RouteGuard>
        }
      />
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
      <Route path="/terms-of-service" element={<TermsOfService />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <h1 className="text-4xl font-bold text-center py-8">BuildDesk Loading...</h1>
      <p className="text-center text-muted-foreground">Testing basic React functionality</p>
    </div>
  );
};

export default App;
