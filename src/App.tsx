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

              {/* Project area routes */}
              <Route
                path="/projects"
                element={
                  <GenericPage
                    title="All Projects"
                    description="Browse and manage all projects across your company."
                    canonical="/projects"
                  />
                }
              />
              <Route
                path="/create-project"
                element={
                  <GenericPage
                    title="Create Project"
                    description="Start a new project with templates, cost codes, and team assignments."
                    canonical="/create-project"
                  />
                }
              />
              <Route
                path="/job-costing"
                element={
                  <GenericPage
                    title="Job Costing"
                    description="Track budget vs. actuals with real-time job costing and margin insights."
                    canonical="/job-costing"
                  />
                }
              />
              <Route
                path="/daily-reports"
                element={
                  <GenericPage
                    title="Daily Reports"
                    description="Submit and review daily field reports with photos and progress notes."
                    canonical="/daily-reports"
                  />
                }
              />
              <Route
                path="/rfis"
                element={
                  <GenericPage
                    title="RFIs"
                    description="Manage Requests for Information and keep stakeholders aligned."
                    canonical="/rfis"
                  />
                }
              />
              <Route
                path="/submittals"
                element={
                  <GenericPage
                    title="Submittals"
                    description="Track submittals, approvals, and revisions efficiently."
                    canonical="/submittals"
                  />
                }
              />
              <Route
                path="/change-orders"
                element={
                  <GenericPage
                    title="Change Orders"
                    description="Create, send, and track change orders with budget impact."
                    canonical="/change-orders"
                  />
                }
              />
              <Route
                path="/punch-list"
                element={
                  <GenericPage
                    title="Punch List"
                    description="Create, assign, and close punch list items before closeout."
                    canonical="/punch-list"
                  />
                }
              />
              <Route
                path="/documents"
                element={
                  <GenericPage
                    title="Document Management"
                    description="Centralize drawings, contracts, and files with version control."
                    canonical="/documents"
                  />
                }
              />
              <Route
                path="/materials"
                element={
                  <GenericPage
                    title="Materials"
                    description="View and manage material catalogs and availability."
                    canonical="/materials"
                  />
                }
              />
              <Route
                path="/material-tracking"
                element={
                  <GenericPage
                    title="Material Tracking"
                    description="Track material requests, deliveries, and site usage."
                    canonical="/material-tracking"
                  />
                }
              />
              <Route
                path="/equipment"
                element={
                  <GenericPage
                    title="Equipment"
                    description="Manage equipment inventory, assignments, and maintenance."
                    canonical="/equipment"
                  />
                }
              />

              {/* Financial area routes */}
              <Route
                path="/financial"
                element={
                  <GenericPage
                    title="Financial Dashboard"
                    description="Monitor financial KPIs, budgets, and profitability in real time."
                    canonical="/financial"
                  />
                }
              />
              <Route
                path="/estimates"
                element={
                  <GenericPage
                    title="Estimates"
                    description="Create and manage project estimates and proposals."
                    canonical="/estimates"
                  />
                }
              />
              <Route
                path="/reports"
                element={
                  <GenericPage
                    title="Reports & Analytics"
                    description="Generate financial and operational reports with actionable insights."
                    canonical="/reports"
                  />
                }
              />
              <Route
                path="/purchase-orders"
                element={
                  <GenericPage
                    title="Purchase Orders"
                    description="Create and manage POs with vendor tracking and approvals."
                    canonical="/purchase-orders"
                  />
                }
              />
              <Route
                path="/vendors"
                element={
                  <GenericPage
                    title="Vendors"
                    description="Manage vendor records, performance, and purchasing history."
                    canonical="/vendors"
                  />
                }
              />
              <Route
                path="/quickbooks-routing"
                element={
                  <GenericPage
                    title="QuickBooks Routing"
                    description="Configure and test QuickBooks sync mappings and routes."
                    canonical="/quickbooks-routing"
                  />
                }
              />

              {/* People area routes */}
              <Route
                path="/team"
                element={
                  <GenericPage
                    title="Team Management"
                    description="Invite, organize, and permission your team members."
                    canonical="/team"
                  />
                }
              />
              <Route
                path="/crew-scheduling"
                element={
                  <GenericPage
                    title="Crew Scheduling"
                    description="Schedule crews across projects with availability visibility."
                    canonical="/crew-scheduling"
                  />
                }
              />
              <Route
                path="/time-tracking"
                element={
                  <GenericPage
                    title="Time Tracking"
                    description="Clock in/out and track labor by project and cost code."
                    canonical="/time-tracking"
                  />
                }
              />
              <Route
                path="/crm"
                element={
                  <GenericPage
                    title="CRM Dashboard"
                    description="Manage leads, contacts, and opportunities in one place."
                    canonical="/crm"
                  />
                }
              />
              <Route
                path="/crm/leads"
                element={
                  <GenericPage
                    title="Leads"
                    description="Capture and qualify new business opportunities."
                    canonical="/crm/leads"
                  />
                }
              />
              <Route
                path="/crm/contacts"
                element={
                  <GenericPage
                    title="Contacts"
                    description="Maintain a clean, searchable contact directory."
                    canonical="/crm/contacts"
                  />
                }
              />
              <Route
                path="/crm/opportunities"
                element={
                  <GenericPage
                    title="Opportunities"
                    description="Track opportunity pipeline and forecast revenue."
                    canonical="/crm/opportunities"
                  />
                }
              />
              <Route
                path="/crm/pipeline"
                element={
                  <GenericPage
                    title="Pipeline Management"
                    description="Visualize and manage your sales pipeline."
                    canonical="/crm/pipeline"
                  />
                }
              />
              <Route
                path="/crm/lead-intelligence"
                element={
                  <GenericPage
                    title="Lead Intelligence"
                    description="AI-powered lead scoring and insights."
                    canonical="/crm/lead-intelligence"
                  />
                }
              />
              <Route
                path="/crm/workflows"
                element={
                  <GenericPage
                    title="Lead Workflows"
                    description="Automate lead qualification and follow-up processes."
                    canonical="/crm/workflows"
                  />
                }
              />
              <Route
                path="/crm/campaigns"
                element={
                  <GenericPage
                    title="Nurturing Campaigns"
                    description="Create and manage lead nurturing campaigns."
                    canonical="/crm/campaigns"
                  />
                }
              />
              <Route
                path="/crm/analytics"
                element={
                  <GenericPage
                    title="CRM Analytics"
                    description="Analyze CRM performance and conversion metrics."
                    canonical="/crm/analytics"
                  />
                }
              />
              <Route
                path="/email-marketing"
                element={
                  <GenericPage
                    title="Email Marketing"
                    description="Send targeted campaigns and track engagement."
                    canonical="/email-marketing"
                  />
                }
              />
              <Route
                path="/support"
                element={
                  <GenericPage
                    title="Support"
                    description="Manage support requests and customer communications."
                    canonical="/support"
                  />
                }
              />

              {/* Operations area routes */}
              <Route
                path="/safety"
                element={
                  <GenericPage
                    title="Safety Management"
                    description="Plan and record safety meetings, incidents, and training."
                    canonical="/safety"
                  />
                }
              />
              <Route
                path="/compliance-audit"
                element={
                  <GenericPage
                    title="Compliance Audit"
                    description="Run compliance checks and audit your processes."
                    canonical="/compliance-audit"
                  />
                }
              />
              <Route
                path="/gdpr-compliance"
                element={
                  <GenericPage
                    title="GDPR Compliance"
                    description="Review and manage data privacy compliance settings."
                    canonical="/gdpr-compliance"
                  />
                }
              />
              <Route
                path="/permit-management"
                element={
                  <GenericPage
                    title="Permit Management"
                    description="Track permits, expirations, and submissions."
                    canonical="/permit-management"
                  />
                }
              />
              <Route
                path="/environmental-permitting"
                element={
                  <GenericPage
                    title="Environmental Permitting"
                    description="Manage environmental permits and documentation."
                    canonical="/environmental-permitting"
                  />
                }
              />
              <Route
                path="/bond-insurance"
                element={
                  <GenericPage
                    title="Bond & Insurance"
                    description="Manage bonds, insurance policies, and renewals."
                    canonical="/bond-insurance"
                  />
                }
              />
              <Route
                path="/warranty-management"
                element={
                  <GenericPage
                    title="Warranty Management"
                    description="Track warranties and manage service callbacks."
                    canonical="/warranty-management"
                  />
                }
              />
              <Route
                path="/public-procurement"
                element={
                  <GenericPage
                    title="Public Procurement"
                    description="Tools for bids, RFPs, and public sector compliance."
                    canonical="/public-procurement"
                  />
                }
              />
              <Route
                path="/service-dispatch"
                element={
                  <GenericPage
                    title="Service Dispatch"
                    description="Dispatch and track service work orders efficiently."
                    canonical="/service-dispatch"
                  />
                }
              />
              <Route
                path="/calendar"
                element={
                  <GenericPage
                    title="Calendar Integration"
                    description="Sync and view schedules across calendars and teams."
                    canonical="/calendar"
                  />
                }
              />
              <Route
                path="/equipment-management"
                element={
                  <GenericPage
                    title="Equipment Management"
                    description="Plan maintenance and manage equipment lifecycles."
                    canonical="/equipment-management"
                  />
                }
              />
              <Route
                path="/workflows"
                element={
                  <GenericPage
                    title="Automated Workflows"
                    description="Design and automate processes to reduce manual work."
                    canonical="/workflows"
                  />
                }
              />
              <Route
                path="/knowledge-base"
                element={
                  <GenericPage
                    title="Knowledge Base"
                    description="Central repository for SOPs, guides, and FAQs."
                    canonical="/knowledge-base"
                  />
                }
              />

              {/* Admin area routes */}
              <Route
                path="/company-settings"
                element={
                  <GenericPage
                    title="Company Settings"
                    description="Configure company profile, branding, and defaults."
                    canonical="/company-settings"
                  />
                }
              />
              <Route
                path="/security-settings"
                element={
                  <GenericPage
                    title="Security Settings"
                    description="Manage roles, permissions, and security policies."
                    canonical="/security-settings"
                  />
                }
              />
              <Route
                path="/admin/companies"
                element={
                  <GenericPage
                    title="Companies"
                    description="Root admin: manage all tenant companies."
                    canonical="/admin/companies"
                  />
                }
              />
              <Route
                path="/admin/users"
                element={
                  <GenericPage
                    title="Users"
                    description="Root admin: manage platform users and access."
                    canonical="/admin/users"
                  />
                }
              />
              <Route
                path="/admin/billing"
                element={
                  <GenericPage
                    title="Billing"
                    description="Root admin: billing overviews and adjustments."
                    canonical="/admin/billing"
                  />
                }
              />
              <Route
                path="/admin/complimentary"
                element={
                  <GenericPage
                    title="Complimentary Subscriptions"
                    description="Root admin: manage complimentary plans and trials."
                    canonical="/admin/complimentary"
                  />
                }
              />
              <Route
                path="/admin/promotions"
                element={
                  <GenericPage
                    title="Promotions"
                    description="Root admin: create and manage promotions."
                    canonical="/admin/promotions"
                  />
                }
              />
              <Route
                path="/admin/analytics"
                element={
                  <GenericPage
                    title="Analytics"
                    description="Root admin: platform analytics and performance."
                    canonical="/admin/analytics"
                  />
                }
              />
              <Route
                path="/admin/settings"
                element={
                  <GenericPage
                    title="System Settings"
                    description="Root admin: global platform settings."
                    canonical="/admin/settings"
                  />
                }
              />
              <Route
                path="/system-admin/settings"
                element={
                  <GenericPage
                    title="System Admin Settings"
                    description="Root admin: internal admin configuration."
                    canonical="/system-admin/settings"
                  />
                }
              />
              <Route
                path="/security-monitoring"
                element={
                  <GenericPage
                    title="Security Monitoring"
                    description="Root admin: monitor security events and alerts."
                    canonical="/security-monitoring"
                  />
                }
              />
              <Route
                path="/rate-limiting"
                element={
                  <GenericPage
                    title="Rate Limiting"
                    description="Root admin: configure request throttling and limits."
                    canonical="/rate-limiting"
                  />
                }
              />
              <Route
                path="/blog-manager"
                element={
                  <GenericPage
                    title="Blog Manager"
                    description="Root admin: manage blog posts and content."
                    canonical="/blog-manager"
                  />
                }
              />
              <Route
                path="/knowledge-base-admin"
                element={
                  <GenericPage
                    title="Knowledge Base Admin"
                    description="Root admin: manage knowledge base content."
                    canonical="/knowledge-base-admin"
                  />
                }
              />
              <Route
                path="/admin/seo"
                element={
                  <GenericPage
                    title="SEO Manager"
                    description="Root admin: manage SEO metadata and sitemaps."
                    canonical="/admin/seo"
                  />
                }
              />
              <Route
                path="/admin/funnels"
                element={
                  <GenericPage
                    title="Funnels"
                    description="Root admin: build and manage marketing funnels."
                    canonical="/admin/funnels"
                  />
                }
              />
              <Route
                path="/admin/support-tickets"
                element={
                  <GenericPage
                    title="Support Tickets"
                    description="Root admin: oversee support tickets and SLAs."
                    canonical="/admin/support-tickets"
                  />
                }
              />
              <Route
                path="/admin/customer-service"
                element={
                  <GenericPage
                    title="Customer Service"
                    description="Root admin: manage customer service workflows."
                    canonical="/admin/customer-service"
                  />
                }
              />
              <Route
                path="/admin/social-media"
                element={
                  <GenericPage
                    title="Social Media Manager"
                    description="Root admin: manage social media accounts and content."
                    canonical="/admin/social-media"
                  />
                }
              />
              <Route
                path="/admin/seo-analytics"
                element={
                  <GenericPage
                    title="SEO Analytics (MCP)"
                    description="Root admin: advanced SEO analytics and monitoring."
                    canonical="/admin/seo-analytics"
                  />
                }
              />
              <Route
                path="/admin/seo-analytics-legacy"
                element={
                  <GenericPage
                    title="SEO Analytics (Legacy)"
                    description="Root admin: legacy SEO analytics system."
                    canonical="/admin/seo-analytics-legacy"
                  />
                }
              />
              <Route
                path="/upgrade"
                element={
                  <GenericPage
                    title="Upgrade Plan"
                    description="Upgrade your subscription to unlock more features."
                    canonical="/upgrade"
                  />
                }
              />

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
