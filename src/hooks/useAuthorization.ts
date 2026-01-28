/**
 * Authorization Hooks
 *
 * React hooks for implementing defense-in-depth security:
 * - useSecurityContext: Access user's security context
 * - usePermission: Check if user has a permission
 * - useResourceAccess: Check if user can access a resource
 * - useSecureAction: Wrap actions with security checks
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  Permission,
  UserRole,
  ResourceType,
  SecurityContext,
  SecurityCheckResult,
  OwnershipCheckResult,
  ROLE_LEVELS,
  DEFAULT_ROLE_PERMISSIONS,
} from '@/lib/security/types';
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  checkResourceOwnership,
  performSecurityCheck,
  getUserPermissions,
  getRoleLevel,
  logSecurityEvent,
} from '@/lib/security/securityService';
import { logger } from '@/lib/logger';

// =============================================================================
// useSecurityContext - Core security context hook
// =============================================================================

/**
 * Get the current user's security context
 *
 * This provides:
 * - User ID, role, company ID
 * - Role level for hierarchical checks
 * - Effective permissions (role defaults + direct grants)
 */
export function useSecurityContext(): SecurityContext {
  const { user, userProfile, loading } = useAuth();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isPermissionsLoaded, setIsPermissionsLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Compute security context from auth state
  const securityContext = useMemo((): SecurityContext => {
    if (!user || !userProfile) {
      return {
        userId: '',
        role: 'client_portal' as UserRole,
        companyId: null,
        roleLevel: 0,
        permissions: [],
        isLoaded: false,
        isLoading: loading,
        error: null,
      };
    }

    const role = (userProfile.role || 'client_portal') as UserRole;
    const roleLevel = getRoleLevel(role);
    const rolePermissions = DEFAULT_ROLE_PERMISSIONS[role] || [];

    return {
      userId: user.id,
      role,
      companyId: userProfile.company_id || null,
      roleLevel,
      permissions: isPermissionsLoaded ? permissions : rolePermissions,
      isLoaded: !loading && isPermissionsLoaded,
      isLoading: loading || !isPermissionsLoaded,
      error,
    };
  }, [user, userProfile, loading, permissions, isPermissionsLoaded, error]);

  // Fetch full permissions from database on mount
  useEffect(() => {
    async function loadPermissions() {
      if (!user?.id || !userProfile?.role) {
        setIsPermissionsLoaded(true);
        return;
      }

      try {
        const allPermissions = await getUserPermissions(
          user.id,
          userProfile.role as UserRole
        );
        setPermissions(allPermissions);
        setIsPermissionsLoaded(true);
      } catch (err) {
        logger.error('[useAuthorization] Failed to load permissions:', err);
        setError(err instanceof Error ? err : new Error('Failed to load permissions'));
        setIsPermissionsLoaded(true); // Still mark as loaded to prevent infinite loading
      }
    }

    loadPermissions();
  }, [user?.id, userProfile?.role]);

  return securityContext;
}

// =============================================================================
// usePermission - Check single permission
// =============================================================================

interface UsePermissionOptions {
  /** Don't check database, only role defaults (faster) */
  skipDatabaseCheck?: boolean;
  /** Resource type for resource-specific permissions */
  resourceType?: string;
  /** Resource ID for resource-specific permissions */
  resourceId?: string;
}

interface UsePermissionResult {
  hasPermission: boolean;
  isLoading: boolean;
  error: Error | null;
  check: () => Promise<SecurityCheckResult>;
}

/**
 * Check if the current user has a specific permission
 *
 * @example
 * const { hasPermission, isLoading } = usePermission('projects.write');
 * if (hasPermission) {
 *   // Show edit button
 * }
 */
export function usePermission(
  permission: Permission,
  options?: UsePermissionOptions
): UsePermissionResult {
  const { userId, role, isLoading: contextLoading, isLoaded } = useSecurityContext();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Check permission
  const check = useCallback(async (): Promise<SecurityCheckResult> => {
    if (!userId || !role) {
      return {
        allowed: false,
        reason: 'No authenticated user',
        layer: 'authentication',
        permission,
      };
    }

    setIsChecking(true);
    try {
      const result = await hasPermission(userId, permission, role, {
        skipDatabaseCheck: options?.skipDatabaseCheck,
        resourceType: options?.resourceType,
        resourceId: options?.resourceId,
      });
      setAllowed(result.allowed);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Permission check failed');
      setError(error);
      setAllowed(false);
      return {
        allowed: false,
        reason: error.message,
        layer: 'authorization',
        permission,
      };
    } finally {
      setIsChecking(false);
    }
  }, [userId, role, permission, options?.skipDatabaseCheck, options?.resourceType, options?.resourceId]);

  // Initial check when context is ready
  useEffect(() => {
    if (isLoaded && userId && role && allowed === null) {
      check();
    }
  }, [isLoaded, userId, role, allowed, check]);

  return {
    hasPermission: allowed === true,
    isLoading: contextLoading || isChecking || allowed === null,
    error,
    check,
  };
}

// =============================================================================
// usePermissions - Check multiple permissions
// =============================================================================

interface UsePermissionsOptions {
  /** Require all permissions (AND) vs any permission (OR) */
  requireAll?: boolean;
}

interface UsePermissionsResult {
  hasPermissions: boolean;
  isLoading: boolean;
  error: Error | null;
  results: Map<Permission, boolean>;
}

/**
 * Check if the current user has multiple permissions
 *
 * @example
 * const { hasPermissions } = usePermissions(['projects.write', 'projects.delete'], { requireAll: true });
 */
export function usePermissions(
  permissions: Permission[],
  options?: UsePermissionsOptions
): UsePermissionsResult {
  const { userId, role, isLoading: contextLoading, isLoaded } = useSecurityContext();
  const [results, setResults] = useState<Map<Permission, boolean>>(new Map());
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const requireAll = options?.requireAll ?? true;

  // Memoize permissions array to prevent infinite loops
  const permissionsKey = permissions.join(',');

  // Check permissions
  useEffect(() => {
    async function checkPermissions() {
      if (!isLoaded || !userId || !role) return;

      setIsChecking(true);
      try {
        const newResults = new Map<Permission, boolean>();

        for (const permission of permissions) {
          const result = await hasPermission(userId, permission, role, {
            skipDatabaseCheck: true, // Fast path first
          });
          newResults.set(permission, result.allowed);
        }

        setResults(newResults);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Permissions check failed'));
      } finally {
        setIsChecking(false);
      }
    }

    checkPermissions();
  }, [isLoaded, userId, role, permissionsKey]);

  const hasPermissions = useMemo(() => {
    if (results.size === 0) return false;

    const values = Array.from(results.values());
    return requireAll ? values.every((v) => v) : values.some((v) => v);
  }, [results, requireAll]);

  return {
    hasPermissions,
    isLoading: contextLoading || isChecking,
    error,
    results,
  };
}

// =============================================================================
// useResourceAccess - Check resource ownership
// =============================================================================

interface UseResourceAccessOptions {
  /** Permission required for access */
  permission?: Permission;
  /** Allowed ownership scopes */
  scopes?: ('own' | 'team' | 'company' | 'all')[];
}

interface UseResourceAccessResult {
  hasAccess: boolean;
  isOwner: boolean;
  isTeamMember: boolean;
  isCompanyMember: boolean;
  isLoading: boolean;
  error: Error | null;
  recheck: () => Promise<void>;
}

/**
 * Check if the current user can access a specific resource
 *
 * @example
 * const { hasAccess, isOwner } = useResourceAccess('project', projectId, {
 *   permission: 'projects.write',
 *   scopes: ['own', 'team'],
 * });
 */
export function useResourceAccess(
  resourceType: ResourceType,
  resourceId: string | null | undefined,
  options?: UseResourceAccessOptions
): UseResourceAccessResult {
  const { userId, role, companyId, isLoading: contextLoading, isLoaded } = useSecurityContext();
  const [ownershipResult, setOwnershipResult] = useState<OwnershipCheckResult | null>(null);
  const [permissionAllowed, setPermissionAllowed] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const recheck = useCallback(async () => {
    if (!isLoaded || !userId || !resourceId) return;

    setIsChecking(true);
    try {
      // Check permission if specified
      if (options?.permission) {
        const permResult = await hasPermission(userId, options.permission, role, {
          resourceType,
          resourceId,
        });
        setPermissionAllowed(permResult.allowed);

        if (!permResult.allowed) {
          setOwnershipResult({
            isOwner: false,
            isTeamMember: false,
            isCompanyMember: false,
            hasAccess: false,
            reason: permResult.reason,
          });
          return;
        }
      } else {
        setPermissionAllowed(true);
      }

      // Check resource ownership
      const ownership = await checkResourceOwnership(
        userId,
        companyId,
        resourceType,
        resourceId,
        options?.scopes || ['all']
      );
      setOwnershipResult(ownership);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Access check failed'));
      setOwnershipResult({
        isOwner: false,
        isTeamMember: false,
        isCompanyMember: false,
        hasAccess: false,
        reason: 'Access check failed',
      });
    } finally {
      setIsChecking(false);
    }
  }, [isLoaded, userId, role, companyId, resourceType, resourceId, options?.permission, options?.scopes]);

  // Check on mount and when dependencies change
  useEffect(() => {
    if (resourceId) {
      recheck();
    }
  }, [resourceId, recheck]);

  return {
    hasAccess: permissionAllowed === true && (ownershipResult?.hasAccess ?? false),
    isOwner: ownershipResult?.isOwner ?? false,
    isTeamMember: ownershipResult?.isTeamMember ?? false,
    isCompanyMember: ownershipResult?.isCompanyMember ?? false,
    isLoading: contextLoading || isChecking,
    error,
    recheck,
  };
}

// =============================================================================
// useSecureAction - Wrap actions with security checks
// =============================================================================

interface UseSecureActionOptions<TArgs extends unknown[]> {
  /** Required permission */
  permission?: Permission;
  /** Required minimum role level */
  minRoleLevel?: number;
  /** Allowed roles */
  allowedRoles?: UserRole[];
  /** Resource type for ownership check */
  resourceType?: ResourceType;
  /** Function to get resource ID from action args */
  getResourceId?: (...args: TArgs) => string | null;
  /** Ownership scopes */
  ownershipScopes?: ('own' | 'team' | 'company' | 'all')[];
  /** Callback when action is denied */
  onDenied?: (result: SecurityCheckResult) => void;
  /** Log the action attempt */
  logAction?: boolean;
}

interface UseSecureActionResult<TArgs extends unknown[], TReturn> {
  /** Wrapped action that checks security before executing */
  execute: (...args: TArgs) => Promise<TReturn | undefined>;
  /** Whether security check is in progress */
  isChecking: boolean;
  /** Last security check result */
  lastResult: SecurityCheckResult | null;
  /** Whether user is generally authorized for this action */
  isAuthorized: boolean;
}

/**
 * Wrap an action with security checks
 *
 * @example
 * const { execute: deleteProject, isAuthorized } = useSecureAction(
 *   async (projectId: string) => {
 *     await api.deleteProject(projectId);
 *   },
 *   {
 *     permission: 'projects.delete',
 *     resourceType: 'project',
 *     getResourceId: (projectId) => projectId,
 *     onDenied: () => toast.error('You do not have permission to delete projects'),
 *   }
 * );
 */
export function useSecureAction<TArgs extends unknown[], TReturn>(
  action: (...args: TArgs) => Promise<TReturn>,
  options: UseSecureActionOptions<TArgs>
): UseSecureActionResult<TArgs, TReturn> {
  const { userId, role, companyId, isLoaded, permissions } = useSecurityContext();
  const [isChecking, setIsChecking] = useState(false);
  const [lastResult, setLastResult] = useState<SecurityCheckResult | null>(null);

  // Quick authorization check (without resource-specific checks)
  const isAuthorized = useMemo(() => {
    if (!isLoaded || !userId) return false;

    // Check permission
    if (options.permission && !permissions.includes(options.permission)) {
      // Also check for wildcard
      if (!permissions.includes('*')) {
        return false;
      }
    }

    // Check role level
    if (options.minRoleLevel !== undefined) {
      const userLevel = ROLE_LEVELS[role] || 0;
      if (userLevel < options.minRoleLevel) return false;
    }

    // Check allowed roles
    if (options.allowedRoles && !options.allowedRoles.includes(role)) {
      return false;
    }

    return true;
  }, [isLoaded, userId, role, permissions, options.permission, options.minRoleLevel, options.allowedRoles]);

  // Wrapped execute function
  const execute = useCallback(
    async (...args: TArgs): Promise<TReturn | undefined> => {
      if (!isLoaded || !userId) {
        const result: SecurityCheckResult = {
          allowed: false,
          reason: 'User not authenticated',
          layer: 'authentication',
        };
        setLastResult(result);
        options.onDenied?.(result);
        return undefined;
      }

      setIsChecking(true);

      try {
        // Get resource ID if applicable
        const resourceId = options.getResourceId
          ? options.getResourceId(...args)
          : undefined;

        // Perform full security check
        const result = await performSecurityCheck({
          userId,
          role,
          companyId,
          permission: options.permission,
          minRoleLevel: options.minRoleLevel,
          allowedRoles: options.allowedRoles,
          resourceType: options.resourceType,
          resourceId: resourceId || undefined,
          ownershipScopes: options.ownershipScopes,
        });

        setLastResult(result);

        if (!result.allowed) {
          options.onDenied?.(result);
          return undefined;
        }

        // Log action if enabled
        if (options.logAction) {
          await logSecurityEvent({
            eventType: 'permission_granted',
            userId,
            action: options.permission || 'action',
            resource: options.resourceType || 'unknown',
            resourceId: resourceId || undefined,
            allowed: true,
            reason: 'Action executed after security check',
          });
        }

        // Execute the action
        return await action(...args);
      } catch (error) {
        logger.error('[useSecureAction] Action failed:', error);
        throw error;
      } finally {
        setIsChecking(false);
      }
    },
    [isLoaded, userId, role, companyId, action, options]
  );

  return {
    execute,
    isChecking,
    lastResult,
    isAuthorized,
  };
}

// =============================================================================
// useRoleLevel - Check role hierarchy
// =============================================================================

interface UseRoleLevelResult {
  roleLevel: number;
  meetsMinLevel: (minLevel: number) => boolean;
  isAtLeast: (role: UserRole) => boolean;
}

/**
 * Check user's role level in the hierarchy
 *
 * @example
 * const { meetsMinLevel, isAtLeast } = useRoleLevel();
 * if (isAtLeast('project_manager')) {
 *   // Show PM features
 * }
 */
export function useRoleLevel(): UseRoleLevelResult {
  const { role, roleLevel } = useSecurityContext();

  const meetsMinLevel = useCallback(
    (minLevel: number) => roleLevel >= minLevel,
    [roleLevel]
  );

  const isAtLeast = useCallback(
    (targetRole: UserRole) => roleLevel >= ROLE_LEVELS[targetRole],
    [roleLevel]
  );

  return {
    roleLevel,
    meetsMinLevel,
    isAtLeast,
  };
}
