/**
 * Centralized Route Configuration
 * Exports all application routes in organized groups
 */

import { Route } from 'react-router-dom';
import { appRoutes } from './appRoutes';
import { marketingRoutes } from './marketingRoutes';
import { projectRoutes } from './projectRoutes';
import { financialRoutes } from './financialRoutes';
import { peopleRoutes } from './peopleRoutes';
import { operationsRoutes } from './operationsRoutes';
import { adminRoutes } from './adminRoutes';

/**
 * 404 Not Found Route
 */
export const notFoundRoute = (
  <Route
    path="*"
    element={
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">BuildDesk</h1>
          <p className="text-muted-foreground">Page not found</p>
        </div>
      </div>
    }
  />
);

/**
 * All Application Routes
 * Organized by functional area for better maintainability
 */
export const allRoutes = (
  <>
    {/* Core App Routes (Dashboard, Hubs, Settings) */}
    {appRoutes}

    {/* Marketing & Public Pages */}
    {marketingRoutes}

    {/* Project Management */}
    {projectRoutes}

    {/* Financial Management */}
    {financialRoutes}

    {/* People & CRM */}
    {peopleRoutes}

    {/* Operations & Compliance */}
    {operationsRoutes}

    {/* Admin & System */}
    {adminRoutes}

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
