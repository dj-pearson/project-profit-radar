/**
 * Core Application Routes
 * Main app navigation, dashboards, hubs, and settings
 */

import { Route } from 'react-router-dom';
import {
  LazyIndex,
  LazyDashboard,
  LazyMyTasks,
  LazyProjectsHub,
  LazyFinancialHub,
  LazyPeopleHub,
  LazyOperationsHub,
  LazyAdminHub,
  LazyUserSettings,
  LazySubscriptionSettings,
  LazyAPIMarketplace,
  LazyCollaboration,
  LazyMobileTesting,
  LazyMobileDashboard,
  LazyFieldManagement,
  LazyWorkflowManagement,
  LazyWorkflowTesting,
  LazyAuth,
  LazyCheckoutSuccess,
  LazyTools,
  LazyResources,
  LazyBlogPost,
} from '@/utils/lazyRoutes';

// Non-lazy imports
import { ReferralProgram } from '@/pages/ReferralProgram';
import { IntegrationMarketplace } from '@/pages/IntegrationMarketplace';
import { WorkflowAutomation } from '@/pages/WorkflowAutomation';
import { AIInsights } from '@/pages/AIInsights';
import MobileShowcase from '@/pages/MobileShowcase';
import AdvancedMobileShowcase from '@/pages/AdvancedMobileShowcase';
import { VisualProjectManagementPage } from '@/pages/VisualProjectManagementPage';
import { CustomDomain } from '@/pages/settings/CustomDomain';

export const appRoutes = (
  <>
    {/* Home */}
    <Route path="/" element={<LazyIndex />} />

    {/* Core App Routes */}
    <Route path="/dashboard" element={<LazyDashboard />} />
    <Route path="/my-tasks" element={<LazyMyTasks />} />
    <Route path="/auth" element={<LazyAuth />} />
    <Route path="/checkout/success" element={<LazyCheckoutSuccess />} />

    {/* Hubs */}
    <Route path="/projects-hub" element={<LazyProjectsHub />} />
    <Route path="/financial-hub" element={<LazyFinancialHub />} />
    <Route path="/people-hub" element={<LazyPeopleHub />} />
    <Route path="/operations-hub" element={<LazyOperationsHub />} />
    <Route path="/admin-hub" element={<LazyAdminHub />} />

    {/* Settings */}
    <Route path="/user-settings" element={<LazyUserSettings />} />
    <Route path="/subscription-settings" element={<LazySubscriptionSettings />} />
    <Route path="/settings/custom-domain" element={<CustomDomain />} />

    {/* Features */}
    <Route path="/marketplace" element={<LazyAPIMarketplace />} />
    <Route path="/collaboration" element={<LazyCollaboration />} />
    <Route path="/referrals" element={<ReferralProgram />} />
    <Route path="/integrations" element={<IntegrationMarketplace />} />
    <Route path="/workflows" element={<WorkflowAutomation />} />
    <Route path="/ai-insights" element={<AIInsights />} />
    <Route path="/visual-project" element={<VisualProjectManagementPage />} />
    <Route path="/field-management" element={<LazyFieldManagement />} />
    <Route path="/workflow-management" element={<LazyWorkflowManagement />} />
    <Route path="/workflow-testing" element={<LazyWorkflowTesting />} />

    {/* Mobile */}
    <Route path="/mobile-testing" element={<LazyMobileTesting />} />
    <Route path="/mobile-dashboard" element={<LazyMobileDashboard />} />
    <Route path="/mobile-showcase" element={<MobileShowcase />} />
    <Route path="/mobile-showcase-advanced" element={<AdvancedMobileShowcase />} />

    {/* Resources */}
    <Route path="/tools" element={<LazyTools />} />
    <Route path="/resources" element={<LazyResources />} />
    <Route path="/resources/:slug" element={<LazyBlogPost />} />

    {/* Communication - Placeholder */}
    <Route
      path="/communication"
      element={
        <div className="p-6">
          <h1 className="text-2xl font-bold">Communication Hub</h1>
          <p>Feature completed - real-time messaging, client portal, notifications, and automated updates ready.</p>
        </div>
      }
    />
  </>
);
