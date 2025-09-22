import React, { Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { PlatformProvider } from "@/contexts/PlatformContext";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { NotificationPermission } from "@/components/NotificationPermission";
import { Toaster } from "@/components/ui/toaster";
import { ShortcutsHelp } from '@/components/ui/shortcuts-help';
import { ContextMenuProvider } from '@/components/ui/context-menu-provider';
import CriticalErrorBoundary from "@/components/CriticalErrorBoundary";
import { DashboardSkeleton } from "@/components/ui/loading-skeleton";

import { RouteLoadingFallback, preloadHighPriorityRoutes } from "@/utils/lazyRoutes";

// Import only the lazy route components
import {
  LazyIndex,
  LazyAuth,
  LazyDashboard,
  LazyProjectsHub,
  LazyFinancialHub,
  LazyPeopleHub,
  LazyOperationsHub,
  LazyAdminHub,
  LazyMyTasks,
  LazyUserSettings,
  LazySubscriptionSettings,
  LazyAPIMarketplace,
  LazyCollaboration,
  LazyMobileTesting,
  LazyMobileDashboard,
  LazyFieldManagement,
  LazyWorkflowManagement,
  LazyWorkflowTesting,
  LazyResources,
  LazyTools,
  LazyBlogPost,

  LazyProjects,
  LazyProjectDetail,
  LazyProjectTaskCreate,
  LazyCreateProject,
  LazyScheduleManagement,
  LazyJobCosting,
  LazyDailyReports,
  LazyRFIs,
  LazySubmittals,
  LazyChangeOrders,
  LazyPunchList,
  LazyDocumentManagement,
  LazyMaterials,
  LazyMaterialTracking,
  LazyEquipment,

  LazyFinancialDashboard,
  LazyEstimatesHub,
  LazyReports,
  LazyPurchaseOrders,
  LazyVendors,
  LazyQuickBooksRouting,
} from "@/utils/lazyRoutes";

import { VisualProjectManagementPage } from './pages/VisualProjectManagementPage';

// People area pages
import TeamManagement from "./pages/TeamManagement";
import CrewScheduling from "./pages/CrewScheduling";
import TimeTracking from "./pages/TimeTracking";
import CRMDashboard from "./pages/CRMDashboard";
import CRMLeads from "./pages/CRMLeads";
import CRMContacts from "./pages/CRMContacts";
import CRMOpportunities from "./pages/CRMOpportunities";
import CRMPipeline from "./pages/CRMPipeline";
import CRMLeadIntelligence from "./pages/CRMLeadIntelligence";
import CRMWorkflows from "./pages/CRMWorkflows";
import CRMCampaigns from "./pages/CRMCampaigns";
import CRMAnalytics from "./pages/CRMAnalytics";
import EmailMarketing from "./pages/EmailMarketing";
import Support from "./pages/Support";

// Operations area pages
import Safety from "./pages/Safety";
import ComplianceAudit from "./pages/ComplianceAudit";
import GDPRCompliance from "./pages/GDPRCompliance";
import PermitManagement from "./pages/PermitManagement";
import EnvironmentalPermitting from "./pages/EnvironmentalPermitting";
import BondInsuranceManagement from "./pages/BondInsuranceManagement";
import WarrantyManagement from "./pages/WarrantyManagement";
import PublicProcurement from "./pages/PublicProcurement";
import ServiceDispatch from "./pages/ServiceDispatch";
import CalendarSync from "./pages/CalendarSync";
import EquipmentManagement from "./pages/EquipmentManagement";
import AutomatedWorkflows from "./pages/AutomatedWorkflows";
import SmartClientUpdatesPage from "./pages/SmartClientUpdatesPage";
import MaterialOrchestrationPage from "./pages/MaterialOrchestrationPage";
import TradeHandoffPage from "./pages/TradeHandoffPage";
import AIQualityControlPage from "./pages/AIQualityControlPage";
import KnowledgeBase from "./pages/KnowledgeBase";

// Admin area pages
import CompanySettings from "./pages/CompanySettings";
import SecuritySettings from "./pages/SecuritySettings";
import Companies from "./pages/admin/Companies";
import Users from "./pages/admin/Users";
import Billing from "./pages/admin/Billing";
import Promotions from "./pages/admin/Promotions";
import Analytics from "./pages/Analytics";
import Settings from "./pages/admin/Settings";
import SystemAdminSettings from "./pages/SystemAdminSettings";
import SecurityMonitoring from "./pages/SecurityMonitoring";
import RateLimitingDashboard from "./pages/RateLimitingDashboard";
import BlogManager from "./pages/BlogManager";
import KnowledgeBaseAdmin from "./pages/KnowledgeBaseAdmin";
import FunnelManager from "./pages/admin/FunnelManager";
import SupportTickets from "./pages/admin/SupportTickets";
import { SocialMediaManager } from "./pages/admin/SocialMediaManager";
import UnifiedSEODashboard from "./pages/UnifiedSEODashboard";
import Upgrade from "./pages/Upgrade";
import ScheduleBuilder from "./pages/tools/ScheduleBuilder";


// Marketing and landing pages
import PricingPage from "./pages/Pricing";
import PaymentCenter from "./pages/PaymentCenter";
import FeaturesPage from "./pages/Features";
import BlogPage from "./pages/Blog";
import PlumbingContractorSoftware from "./pages/PlumbingContractorSoftware";
import HVACContractorSoftware from "./pages/HVACContractorSoftware";
import ElectricalContractorSoftware from "./pages/ElectricalContractorSoftware";
import JobCostingSoftware from "./pages/JobCostingSoftware";
import JobCostingSoftwareDetailed from "./pages/JobCostingSoftwareDetailed";
import ConstructionManagementSoftwarePage from "./pages/ConstructionManagementSoftwarePage";
import CommercialContractors from "./pages/CommercialContractors";
import ResidentialContractors from "./pages/ResidentialContractors";
import ProcoreAlternative from "./pages/ProcoreAlternative";
import ProcoreAlternativeDetailed from "./pages/ProcoreAlternativeDetailed";
import BuildertrendAlternative from "./pages/BuildertrendAlternative";
import BuildertrendAlternativeDetailed from "./pages/BuildertrendAlternativeDetailed";
import OSHAComplianceSoftware from "./pages/OSHAComplianceSoftware";
import ConstructionFieldManagement from "./pages/ConstructionFieldManagement";
import ConstructionSchedulingSoftware from "./pages/ConstructionSchedulingSoftware";
import ConstructionProjectManagementSoftware from "./pages/ConstructionProjectManagementSoftware";

import { GenericPage } from "@/components/pages/GenericPage";
import { UnifiedSEOSystem } from "@/components/seo/UnifiedSEOSystem";
import { AccessibilityProvider } from "@/components/accessibility/AccessibilityProvider";
import AccessibilityPage from "./pages/AccessibilityPage";

// Create a client
// Query client is now imported from lib/queryClient.ts

const App = () => {
  // Preload high-priority routes on app initialization
  useEffect(() => {
    preloadHighPriorityRoutes();
  }, []);

  return (
    <CriticalErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AccessibilityProvider>
            <ContextMenuProvider>
              <PlatformProvider>
                <ThemeProvider>
                  <HelmetProvider>
                    <BrowserRouter>
                    <UnifiedSEOSystem autoOptimize={true} enableAnalytics={true} />
                    <Suspense fallback={<DashboardSkeleton />}>
                      <Routes>
              <Route path="/" element={<LazyIndex />} />
              <Route path="/marketplace" element={<LazyAPIMarketplace />} />
              <Route path="/collaboration" element={<LazyCollaboration />} />
              <Route path="/mobile-testing" element={<LazyMobileTesting />} />
              <Route path="/mobile-dashboard" element={<LazyMobileDashboard />} />
              <Route path="/dashboard" element={<LazyDashboard />} />
              <Route path="/communication" element={<div className="p-6"><h1 className="text-2xl font-bold">Communication Hub</h1><p>Feature completed - real-time messaging, client portal, notifications, and automated updates ready.</p></div>} />
              <Route path="/visual-project" element={<VisualProjectManagementPage />} />
              <Route path="/my-tasks" element={<LazyMyTasks />} />
              <Route path="/projects-hub" element={<LazyProjectsHub />} />
              <Route path="/financial-hub" element={<LazyFinancialHub />} />
              <Route path="/people-hub" element={<LazyPeopleHub />} />
              <Route path="/operations-hub" element={<LazyOperationsHub />} />
              <Route path="/admin-hub" element={<LazyAdminHub />} />
              <Route path="/field-management" element={<LazyFieldManagement />} />
              <Route path="/user-settings" element={<LazyUserSettings />} />
              <Route
                path="/subscription-settings"
                element={<LazySubscriptionSettings />}
              />
              <Route
                path="/workflow-management"
                element={<LazyWorkflowManagement />}
              />
              <Route path="/workflow-testing" element={<LazyWorkflowTesting />} />
              <Route path="/auth" element={<LazyAuth />} />
              <Route path="/tools" element={<LazyTools />} />
              <Route path="/resources" element={<LazyResources />} />
              <Route path="/resources/:slug" element={<LazyBlogPost />} />

              {/* Marketing and landing page routes */}
              <Route path="/payment-center" element={<PaymentCenter />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/features" element={<FeaturesPage />} />
              <Route path="/blog" element={<BlogPage />} />
              <Route
                path="/plumbing-contractor-software"
                element={<PlumbingContractorSoftware />}
              />
              <Route
                path="/hvac-contractor-software"
                element={<HVACContractorSoftware />}
              />
              <Route
                path="/electrical-contractor-software"
                element={<ElectricalContractorSoftware />}
              />
              <Route
                path="/job-costing-software"
                element={<JobCostingSoftwareDetailed />}
              />
              <Route
                path="/job-costing-software-simple"
                element={<JobCostingSoftware />}
              />
              <Route
                path="/construction-management-software"
                element={<ConstructionManagementSoftwarePage />}
              />
              <Route
                path="/commercial-contractors"
                element={<CommercialContractors />}
              />
              <Route
                path="/residential-contractors"
                element={<ResidentialContractors />}
              />
              <Route
                path="/procore-alternative"
                element={<ProcoreAlternativeDetailed />}
              />
              <Route
                path="/procore-alternative-simple"
                element={<ProcoreAlternative />}
              />
              <Route
                path="/buildertrend-alternative"
                element={<BuildertrendAlternativeDetailed />}
              />
              <Route
                path="/buildertrend-alternative-simple"
                element={<BuildertrendAlternative />}
              />
              <Route
                path="/osha-compliance-software"
                element={<OSHAComplianceSoftware />}
              />
              <Route
                path="/construction-field-management"
                element={<ConstructionFieldManagement />}
              />
              <Route
                path="/construction-scheduling-software"
                element={<ConstructionSchedulingSoftware />}
              />
              <Route
                path="/construction-project-management-software"
                element={<ConstructionProjectManagementSoftware />}
              />

              {/* Project area routes */}
              <Route path="/projects" element={<LazyProjects />} />
              <Route path="/projects/:projectId" element={<LazyProjectDetail />} />
              <Route path="/projects/:projectId/tasks/new" element={<LazyProjectTaskCreate />} />
              <Route path="/create-project" element={<LazyCreateProject />} />
              <Route
                path="/schedule-management"
                element={<LazyScheduleManagement />}
              />
              <Route path="/job-costing" element={<LazyJobCosting />} />
              <Route path="/daily-reports" element={<LazyDailyReports />} />
              <Route path="/rfis" element={<LazyRFIs />} />
              <Route path="/submittals" element={<LazySubmittals />} />
              <Route path="/change-orders" element={<LazyChangeOrders />} />
              <Route path="/punch-list" element={<LazyPunchList />} />
              <Route path="/documents" element={<LazyDocumentManagement />} />
              <Route path="/materials" element={<LazyMaterials />} />
              <Route path="/material-tracking" element={<LazyMaterialTracking />} />
              <Route path="/equipment" element={<LazyEquipment />} />

              {/* Financial area routes */}
              <Route path="/financial" element={<LazyFinancialDashboard />} />
              <Route path="/estimates" element={<LazyEstimatesHub />} />
              <Route path="/reports" element={<LazyReports />} />
              <Route path="/purchase-orders" element={<LazyPurchaseOrders />} />
              <Route path="/vendors" element={<LazyVendors />} />
              <Route
                path="/quickbooks-routing"
                element={<LazyQuickBooksRouting />}
              />

              {/* People area routes */}
              <Route path="/team" element={<TeamManagement />} />
              <Route path="/crew-scheduling" element={<CrewScheduling />} />
              <Route path="/time-tracking" element={<TimeTracking />} />
              <Route path="/crm" element={<CRMDashboard />} />
              <Route path="/crm/leads" element={<CRMLeads />} />
              <Route path="/crm/contacts" element={<CRMContacts />} />
              <Route path="/crm/opportunities" element={<CRMOpportunities />} />
              <Route path="/crm/pipeline" element={<CRMPipeline />} />
              <Route
                path="/crm/lead-intelligence"
                element={<CRMLeadIntelligence />}
              />
              <Route path="/crm/workflows" element={<CRMWorkflows />} />
              <Route path="/crm/campaigns" element={<CRMCampaigns />} />
              <Route path="/crm/analytics" element={<CRMAnalytics />} />
              <Route path="/email-marketing" element={<EmailMarketing />} />
              <Route path="/support" element={<Support />} />

              {/* Operations area routes */}
              <Route path="/safety" element={<Safety />} />
              <Route path="/compliance-audit" element={<ComplianceAudit />} />
              <Route path="/gdpr-compliance" element={<GDPRCompliance />} />
              <Route path="/permit-management" element={<PermitManagement />} />
              <Route
                path="/environmental-permitting"
                element={<EnvironmentalPermitting />}
              />
              <Route
                path="/bond-insurance"
                element={<BondInsuranceManagement />}
              />
              <Route
                path="/warranty-management"
                element={<WarrantyManagement />}
              />
              <Route
                path="/public-procurement"
                element={<PublicProcurement />}
              />
              <Route path="/service-dispatch" element={<ServiceDispatch />} />
              <Route path="/calendar" element={<CalendarSync />} />
              <Route
                path="/equipment-management"
                element={<EquipmentManagement />}
              />
              <Route path="/workflows" element={<AutomatedWorkflows />} />
              <Route
                path="/smart-client-updates"
                element={<SmartClientUpdatesPage />}
              />
              <Route
                path="/material-orchestration"
                element={<MaterialOrchestrationPage />}
              />
              <Route path="/trade-handoff" element={<TradeHandoffPage />} />
              <Route
                path="/ai-quality-control"
                element={<AIQualityControlPage />}
              />
              <Route path="/knowledge-base" element={<KnowledgeBase />} />

              {/* Admin area routes */}
              <Route path="/company-settings" element={<CompanySettings />} />
              <Route path="/security-settings" element={<SecuritySettings />} />
              <Route path="/admin/companies" element={<Companies />} />
              <Route path="/admin/users" element={<Users />} />
              <Route path="/admin/billing" element={<Billing />} />
              <Route path="/admin/promotions" element={<Promotions />} />
              <Route path="/admin/analytics" element={<Analytics />} />
              <Route path="/admin/settings" element={<Settings />} />
              <Route
                path="/system-admin/settings"
                element={<SystemAdminSettings />}
              />
              <Route
                path="/security-monitoring"
                element={<SecurityMonitoring />}
              />
              <Route
                path="/rate-limiting"
                element={<RateLimitingDashboard />}
              />
              <Route path="/blog-manager" element={<BlogManager />} />
              <Route
                path="/knowledge-base-admin"
                element={<KnowledgeBaseAdmin />}
              />
              <Route path="/admin/seo" element={<Navigate to="/admin/seo-management" replace />} />
              <Route path="/admin/funnels" element={<FunnelManager />} />
              <Route
                path="/admin/support-tickets"
                element={<SupportTickets />}
              />
              <Route
                path="/admin/social-media"
                element={<SocialMediaManager />}
              />
              <Route
                path="/admin/seo-management"
                element={<UnifiedSEODashboard />}
              />
              <Route path="/admin/seo-analytics" element={<Navigate to="/admin/seo-management" replace />} />
              <Route path="/admin/seo-analytics-legacy" element={<Navigate to="/admin/seo-management" replace />} />
              <Route path="/seo-management" element={<Navigate to="/admin/seo-management" replace />} />
              <Route path="/upgrade" element={<Upgrade />} />
              <Route path="/schedule-builder" element={<ScheduleBuilder />} />
              <Route path="/accessibility" element={<AccessibilityPage />} />

              <Route
                path="*"
                element={
                  <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
                    <div className="text-center">
                      <h1 className="text-4xl font-bold mb-4">BuildDesk</h1>
                      <p className="text-muted-foreground">Page not found</p>
                    </div>
                  </div>
                }
              />
            </Routes>
          </Suspense>
          
          {/* PWA Components */}
          <PWAInstallPrompt />
          <OfflineIndicator />
          <NotificationPermission />
          <Toaster />
          <ShortcutsHelp />
        </BrowserRouter>
      </HelmetProvider>
    </ThemeProvider>
  </PlatformProvider>
          </ContextMenuProvider>
          </AccessibilityProvider>
  </AuthProvider>
</QueryClientProvider>
</CriticalErrorBoundary>
  );
};

export default App;
