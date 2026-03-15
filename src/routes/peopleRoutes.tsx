/**
 * People & CRM Routes
 * Team management, CRM, time tracking, and communication
 *
 * ⚡ Performance: All routes are lazy-loaded to reduce initial bundle size
 */

import { Route } from 'react-router-dom';
import { RouteGuard } from '@/components/ProtectedRoute';
import { createLazyRoute, LazyTimeTracking, LazyCRMDashboard, LazySubcontractors } from '@/utils/lazyRoutes';

// Team Management - Lazy loaded with ErrorBoundary + Suspense
const TeamManagement = createLazyRoute(() => import('@/pages/TeamManagement'));
const CrewScheduling = createLazyRoute(() => import('@/pages/CrewScheduling'));
const CrewCheckin = createLazyRoute(() => import('@/pages/CrewCheckin'));
const CrewPresence = createLazyRoute(() => import('@/pages/CrewPresence'));
const Timesheets = createLazyRoute(() => import('@/pages/Timesheets'));
const Support = createLazyRoute(() => import('@/pages/Support'));

// CRM - Lazy loaded with ErrorBoundary + Suspense
const CRMLeads = createLazyRoute(() => import('@/pages/CRMLeads'));
const CRMContacts = createLazyRoute(() => import('@/pages/CRMContacts'));
const CRMOpportunities = createLazyRoute(() => import('@/pages/CRMOpportunities'));
const CRMPipeline = createLazyRoute(() => import('@/pages/CRMPipeline'));
const CRMLeadIntelligence = createLazyRoute(() => import('@/pages/CRMLeadIntelligence'));
const CRMWorkflows = createLazyRoute(() => import('@/pages/CRMWorkflows'));
const CRMCampaigns = createLazyRoute(() => import('@/pages/CRMCampaigns'));
const CRMAnalytics = createLazyRoute(() => import('@/pages/CRMAnalytics'));
const LeadDetailPage = createLazyRoute(() => import('@/pages/LeadDetailPage'));
const WorkflowBuilderPage = createLazyRoute(() => import('@/pages/WorkflowBuilderPage'));
const EmailMarketing = createLazyRoute(() => import('@/pages/EmailMarketing'));

export const peopleRoutes = (
  <>
    {/* Team Management */}
    <Route path="/team" element={<RouteGuard><TeamManagement /></RouteGuard>} />
    <Route path="/crew-scheduling" element={<RouteGuard><CrewScheduling /></RouteGuard>} />
    <Route path="/crew-checkin" element={<RouteGuard><CrewCheckin /></RouteGuard>} />
    <Route path="/crew-presence" element={<RouteGuard><CrewPresence /></RouteGuard>} />
    <Route path="/time-tracking" element={<RouteGuard><LazyTimeTracking /></RouteGuard>} />
    <Route path="/timesheets" element={<RouteGuard><Timesheets /></RouteGuard>} />
    <Route path="/support" element={<RouteGuard><Support /></RouteGuard>} />
    <Route path="/subcontractors" element={<RouteGuard><LazySubcontractors /></RouteGuard>} />

    {/* CRM */}
    <Route path="/crm" element={<RouteGuard><LazyCRMDashboard /></RouteGuard>} />
    <Route path="/crm/leads" element={<RouteGuard><CRMLeads /></RouteGuard>} />
    <Route path="/crm/leads/:id" element={<RouteGuard><LeadDetailPage /></RouteGuard>} />
    <Route path="/crm/contacts" element={<RouteGuard><CRMContacts /></RouteGuard>} />
    <Route path="/crm/opportunities" element={<RouteGuard><CRMOpportunities /></RouteGuard>} />
    <Route path="/crm/pipeline" element={<RouteGuard><CRMPipeline /></RouteGuard>} />
    <Route path="/crm/lead-intelligence" element={<RouteGuard><CRMLeadIntelligence /></RouteGuard>} />
    <Route path="/crm/workflows" element={<RouteGuard><CRMWorkflows /></RouteGuard>} />
    <Route path="/crm/workflows/builder" element={<RouteGuard><WorkflowBuilderPage /></RouteGuard>} />
    <Route path="/crm/workflows/builder/:id" element={<RouteGuard><WorkflowBuilderPage /></RouteGuard>} />
    <Route path="/crm/campaigns" element={<RouteGuard><CRMCampaigns /></RouteGuard>} />
    <Route path="/crm/analytics" element={<RouteGuard><CRMAnalytics /></RouteGuard>} />

    {/* Communication */}
    <Route path="/email-marketing" element={<RouteGuard><EmailMarketing /></RouteGuard>} />
  </>
);
