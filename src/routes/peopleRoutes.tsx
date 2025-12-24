/**
 * People & CRM Routes
 * Team management, CRM, time tracking, and communication
 */

import { Route } from 'react-router-dom';
import { LazyTimeTracking, LazyCRMDashboard } from '@/utils/lazyRoutes';

// Team Management
import TeamManagement from '@/pages/TeamManagement';
import CrewScheduling from '@/pages/CrewScheduling';
import CrewCheckin from '@/pages/CrewCheckin';
import CrewPresence from '@/pages/CrewPresence';
import Timesheets from '@/pages/Timesheets';
import Support from '@/pages/Support';

// CRM
import CRMLeads from '@/pages/CRMLeads';
import CRMContacts from '@/pages/CRMContacts';
import CRMOpportunities from '@/pages/CRMOpportunities';
import CRMPipeline from '@/pages/CRMPipeline';
import CRMLeadIntelligence from '@/pages/CRMLeadIntelligence';
import CRMWorkflows from '@/pages/CRMWorkflows';
import CRMCampaigns from '@/pages/CRMCampaigns';
import CRMAnalytics from '@/pages/CRMAnalytics';
import LeadDetailPage from '@/pages/LeadDetailPage';
import WorkflowBuilderPage from '@/pages/WorkflowBuilderPage';
import EmailMarketing from '@/pages/EmailMarketing';

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
