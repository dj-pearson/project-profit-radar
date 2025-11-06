/**
 * Project Management Routes
 * Projects, tasks, scheduling, documents, and project-related features
 */

import { Route } from 'react-router-dom';
import {
  LazyProjects,
  LazyProjectDetail,
  LazyProjectTaskCreate,
  LazyCreateProject,
  LazyScheduleManagement,
  LazyJobCosting,
  LazyDailyReports,
  LazyRFIs,
  LazySubmittals,
  LazyChangeOrders,
  LazyPunchList,
  LazyDocumentManagement,
  LazyMaterials,
  LazyMaterialTracking,
  LazyEquipment,
} from '@/utils/lazyRoutes';

export const projectRoutes = (
  <>
    {/* Project Management */}
    <Route path="/projects" element={<LazyProjects />} />
    <Route path="/projects/:projectId" element={<LazyProjectDetail />} />
    <Route path="/projects/:projectId/tasks/new" element={<LazyProjectTaskCreate />} />
    <Route path="/create-project" element={<LazyCreateProject />} />

    {/* Scheduling */}
    <Route path="/schedule-management" element={<LazyScheduleManagement />} />

    {/* Job Costing */}
    <Route path="/job-costing" element={<LazyJobCosting />} />

    {/* Daily Operations */}
    <Route path="/daily-reports" element={<LazyDailyReports />} />

    {/* Project Documentation */}
    <Route path="/rfis" element={<LazyRFIs />} />
    <Route path="/submittals" element={<LazySubmittals />} />
    <Route path="/change-orders" element={<LazyChangeOrders />} />
    <Route path="/punch-list" element={<LazyPunchList />} />
    <Route path="/documents" element={<LazyDocumentManagement />} />

    {/* Materials & Equipment */}
    <Route path="/materials" element={<LazyMaterials />} />
    <Route path="/material-tracking" element={<LazyMaterialTracking />} />
    <Route path="/equipment" element={<LazyEquipment />} />
  </>
);
