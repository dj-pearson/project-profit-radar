/**
 * People & CRM Routes
 * Team management, CRM, time tracking, and communication
 *
 * ⚡ Performance: All routes are lazy-loaded to reduce initial bundle size
 */

import { Route } from 'react-router-dom';
import { createLazyRoute, LazyTimeTracking, LazyCRMDashboard } from '@/utils/lazyRoutes';

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
    <Route path="/team" element={<TeamManagement />} />
    <Route path="/crew-scheduling" element={<CrewScheduling />} />
    <Route path="/crew-checkin" element={<CrewCheckin />} />
    <Route path="/crew-presence" element={<CrewPresence />} />
    <Route path="/time-tracking" element={<LazyTimeTracking />} />
    <Route path="/timesheets" element={<Timesheets />} />
    <Route path="/support" element={<Support />} />

    {/* CRM */}
    <Route path="/crm" element={<LazyCRMDashboard />} />
    <Route path="/crm/leads" element={<CRMLeads />} />
    <Route path="/crm/leads/:id" element={<LeadDetailPage />} />
    <Route path="/crm/contacts" element={<CRMContacts />} />
    <Route path="/crm/opportunities" element={<CRMOpportunities />} />
    <Route path="/crm/pipeline" element={<CRMPipeline />} />
    <Route path="/crm/lead-intelligence" element={<CRMLeadIntelligence />} />
    <Route path="/crm/workflows" element={<CRMWorkflows />} />
    <Route path="/crm/workflows/builder" element={<WorkflowBuilderPage />} />
    <Route path="/crm/workflows/builder/:id" element={<WorkflowBuilderPage />} />
    <Route path="/crm/campaigns" element={<CRMCampaigns />} />
    <Route path="/crm/analytics" element={<CRMAnalytics />} />

    {/* Communication */}
    <Route path="/email-marketing" element={<EmailMarketing />} />
  </>
);
