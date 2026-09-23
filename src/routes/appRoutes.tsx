/**
 * Core Application Routes
 * Main app navigation, dashboards, hubs, and settings
 *
 * ⚡ Performance: All routes are lazy-loaded to reduce initial bundle size
 */

import { Navigate, Route } from 'react-router-dom';
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
  LazyCollaboration,
  LazyMobileDashboard,
  LazyFieldManagement,
  LazyWorkflowManagement,
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
const IntegrationMarketplace = createLazyRoute(() => import('@/pages/IntegrationMarketplace').then(m => ({ default: m.IntegrationMarketplace })));
const WorkflowAutomation = createLazyRoute(() => import('@/pages/WorkflowAutomation').then(m => ({ default: m.WorkflowAutomation })));
const CommunicationPage = createLazyRoute(() => import('@/pages/CommunicationPage'));
const MobileShowcase = createLazyRoute(() => import('@/pages/MobileShowcase'));
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
    <Route path="/setup" element={<RouteGuard><LazySetup /></RouteGuard>} />

    {/* The client portal (US-319). Routed at last: both portal pages were
        imported by no route file, so the entire customer-facing half of the
        product shipped as dead code. RouteGuard authenticates; the page itself
        sends anyone who is not a client_portal user to their dashboard, and
        RLS decides which projects they can see. */}
    <Route path="/client-portal" element={<RouteGuard portalScoped><LazyClientPortal /></RouteGuard>} />

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
    <Route path="/profile" element={<RouteGuard portalScoped><LazyUserProfile /></RouteGuard>} />
    <Route path="/user-settings" element={<RouteGuard><LazyUserSettings /></RouteGuard>} />
    <Route path="/subscription-settings" element={<RouteGuard><LazySubscriptionSettings /></RouteGuard>} />
    <Route path="/settings/custom-domain" element={<RouteGuard><CustomDomain /></RouteGuard>} />

    {/* Features */}
    <Route path="/collaboration" element={<RouteGuard><LazyCollaboration /></RouteGuard>} />
    <Route path="/integrations" element={<RouteGuard><IntegrationMarketplace /></RouteGuard>} />
    <Route path="/workflows" element={<RouteGuard><WorkflowAutomation /></RouteGuard>} />
    <Route path="/field-management" element={<RouteGuard><LazyFieldManagement /></RouteGuard>} />
    <Route path="/workflow-management" element={<RouteGuard><LazyWorkflowManagement /></RouteGuard>} />
    {/* Routed pages nothing linked to, triaged in US-315. Deleted rather than
        linked because none of them was a finished feature:
          /marketplace      a hardcoded catalog whose Install button installs
                            nothing and points at /integrations
          /referrals        the referral-code trigger was never created, so
                            every user saw "Referral code not found"; the
                            working program is the affiliate tab on
                            /subscription-settings
          /ai-insights      fixed "3 customers at high risk" and "MRR predicted
                            to grow 23%" cards, whatever the data said
          /visual-project   hardcoded tasks, placeholder photos and a weather
                            tab reading "being updated"
          /mobile-testing, /mobile-showcase-advanced   developer gesture demos
        None was ever linked, so none gets a redirect. /workflow-testing was
        (by the old AppSidebar), and was a test harness around the same four
        components /workflow-management renders, so it redirects there. */}
    <Route path="/workflow-testing" element={<Navigate to="/workflow-management" replace />} />

    {/* Mobile */}
    <Route path="/mobile-dashboard" element={<RouteGuard><LazyMobileDashboard /></RouteGuard>} />
    <Route path="/mobile-showcase" element={<RouteGuard><MobileShowcase /></RouteGuard>} />

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
