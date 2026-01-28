/**
 * Route Security Configuration
 *
 * Defense-in-Depth Route Protection:
 * - Defines security requirements for each route
 * - Provides utilities for wrapping routes with security checks
 * - Centralizes permission mappings for maintainability
 *
 * Security Layers:
 * Layer 1: Authentication - Is user logged in?
 * Layer 2: Authorization - Does user have permission?
 * Layer 3: Resource Ownership - Does user own the resource?
 * Layer 4: Database RLS - Final enforcement (in PostgreSQL)
 */

import React, { ReactNode, Suspense } from 'react';
import { Route } from 'react-router-dom';
import { SecureRoute } from '@/components/security/SecureRoute';
import { Permission, UserRole, ResourceType, RouteSecurityConfig } from '@/lib/security/types';
import { PageLoading } from '@/components/loading/LoadingSpinner';

// =============================================================================
// ROUTE SECURITY CONFIGURATION
// =============================================================================

/**
 * Route security requirements mapped by path pattern
 */
export const routeSecurityConfig: Record<string, RouteSecurityConfig> = {
  // =========================================================================
  // ADMIN ROUTES - Require admin role
  // =========================================================================
  '/admin/*': {
    requireAuth: true,
    allowedRoles: ['root_admin', 'admin'],
  },
  '/admin/users': {
    requireAuth: true,
    permissions: ['users.read'],
    allowedRoles: ['root_admin', 'admin'],
  },
  '/admin/permissions': {
    requireAuth: true,
    permissions: ['users.write'],
    allowedRoles: ['root_admin', 'admin'],
  },
  '/admin/billing': {
    requireAuth: true,
    allowedRoles: ['root_admin', 'admin'],
  },
  '/admin/tenants': {
    requireAuth: true,
    allowedRoles: ['root_admin'],
  },
  '/admin/sso': {
    requireAuth: true,
    allowedRoles: ['root_admin', 'admin'],
  },
  '/admin/audit': {
    requireAuth: true,
    allowedRoles: ['root_admin', 'admin'],
  },
  '/admin/api-keys': {
    requireAuth: true,
    allowedRoles: ['root_admin', 'admin'],
  },
  '/admin/webhooks': {
    requireAuth: true,
    allowedRoles: ['root_admin', 'admin'],
  },

  // =========================================================================
  // COMPANY SETTINGS - Admin and managers
  // =========================================================================
  '/company-settings': {
    requireAuth: true,
    permissions: ['settings.read'],
    allowedRoles: ['root_admin', 'admin', 'project_manager'],
  },
  '/security-settings': {
    requireAuth: true,
    permissions: ['settings.write'],
    allowedRoles: ['root_admin', 'admin'],
  },
  '/system-admin/*': {
    requireAuth: true,
    allowedRoles: ['root_admin'],
  },

  // =========================================================================
  // PROJECT ROUTES
  // =========================================================================
  '/projects': {
    requireAuth: true,
    permissions: ['projects.read'],
  },
  '/projects/new': {
    requireAuth: true,
    permissions: ['projects.write'],
    allowedRoles: ['root_admin', 'admin', 'project_manager'],
  },
  '/projects/:id': {
    requireAuth: true,
    permissions: ['projects.read'],
    ownershipCheck: {
      resourceType: 'project',
      resourceIdParam: 'id',
      allowedScopes: ['own', 'team', 'company'],
    },
  },
  '/projects/:id/edit': {
    requireAuth: true,
    permissions: ['projects.write'],
    ownershipCheck: {
      resourceType: 'project',
      resourceIdParam: 'id',
      allowedScopes: ['own', 'team'],
    },
  },

  // =========================================================================
  // FINANCIAL ROUTES
  // =========================================================================
  '/invoices': {
    requireAuth: true,
    permissions: ['invoices.read'],
  },
  '/invoices/new': {
    requireAuth: true,
    permissions: ['invoices.write'],
    allowedRoles: ['root_admin', 'admin', 'project_manager', 'accounting', 'office_staff'],
  },
  '/invoices/:id': {
    requireAuth: true,
    permissions: ['invoices.read'],
    ownershipCheck: {
      resourceType: 'invoice',
      resourceIdParam: 'id',
      allowedScopes: ['company'],
    },
  },
  '/expenses': {
    requireAuth: true,
    permissions: ['expenses.read'],
  },
  '/expenses/:id': {
    requireAuth: true,
    permissions: ['expenses.read'],
    ownershipCheck: {
      resourceType: 'expense',
      resourceIdParam: 'id',
      allowedScopes: ['own', 'team', 'company'],
    },
  },
  '/estimates': {
    requireAuth: true,
    permissions: ['estimates.read'],
  },
  '/estimates/:id': {
    requireAuth: true,
    permissions: ['estimates.read'],
    ownershipCheck: {
      resourceType: 'estimate',
      resourceIdParam: 'id',
      allowedScopes: ['company'],
    },
  },
  '/reports': {
    requireAuth: true,
    permissions: ['reports.read'],
  },

  // =========================================================================
  // TIME TRACKING ROUTES
  // =========================================================================
  '/time-tracking': {
    requireAuth: true,
    permissions: ['time_entries.read'],
  },
  '/time-tracking/new': {
    requireAuth: true,
    permissions: ['time_entries.write'],
  },
  '/timesheets': {
    requireAuth: true,
    permissions: ['time_entries.read'],
  },
  '/timesheet-approvals': {
    requireAuth: true,
    permissions: ['time_entries.approve'],
    allowedRoles: ['root_admin', 'admin', 'project_manager', 'field_supervisor'],
  },

  // =========================================================================
  // CRM ROUTES
  // =========================================================================
  '/contacts': {
    requireAuth: true,
    permissions: ['crm.read'],
  },
  '/contacts/:id': {
    requireAuth: true,
    permissions: ['crm.read'],
    ownershipCheck: {
      resourceType: 'contact',
      resourceIdParam: 'id',
      allowedScopes: ['company'],
    },
  },
  '/leads': {
    requireAuth: true,
    permissions: ['crm.read'],
  },
  '/leads/:id': {
    requireAuth: true,
    permissions: ['crm.read'],
    ownershipCheck: {
      resourceType: 'lead',
      resourceIdParam: 'id',
      allowedScopes: ['company'],
    },
  },

  // =========================================================================
  // DOCUMENT ROUTES
  // =========================================================================
  '/documents': {
    requireAuth: true,
    permissions: ['documents.read'],
  },
  '/documents/:id': {
    requireAuth: true,
    permissions: ['documents.read'],
  },

  // =========================================================================
  // SCHEDULE & EQUIPMENT
  // =========================================================================
  '/schedule': {
    requireAuth: true,
    permissions: ['schedule.read'],
  },
  '/equipment': {
    requireAuth: true,
    permissions: ['equipment.read'],
  },

  // =========================================================================
  // USER PROFILE & SETTINGS
  // =========================================================================
  '/profile': {
    requireAuth: true,
  },
  '/settings': {
    requireAuth: true,
  },

  // =========================================================================
  // DASHBOARD - Requires authentication only
  // =========================================================================
  '/dashboard': {
    requireAuth: true,
  },
  '/hub/*': {
    requireAuth: true,
  },

  // =========================================================================
  // PUBLIC ROUTES - No authentication required
  // =========================================================================
  '/': {
    requireAuth: false,
  },
  '/auth': {
    requireAuth: false,
  },
  '/login': {
    requireAuth: false,
  },
  '/signup': {
    requireAuth: false,
  },
  '/reset-password': {
    requireAuth: false,
  },
  '/pricing': {
    requireAuth: false,
  },
  '/features': {
    requireAuth: false,
  },
  '/about': {
    requireAuth: false,
  },
  '/blog': {
    requireAuth: false,
  },
  '/blog/*': {
    requireAuth: false,
  },
  '/contact': {
    requireAuth: false,
  },
  '/demo': {
    requireAuth: false,
  },
  '/legal/*': {
    requireAuth: false,
  },
  '/privacy': {
    requireAuth: false,
  },
  '/terms': {
    requireAuth: false,
  },
  '/accessibility': {
    requireAuth: false,
  },
  '/accessibility-statement': {
    requireAuth: false,
  },
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get security configuration for a route path
 */
export function getRouteSecurityConfig(path: string): RouteSecurityConfig | null {
  // Exact match first
  if (routeSecurityConfig[path]) {
    return routeSecurityConfig[path];
  }

  // Check wildcard patterns
  for (const pattern of Object.keys(routeSecurityConfig)) {
    if (pattern.endsWith('/*')) {
      const prefix = pattern.slice(0, -2);
      if (path.startsWith(prefix)) {
        return routeSecurityConfig[pattern];
      }
    }
  }

  // Check parameterized routes
  for (const pattern of Object.keys(routeSecurityConfig)) {
    if (pattern.includes(':')) {
      const regex = new RegExp(
        '^' + pattern.replace(/:[^/]+/g, '[^/]+') + '$'
      );
      if (regex.test(path)) {
        return routeSecurityConfig[pattern];
      }
    }
  }

  // Default: require authentication
  return { requireAuth: true };
}

/**
 * Check if a route is public (no auth required)
 */
export function isPublicRoute(path: string): boolean {
  const config = getRouteSecurityConfig(path);
  return config?.requireAuth === false;
}

// =============================================================================
// SECURE ROUTE FACTORY
// =============================================================================

interface SecureRouteFactoryOptions extends RouteSecurityConfig {
  path: string;
  element: React.ReactNode;
  /** Optional loading message */
  loadingMessage?: string;
}

/**
 * Create a secure route with all security layers
 *
 * @example
 * createSecureRoute({
 *   path: '/projects/:id',
 *   element: <ProjectDetail />,
 *   permissions: ['projects.read'],
 *   ownershipCheck: {
 *     resourceType: 'project',
 *     resourceIdParam: 'id',
 *     allowedScopes: ['company'],
 *   },
 * })
 */
export function createSecureRoute({
  path,
  element,
  loadingMessage = 'Loading...',
  ...securityConfig
}: SecureRouteFactoryOptions): React.ReactNode {
  // Public routes don't need wrapping
  if (securityConfig.requireAuth === false) {
    return <Route key={path} path={path} element={element} />;
  }

  return (
    <Route
      key={path}
      path={path}
      element={
        <SecureRoute
          {...securityConfig}
          showLoading
          loadingMessage={loadingMessage}
        >
          {element}
        </SecureRoute>
      }
    />
  );
}

/**
 * Batch create secure routes from configuration
 *
 * @example
 * const routes = createSecureRoutes([
 *   { path: '/projects', element: <Projects />, permissions: ['projects.read'] },
 *   { path: '/invoices', element: <Invoices />, permissions: ['invoices.read'] },
 * ]);
 */
export function createSecureRoutes(
  routeConfigs: SecureRouteFactoryOptions[]
): React.ReactNode[] {
  return routeConfigs.map(createSecureRoute);
}

// =============================================================================
// ROUTE WRAPPER COMPONENTS
// =============================================================================

interface ProtectedAreaProps {
  children: ReactNode;
  /** Require admin role */
  adminOnly?: boolean;
  /** Require root admin role */
  rootAdminOnly?: boolean;
  /** Required permissions */
  permissions?: Permission[];
  /** Allowed roles */
  allowedRoles?: UserRole[];
  /** Minimum role level */
  minRoleLevel?: number;
}

/**
 * Wrapper component for protecting a group of routes
 *
 * @example
 * <ProtectedArea adminOnly>
 *   <Route path="/admin/users" element={<Users />} />
 *   <Route path="/admin/settings" element={<Settings />} />
 * </ProtectedArea>
 */
export function ProtectedArea({
  children,
  adminOnly,
  rootAdminOnly,
  permissions,
  allowedRoles,
  minRoleLevel,
}: ProtectedAreaProps): React.ReactNode {
  const effectiveRoles: UserRole[] = rootAdminOnly
    ? ['root_admin']
    : adminOnly
    ? ['root_admin', 'admin']
    : allowedRoles || [];

  return (
    <SecureRoute
      requireAuth
      allowedRoles={effectiveRoles.length > 0 ? effectiveRoles : undefined}
      permissions={permissions}
      minRoleLevel={minRoleLevel}
    >
      {children}
    </SecureRoute>
  );
}

/**
 * HOC to wrap a route element with security
 *
 * @example
 * const SecureProjects = withSecurity(Projects, {
 *   permissions: ['projects.read'],
 * });
 */
export function withSecurity<P extends object>(
  Component: React.ComponentType<P>,
  securityConfig: RouteSecurityConfig
): React.FC<P> {
  return function SecuredComponent(props: P) {
    return (
      <SecureRoute {...securityConfig}>
        <Component {...props} />
      </SecureRoute>
    );
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

export type { SecureRouteFactoryOptions, ProtectedAreaProps };
