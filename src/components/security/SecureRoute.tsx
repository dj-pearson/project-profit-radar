/**
 * SecureRoute - Defense-in-Depth Route Protection
 *
 * Implements all 4 security layers:
 * - Layer 1: Authentication (is user logged in?)
 * - Layer 2: Authorization (does user have permission?)
 * - Layer 3: Resource Ownership (does user own the resource?)
 * - Layer 4: Database RLS (final backend enforcement)
 *
 * Usage:
 * <SecureRoute
 *   requireAuth
 *   permission="projects.write"
 *   allowedRoles={['admin', 'project_manager']}
 * >
 *   <ProjectEditPage />
 * </SecureRoute>
 */

import { ReactNode, useEffect } from 'react';
import { Navigate, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  useSecurityContext,
  usePermission,
  useResourceAccess,
  useRoleLevel,
} from '@/hooks/useAuthorization';
import { Permission, UserRole, ResourceType, RouteSecurityConfig } from '@/lib/security/types';
import { logSecurityEvent } from '@/lib/security/securityService';
import { PageLoading } from '@/components/loading/LoadingSpinner';
import { logger } from '@/lib/logger';

// =============================================================================
// SecureRoute Component
// =============================================================================

interface SecureRouteProps extends RouteSecurityConfig {
  children: ReactNode;
  /** Show loading state while checking */
  showLoading?: boolean;
  /** Loading message */
  loadingMessage?: string;
}

export function SecureRoute({
  children,
  requireAuth = true,
  permissions,
  allowedRoles,
  minRoleLevel,
  ownershipCheck,
  redirectTo = '/auth',
  unauthorizedComponent: UnauthorizedComponent,
  showLoading = true,
  loadingMessage = 'Verifying access...',
}: SecureRouteProps) {
  const location = useLocation();
  const params = useParams();
  const { user, loading: authLoading } = useAuth();
  const { userId, role, companyId, isLoaded, isLoading } = useSecurityContext();
  const { roleLevel, meetsMinLevel, isAtLeast } = useRoleLevel();

  // Get resource ID from URL params if ownership check is configured
  const resourceId = ownershipCheck?.resourceIdParam
    ? params[ownershipCheck.resourceIdParam]
    : undefined;

  // Check resource access if configured
  const {
    hasAccess: hasResourceAccess,
    isLoading: resourceLoading,
  } = useResourceAccess(
    ownershipCheck?.resourceType || 'project',
    resourceId,
    {
      scopes: ownershipCheck?.allowedScopes,
    }
  );

  // Layer 1: Authentication Check
  if (requireAuth) {
    if (authLoading || isLoading) {
      if (showLoading) {
        return <PageLoading message={loadingMessage} />;
      }
      return null;
    }

    if (!user) {
      logger.debug('[SecureRoute] Authentication required, redirecting to:', redirectTo);
      logSecurityEvent({
        eventType: 'authentication_required',
        userId: null,
        action: 'access',
        resource: location.pathname,
        allowed: false,
        reason: 'User not authenticated',
      });

      return (
        <Navigate
          to={redirectTo}
          state={{ from: location.pathname }}
          replace
        />
      );
    }
  }

  // Wait for security context to load
  if (!isLoaded || isLoading) {
    if (showLoading) {
      return <PageLoading message={loadingMessage} />;
    }
    return null;
  }

  // Layer 2: Role Check
  if (allowedRoles && allowedRoles.length > 0) {
    if (!allowedRoles.includes(role)) {
      logger.debug('[SecureRoute] Role not allowed:', role, 'Required:', allowedRoles);
      logSecurityEvent({
        eventType: 'role_insufficient',
        userId,
        action: 'access',
        resource: location.pathname,
        allowed: false,
        reason: `Role ${role} not in allowed roles: ${allowedRoles.join(', ')}`,
      });

      if (UnauthorizedComponent) {
        return <UnauthorizedComponent />;
      }
      return <Navigate to="/unauthorized" replace />;
    }
  }

  // Layer 2: Role Level Check
  if (minRoleLevel !== undefined) {
    if (!meetsMinLevel(minRoleLevel)) {
      logger.debug('[SecureRoute] Role level insufficient:', roleLevel, 'Required:', minRoleLevel);
      logSecurityEvent({
        eventType: 'role_insufficient',
        userId,
        action: 'access',
        resource: location.pathname,
        allowed: false,
        reason: `Role level ${roleLevel} below minimum ${minRoleLevel}`,
      });

      if (UnauthorizedComponent) {
        return <UnauthorizedComponent />;
      }
      return <Navigate to="/unauthorized" replace />;
    }
  }

  // Layer 2: Permission Check (handled by SecurePermission wrapper below for multiple permissions)
  if (permissions && permissions.length === 1) {
    return (
      <SecurePermission
        permission={permissions[0]}
        redirectTo={redirectTo}
        unauthorizedComponent={UnauthorizedComponent}
        showLoading={showLoading}
        loadingMessage={loadingMessage}
      >
        {ownershipCheck ? (
          <SecureOwnership
            resourceType={ownershipCheck.resourceType}
            resourceId={resourceId}
            allowedScopes={ownershipCheck.allowedScopes}
            redirectTo={redirectTo}
            unauthorizedComponent={UnauthorizedComponent}
            showLoading={showLoading}
            loadingMessage={loadingMessage}
          >
            {children}
          </SecureOwnership>
        ) : (
          children
        )}
      </SecurePermission>
    );
  }

  // Multiple permissions - check all
  if (permissions && permissions.length > 1) {
    return (
      <SecurePermissions
        permissions={permissions}
        requireAll
        redirectTo={redirectTo}
        unauthorizedComponent={UnauthorizedComponent}
        showLoading={showLoading}
        loadingMessage={loadingMessage}
      >
        {ownershipCheck ? (
          <SecureOwnership
            resourceType={ownershipCheck.resourceType}
            resourceId={resourceId}
            allowedScopes={ownershipCheck.allowedScopes}
            redirectTo={redirectTo}
            unauthorizedComponent={UnauthorizedComponent}
            showLoading={showLoading}
            loadingMessage={loadingMessage}
          >
            {children}
          </SecureOwnership>
        ) : (
          children
        )}
      </SecurePermissions>
    );
  }

  // Layer 3: Ownership Check (if configured but no permission check)
  if (ownershipCheck && resourceId) {
    if (resourceLoading) {
      if (showLoading) {
        return <PageLoading message={loadingMessage} />;
      }
      return null;
    }

    if (!hasResourceAccess) {
      logger.debug('[SecureRoute] Resource access denied');
      logSecurityEvent({
        eventType: 'ownership_denied',
        userId,
        action: 'access',
        resource: ownershipCheck.resourceType,
        resourceId,
        allowed: false,
        reason: 'User does not have access to this resource',
      });

      if (UnauthorizedComponent) {
        return <UnauthorizedComponent />;
      }
      return <Navigate to="/unauthorized" replace />;
    }
  }

  // All checks passed
  return <>{children}</>;
}

// =============================================================================
// SecurePermission - Single Permission Check
// =============================================================================

interface SecurePermissionProps {
  permission: Permission;
  children: ReactNode;
  redirectTo?: string;
  unauthorizedComponent?: React.ComponentType;
  showLoading?: boolean;
  loadingMessage?: string;
  /** Fallback content when permission denied (for inline use) */
  fallback?: ReactNode;
}

export function SecurePermission({
  permission,
  children,
  redirectTo = '/unauthorized',
  unauthorizedComponent: UnauthorizedComponent,
  showLoading = true,
  loadingMessage = 'Checking permissions...',
  fallback,
}: SecurePermissionProps) {
  const location = useLocation();
  const { userId } = useSecurityContext();
  const { hasPermission, isLoading, error } = usePermission(permission);

  if (isLoading) {
    if (showLoading) {
      return <PageLoading message={loadingMessage} />;
    }
    return null;
  }

  if (!hasPermission) {
    logger.debug('[SecurePermission] Permission denied:', permission);
    logSecurityEvent({
      eventType: 'permission_denied',
      userId,
      action: permission,
      resource: location.pathname,
      allowed: false,
      reason: `User lacks ${permission} permission`,
    });

    if (fallback !== undefined) {
      return <>{fallback}</>;
    }

    if (UnauthorizedComponent) {
      return <UnauthorizedComponent />;
    }
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}

// =============================================================================
// SecurePermissions - Multiple Permissions Check
// =============================================================================

interface SecurePermissionsProps {
  permissions: Permission[];
  requireAll?: boolean;
  children: ReactNode;
  redirectTo?: string;
  unauthorizedComponent?: React.ComponentType;
  showLoading?: boolean;
  loadingMessage?: string;
  fallback?: ReactNode;
}

export function SecurePermissions({
  permissions,
  requireAll = true,
  children,
  redirectTo = '/unauthorized',
  unauthorizedComponent: UnauthorizedComponent,
  showLoading = true,
  loadingMessage = 'Checking permissions...',
  fallback,
}: SecurePermissionsProps) {
  const location = useLocation();
  const { userId, role, permissions: userPermissions, isLoaded } = useSecurityContext();

  if (!isLoaded) {
    if (showLoading) {
      return <PageLoading message={loadingMessage} />;
    }
    return null;
  }

  // Check permissions
  const hasWildcard = userPermissions.includes('*');
  const results = permissions.map((p) => hasWildcard || userPermissions.includes(p));
  const hasAllRequired = requireAll
    ? results.every((r) => r)
    : results.some((r) => r);

  if (!hasAllRequired) {
    const missingPermissions = permissions.filter(
      (p, i) => !results[i]
    );
    logger.debug('[SecurePermissions] Missing permissions:', missingPermissions);
    logSecurityEvent({
      eventType: 'permission_denied',
      userId,
      action: permissions.join(','),
      resource: location.pathname,
      allowed: false,
      reason: `User lacks permissions: ${missingPermissions.join(', ')}`,
    });

    if (fallback !== undefined) {
      return <>{fallback}</>;
    }

    if (UnauthorizedComponent) {
      return <UnauthorizedComponent />;
    }
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}

// =============================================================================
// SecureOwnership - Resource Ownership Check
// =============================================================================

interface SecureOwnershipProps {
  resourceType: ResourceType;
  resourceId: string | null | undefined;
  allowedScopes?: ('own' | 'team' | 'company' | 'all')[];
  children: ReactNode;
  redirectTo?: string;
  unauthorizedComponent?: React.ComponentType;
  showLoading?: boolean;
  loadingMessage?: string;
  fallback?: ReactNode;
}

export function SecureOwnership({
  resourceType,
  resourceId,
  allowedScopes = ['all'],
  children,
  redirectTo = '/unauthorized',
  unauthorizedComponent: UnauthorizedComponent,
  showLoading = true,
  loadingMessage = 'Verifying access...',
  fallback,
}: SecureOwnershipProps) {
  const location = useLocation();
  const { userId } = useSecurityContext();
  const { hasAccess, isLoading } = useResourceAccess(resourceType, resourceId, {
    scopes: allowedScopes,
  });

  // Skip check if no resource ID
  if (!resourceId) {
    return <>{children}</>;
  }

  if (isLoading) {
    if (showLoading) {
      return <PageLoading message={loadingMessage} />;
    }
    return null;
  }

  if (!hasAccess) {
    logger.debug('[SecureOwnership] Access denied to resource:', resourceType, resourceId);
    logSecurityEvent({
      eventType: 'ownership_denied',
      userId,
      action: 'access',
      resource: resourceType,
      resourceId,
      allowed: false,
      reason: `User does not have ${allowedScopes.join('/')} access to resource`,
    });

    if (fallback !== undefined) {
      return <>{fallback}</>;
    }

    if (UnauthorizedComponent) {
      return <UnauthorizedComponent />;
    }
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}

// =============================================================================
// SecureElement - Conditional UI Rendering
// =============================================================================

interface SecureElementProps {
  /** Required permission to show element */
  permission?: Permission;
  /** Required permissions (all must be met) */
  permissions?: Permission[];
  /** Allowed roles */
  allowedRoles?: UserRole[];
  /** Minimum role level */
  minRoleLevel?: number;
  /** Children to render when authorized */
  children: ReactNode;
  /** Fallback to render when unauthorized (defaults to null) */
  fallback?: ReactNode;
}

/**
 * Conditionally render UI elements based on security context
 *
 * @example
 * <SecureElement permission="projects.delete">
 *   <DeleteButton />
 * </SecureElement>
 *
 * @example
 * <SecureElement allowedRoles={['admin']} fallback={<DisabledButton />}>
 *   <AdminButton />
 * </SecureElement>
 */
export function SecureElement({
  permission,
  permissions,
  allowedRoles,
  minRoleLevel,
  children,
  fallback = null,
}: SecureElementProps) {
  const { role, roleLevel, permissions: userPermissions, isLoaded } = useSecurityContext();

  // Wait for context to load
  if (!isLoaded) {
    return null;
  }

  // Check role
  if (allowedRoles && !allowedRoles.includes(role)) {
    return <>{fallback}</>;
  }

  // Check role level
  if (minRoleLevel !== undefined && roleLevel < minRoleLevel) {
    return <>{fallback}</>;
  }

  // Check single permission
  const hasWildcard = userPermissions.includes('*');
  if (permission && !hasWildcard && !userPermissions.includes(permission)) {
    return <>{fallback}</>;
  }

  // Check multiple permissions
  if (permissions && permissions.length > 0) {
    const hasAll = permissions.every((p) => hasWildcard || userPermissions.includes(p));
    if (!hasAll) {
      return <>{fallback}</>;
    }
  }

  return <>{children}</>;
}

// =============================================================================
// SecureAction - Button/Action with Security Check
// =============================================================================

interface SecureActionProps {
  /** Required permission */
  permission?: Permission;
  /** Allowed roles */
  allowedRoles?: UserRole[];
  /** Children (typically a button or action element) */
  children: ReactNode;
  /** Render disabled version when unauthorized */
  renderDisabled?: (children: ReactNode) => ReactNode;
  /** Hide completely when unauthorized (default: false, shows disabled) */
  hideWhenUnauthorized?: boolean;
}

/**
 * Wrap action elements with security checks
 *
 * @example
 * <SecureAction
 *   permission="projects.delete"
 *   renderDisabled={(children) => <div className="opacity-50 cursor-not-allowed">{children}</div>}
 * >
 *   <Button onClick={handleDelete}>Delete Project</Button>
 * </SecureAction>
 */
export function SecureAction({
  permission,
  allowedRoles,
  children,
  renderDisabled,
  hideWhenUnauthorized = false,
}: SecureActionProps) {
  const { role, permissions: userPermissions, isLoaded } = useSecurityContext();

  // Wait for context to load
  if (!isLoaded) {
    return null;
  }

  // Check authorization
  let isAuthorized = true;

  if (allowedRoles && !allowedRoles.includes(role)) {
    isAuthorized = false;
  }

  const hasWildcard = userPermissions.includes('*');
  if (permission && !hasWildcard && !userPermissions.includes(permission)) {
    isAuthorized = false;
  }

  if (!isAuthorized) {
    if (hideWhenUnauthorized) {
      return null;
    }
    if (renderDisabled) {
      return <>{renderDisabled(children)}</>;
    }
    // Default: hide
    return null;
  }

  return <>{children}</>;
}

export default SecureRoute;
