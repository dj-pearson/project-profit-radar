/**
 * Core Application Routes
 * Main app navigation, dashboards, hubs, and settings
 *
 * ⚡ Performance: All routes are lazy-loaded to reduce initial bundle size
 */

import { Route } from 'react-router-dom';
import { RouteGuard } from '@/components/ProtectedRoute';
import {
  createLazyRoute,
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
  LazyAuthCallback,
  LazySetup,
  LazyClientPortal,
  LazyPublicEstimate,
  LazyCheckoutSuccess,
  LazyPaymentSuccess,
  LazyPaymentCancelled,
  LazyTools,
  LazyResources,
  LazyBlogPost,
  LazyUserProfile,
} from '@/utils/lazyRoutes';

// Lazy-loaded feature pages (with ErrorBoundary + Suspense via createLazyRoute)
const ReferralProgram = createLazyRoute(() => import('@/pages/ReferralProgram').then(m => ({ default: m.ReferralProgram })));
const IntegrationMarketplace = createLazyRoute(() => import('@/pages/IntegrationMarketplace').then(m => ({ default: m.IntegrationMarketplace })));
const WorkflowAutomation = createLazyRoute(() => import('@/pages/WorkflowAutomation').then(m => ({ default: m.WorkflowAutomation })));
const CommunicationPage = createLazyRoute(() => import('@/pages/CommunicationPage'));
const AIInsights = createLazyRoute(() => import('@/pages/AIInsights').then(m => ({ default: m.AIInsights })));
const MobileShowcase = createLazyRoute(() => import('@/pages/MobileShowcase'));
const AdvancedMobileShowcase = createLazyRoute(() => import('@/pages/AdvancedMobileShowcase'));
const VisualProjectManagementPage = createLazyRoute(() => import('@/pages/VisualProjectManagementPage').then(m => ({ default: m.VisualProjectManagementPage })));
const CustomDomain = createLazyRoute(() => import('@/pages/settings/CustomDomain').then(m => ({ default: m.CustomDomain })));

export const appRoutes = (
  <>
    {/* Home */}
    <Route path="/" element={<LazyIndex />} />

    {/* Core App Routes */}
    <Route path="/dashboard" element={<RouteGuard><LazyDashboard /></RouteGuard>} />
    <Route path="/my-tasks" element={<RouteGuard><LazyMyTasks /></RouteGuard>} />
    <Route path="/auth" element={<LazyAuth />} />
    <Route path="/auth/callback" element={<LazyAuthCallback />} />
    <Route path="/setup" element={<LazySetup />} />

    {/* The client portal (US-319). Routed at last: both portal pages were
        imported by no route file, so the entire customer-facing half of the
        product shipped as dead code. RouteGuard authenticates; the page itself
        sends anyone who is not a client_portal user to their dashboard, and
        RLS decides which projects they can see. */}
    <Route path="/client-portal" element={<RouteGuard><LazyClientPortal /></RouteGuard>} />

    {/* The prospect's estimate page (US-325). Deliberately OUTSIDE RouteGuard:
        a person deciding whether to hire a contractor has no account, and
        requiring one before they have agreed loses the job. The token in the
        path is the credential and the edge function behind it enforces
        expiry, revocation and version. */}
    <Route path="/estimate/:token" element={<LazyPublicEstimate />} />
    <Route path="/checkout/success" element={<LazyCheckoutSuccess />} />
    <Route path="/payment-success" element={<LazyPaymentSuccess />} />
    <Route path="/payment-cancelled" element={<LazyPaymentCancelled />} />

    {/* Hubs */}
    <Route path="/projects-hub" element={<RouteGuard><LazyProjectsHub /></RouteGuard>} />
    <Route path="/financial-hub" element={<RouteGuard><LazyFinancialHub /></RouteGuard>} />
    <Route path="/people-hub" element={<RouteGuard><LazyPeopleHub /></RouteGuard>} />
    <Route path="/operations-hub" element={<RouteGuard><LazyOperationsHub /></RouteGuard>} />
    <Route path="/admin-hub" element={<RouteGuard><LazyAdminHub /></RouteGuard>} />

    {/* Profile & Settings */}
    <Route path="/profile" element={<RouteGuard><LazyUserProfile /></RouteGuard>} />
    <Route path="/user-settings" element={<RouteGuard><LazyUserSettings /></RouteGuard>} />
    <Route path="/subscription-settings" element={<RouteGuard><LazySubscriptionSettings /></RouteGuard>} />
    <Route path="/settings/custom-domain" element={<RouteGuard><CustomDomain /></RouteGuard>} />

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

    {/*
      /communication used to render a hardcoded paragraph reading "Feature
      completed - real-time messaging, client portal, notifications, and
      automated updates ready", while the page that actually renders the
      messaging surface sat unrouted (US-296). A route asserting a feature is
      finished, in place of the feature, is the worst version of a stub.
    */}
    <Route path="/communication" element={<RouteGuard><CommunicationPage /></RouteGuard>} />
  </>
);
