/**
 * Centralized Route Configuration
 * Exports all application routes in organized groups.
 * Feature sections wrapped in a feature-level ErrorBoundary via layout routes.
 */

import { Route, Outlet } from 'react-router-dom';
import ErrorBoundary from '@/components/ErrorBoundary';
import AccessDenied from '@/pages/AccessDenied';
import { appRoutes } from './appRoutes';
import { marketingRoutes } from './marketingRoutes';
import { projectRoutes } from './projectRoutes';
import { financialRoutes } from './financialRoutes';
import { peopleRoutes } from './peopleRoutes';
import { operationsRoutes } from './operationsRoutes';
import { adminRoutes } from './adminRoutes';

/** Layout wrapper that adds a feature-level ErrorBoundary around child routes */
const FeatureBoundaryLayout = ({ featureName }: { featureName: string }) => (
  <ErrorBoundary level="feature" featureName={featureName}>
    <Outlet />
  </ErrorBoundary>
);

/**
 * Access Denied Route
 *
 * SecureRoute navigates here when a signed-in user's role does not allow the
 * page. Nothing answered /unauthorized until US-312, so those refusals landed
 * on the 404 below and read as a broken link rather than a permissions
 * decision.
 */
export const accessDeniedRoute = <Route path="/unauthorized" element={<AccessDenied />} />;

/**
 * 404 Not Found Route
 */
export const notFoundRoute = (
  <Route
    path="*"
    element={
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Brikly</h1>
          <p className="text-muted-foreground">Page not found</p>
        </div>
      </div>
    }
  />
);

/**
 * All Application Routes
 * Organized by functional area for better maintainability.
 * Feature sections wrapped in a feature-level ErrorBoundary via layout routes.
 */
export const allRoutes = (
  <>
    {/* Core App Routes (Dashboard, Hubs, Settings) */}
    {appRoutes}

    {/* Marketing & Public Pages */}
    {marketingRoutes}

    {/* Project Management – wrapped in boundary */}
    <Route element={<FeatureBoundaryLayout featureName="Project Management" />}>
      {projectRoutes}
    </Route>

    {/* Financial Management – wrapped in boundary */}
    <Route element={<FeatureBoundaryLayout featureName="Financial Dashboard" />}>
      {financialRoutes}
    </Route>

    {/* People & CRM – wrapped in boundary */}
    <Route element={<FeatureBoundaryLayout featureName="CRM & People" />}>
      {peopleRoutes}
    </Route>

    {/* Operations & Compliance – wrapped in boundary */}
    <Route element={<FeatureBoundaryLayout featureName="Operations" />}>
      {operationsRoutes}
    </Route>

    {/* Admin & System – wrapped in boundary */}
    <Route element={<FeatureBoundaryLayout featureName="Administration" />}>
      {adminRoutes}
    </Route>

    {/* Access denied - a refusal, not a missing page */}
    {accessDeniedRoute}

    {/* 404 - Must be last */}
    {notFoundRoute}
  </>
);

// Export individual route groups for flexibility
export {
  appRoutes,
  marketingRoutes,
  projectRoutes,
  financialRoutes,
  peopleRoutes,
  operationsRoutes,
  adminRoutes,
};
