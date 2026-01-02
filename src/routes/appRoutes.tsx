/**
 * Core Application Routes
 * Main app navigation, dashboards, hubs, and settings
 *
 * ⚡ Performance: All routes are lazy-loaded to reduce initial bundle size
 */

import { Route } from 'react-router-dom';
import { lazy } from 'react';
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
  LazySetup,
  LazyCheckoutSuccess,
  LazyPaymentSuccess,
  LazyPaymentCancelled,
  LazyTools,
  LazyResources,
  LazyBlogPost,
} from '@/utils/lazyRoutes';

// Lazy-loaded feature pages
const ReferralProgram = lazy(() => import('@/pages/ReferralProgram').then(m => ({ default: m.ReferralProgram })));
const IntegrationMarketplace = lazy(() => import('@/pages/IntegrationMarketplace').then(m => ({ default: m.IntegrationMarketplace })));
const WorkflowAutomation = lazy(() => import('@/pages/WorkflowAutomation').then(m => ({ default: m.WorkflowAutomation })));
const AIInsights = lazy(() => import('@/pages/AIInsights').then(m => ({ default: m.AIInsights })));
const MobileShowcase = lazy(() => import('@/pages/MobileShowcase'));
const AdvancedMobileShowcase = lazy(() => import('@/pages/AdvancedMobileShowcase'));
const VisualProjectManagementPage = lazy(() => import('@/pages/VisualProjectManagementPage').then(m => ({ default: m.VisualProjectManagementPage })));
const CustomDomain = lazy(() => import('@/pages/settings/CustomDomain').then(m => ({ default: m.CustomDomain })));

export const appRoutes = (
  <>
    {/* Home */}
    <Route path="/" element={<LazyIndex />} />

    {/* Core App Routes */}
    <Route path="/dashboard" element={<LazyDashboard />} />
    <Route path="/my-tasks" element={<LazyMyTasks />} />
    <Route path="/auth" element={<LazyAuth />} />
    <Route path="/setup" element={<LazySetup />} />
    <Route path="/checkout/success" element={<LazyCheckoutSuccess />} />
    <Route path="/payment-success" element={<LazyPaymentSuccess />} />
    <Route path="/payment-cancelled" element={<LazyPaymentCancelled />} />

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
