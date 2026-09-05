/**
 * Project Management Routes
 * Projects, tasks, scheduling, documents, and project-related features
 *
 * ⚡ Performance: All routes are lazy-loaded to reduce initial bundle size
 */

import { Route } from 'react-router-dom';
import { RouteGuard } from '@/components/ProtectedRoute';
import {
  createLazyRoute,
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
  LazyDocumentTemplates,
  LazyMaterials,
  LazyMaterialTracking,
  LazyEquipment,
} from '@/utils/lazyRoutes';

// Lazy-loaded pages with ErrorBoundary + Suspense
const DailyReportTemplates = createLazyRoute(() => import('@/pages/DailyReportTemplates'));
const ClientSelectionsPage = createLazyRoute(() => import('@/pages/ClientSelections'));
const ProjectSchedulePage = createLazyRoute(() => import('@/pages/ProjectSchedule'));
const ScheduleImportPage = createLazyRoute(() => import('@/pages/ScheduleImport'));

export const projectRoutes = (
  <>
    {/* Project Management */}
    <Route path="/projects" element={<RouteGuard><LazyProjects /></RouteGuard>} />
    <Route path="/projects/:projectId" element={<RouteGuard><LazyProjectDetail /></RouteGuard>} />
    <Route path="/projects/:projectId/tasks/new" element={<RouteGuard><LazyProjectTaskCreate /></RouteGuard>} />
    <Route path="/create-project" element={<RouteGuard><LazyCreateProject /></RouteGuard>} />

    {/* Scheduling */}
    <Route path="/schedule-management" element={<RouteGuard><LazyScheduleManagement /></RouteGuard>} />
    <Route path="/project-schedule" element={<RouteGuard><ProjectSchedulePage /></RouteGuard>} />
    {/* US-044/US-329: routed by nothing until now, so an imported schedule had
        no way in. Linked from the schedule page. */}
    <Route path="/schedule-import" element={<RouteGuard><ScheduleImportPage /></RouteGuard>} />

    {/* Job Costing */}
    <Route path="/job-costing" element={<RouteGuard><LazyJobCosting /></RouteGuard>} />

    {/* Daily Operations */}
    <Route path="/daily-reports" element={<RouteGuard><LazyDailyReports /></RouteGuard>} />
    <Route path="/daily-report-templates" element={<RouteGuard><DailyReportTemplates /></RouteGuard>} />

    {/* Project Documentation */}
    <Route path="/rfis" element={<RouteGuard><LazyRFIs /></RouteGuard>} />
    <Route path="/submittals" element={<RouteGuard><LazySubmittals /></RouteGuard>} />
    <Route path="/change-orders" element={<RouteGuard><LazyChangeOrders /></RouteGuard>} />
    <Route path="/client-selections" element={<RouteGuard><ClientSelectionsPage /></RouteGuard>} />
    <Route path="/punch-list" element={<RouteGuard><LazyPunchList /></RouteGuard>} />
    <Route path="/documents" element={<RouteGuard><LazyDocumentManagement /></RouteGuard>} />
    <Route path="/document-templates" element={<RouteGuard><LazyDocumentTemplates /></RouteGuard>} />

    {/* Materials & Equipment */}
    <Route path="/materials" element={<RouteGuard><LazyMaterials /></RouteGuard>} />
    <Route path="/material-tracking" element={<RouteGuard><LazyMaterialTracking /></RouteGuard>} />
    <Route path="/equipment" element={<RouteGuard><LazyEquipment /></RouteGuard>} />
  </>
);
