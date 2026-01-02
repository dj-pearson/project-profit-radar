/**
 * People & CRM Routes
 * Team management, CRM, time tracking, and communication
 *
 * ⚡ Performance: All routes are lazy-loaded to reduce initial bundle size
 */

import { Route } from 'react-router-dom';
import { lazy } from 'react';
import { LazyTimeTracking, LazyCRMDashboard } from '@/utils/lazyRoutes';

// Team Management - Lazy loaded
const TeamManagement = lazy(() => import('@/pages/TeamManagement'));
const CrewScheduling = lazy(() => import('@/pages/CrewScheduling'));
const CrewCheckin = lazy(() => import('@/pages/CrewCheckin'));
const CrewPresence = lazy(() => import('@/pages/CrewPresence'));
const Timesheets = lazy(() => import('@/pages/Timesheets'));
const Support = lazy(() => import('@/pages/Support'));

// CRM - Lazy loaded
const CRMLeads = lazy(() => import('@/pages/CRMLeads'));
const CRMContacts = lazy(() => import('@/pages/CRMContacts'));
const CRMOpportunities = lazy(() => import('@/pages/CRMOpportunities'));
const CRMPipeline = lazy(() => import('@/pages/CRMPipeline'));
const CRMLeadIntelligence = lazy(() => import('@/pages/CRMLeadIntelligence'));
const CRMWorkflows = lazy(() => import('@/pages/CRMWorkflows'));
const CRMCampaigns = lazy(() => import('@/pages/CRMCampaigns'));
const CRMAnalytics = lazy(() => import('@/pages/CRMAnalytics'));
const LeadDetailPage = lazy(() => import('@/pages/LeadDetailPage'));
const WorkflowBuilderPage = lazy(() => import('@/pages/WorkflowBuilderPage'));
const EmailMarketing = lazy(() => import('@/pages/EmailMarketing'));

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
