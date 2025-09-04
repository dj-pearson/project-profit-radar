import React from "react";
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

// Project area pages
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import CreateProject from "./pages/CreateProject";
import ScheduleManagement from "./pages/ScheduleManagement";
import JobCosting from "./pages/JobCosting";
import DailyReports from "./pages/DailyReports";
import RFIs from "./pages/RFIs";
import Submittals from "./pages/Submittals";
import ChangeOrders from "./pages/ChangeOrders";
import PunchList from "./pages/PunchList";
import DocumentManagement from "./pages/DocumentManagement";
import Materials from "./pages/Materials";
import MaterialTracking from "./pages/MaterialTracking";
import Equipment from "./pages/Equipment";

// Financial area pages
import FinancialDashboard from "./pages/FinancialDashboard";
import EstimatesHub from "./pages/EstimatesHub";
import Reports from "./pages/Reports";
import PurchaseOrders from "./pages/PurchaseOrders";
import Vendors from "./pages/Vendors";
import QuickBooksRouting from "./pages/QuickBooksRouting";

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
import SEOManager from "./pages/admin/SEOManager";
import FunnelManager from "./pages/admin/FunnelManager";
import SupportTickets from "./pages/admin/SupportTickets";
import { SocialMediaManager } from "./pages/admin/SocialMediaManager";
import SEOAnalyticsDashboard from "./pages/SEOAnalyticsDashboard";
import Upgrade from "./pages/Upgrade";
import ScheduleBuilder from "./pages/tools/ScheduleBuilder";

// Marketing and landing pages
import PricingPage from "./pages/Pricing";
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
              <Route
                path="/subscription-settings"
                element={<SubscriptionSettings />}
              />
              <Route
                path="/workflow-management"
                element={<WorkflowManagement />}
              />
              <Route path="/workflow-testing" element={<WorkflowTesting />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/tools" element={<Tools />} />
              <Route path="/resources" element={<Resources />} />
              <Route path="/resources/:slug" element={<BlogPost />} />

              {/* Marketing and landing page routes */}
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
              <Route path="/projects" element={<Projects />} />
              <Route path="/projects/:projectId" element={<ProjectDetail />} />
              <Route path="/create-project" element={<CreateProject />} />
              <Route
                path="/schedule-management"
                element={<ScheduleManagement />}
              />
              <Route path="/job-costing" element={<JobCosting />} />
              <Route path="/daily-reports" element={<DailyReports />} />
              <Route path="/rfis" element={<RFIs />} />
              <Route path="/submittals" element={<Submittals />} />
              <Route path="/change-orders" element={<ChangeOrders />} />
              <Route path="/punch-list" element={<PunchList />} />
              <Route path="/documents" element={<DocumentManagement />} />
              <Route path="/materials" element={<Materials />} />
              <Route path="/material-tracking" element={<MaterialTracking />} />
              <Route path="/equipment" element={<Equipment />} />

              {/* Financial area routes */}
              <Route path="/financial" element={<FinancialDashboard />} />
              <Route path="/estimates" element={<EstimatesHub />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/purchase-orders" element={<PurchaseOrders />} />
              <Route path="/vendors" element={<Vendors />} />
              <Route
                path="/quickbooks-routing"
                element={<QuickBooksRouting />}
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
            <Route
              path="/trade-handoff"
              element={<TradeHandoffPage />}
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
              <Route path="/admin/seo" element={<SEOManager />} />
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
                path="/admin/seo-analytics"
                element={<SEOAnalyticsDashboard />}
              />
              <Route path="/upgrade" element={<Upgrade />} />
              <Route path="/schedule-builder" element={<ScheduleBuilder />} />

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
