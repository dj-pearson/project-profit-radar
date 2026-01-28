/**
 * Security Service
 *
 * Provides centralized security checks for the defense-in-depth architecture:
 * - Layer 2: Authorization (permission & role checks)
 * - Layer 3: Resource Ownership validation
 * - Security audit logging
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import {
  Permission,
  UserRole,
  ResourceType,
  ROLE_LEVELS,
  DEFAULT_ROLE_PERMISSIONS,
  SecurityCheckResult,
  OwnershipCheckResult,
  SecurityAuditEvent,
  SecurityEventType,
} from './types';

// =============================================================================
// PERMISSION CHECKING (Layer 2)
// =============================================================================

/**
 * Check if user has a specific permission
 *
 * This checks:
 * 1. Default role-based permissions (from ROLE_PERMISSIONS)
 * 2. Direct permission grants from user_permissions table
 * 3. Role-based permissions from custom_roles
 */
export async function hasPermission(
  userId: string,
  permission: Permission,
  role: UserRole,
  options?: {
    resourceType?: string;
    resourceId?: string;
    skipDatabaseCheck?: boolean;
  }
): Promise<SecurityCheckResult> {
  try {
    // Fast path: Check role-based default permissions first
    const rolePermissions = DEFAULT_ROLE_PERMISSIONS[role] || [];

    // Wildcard check for root_admin
    if (rolePermissions.includes('*')) {
      return {
        allowed: true,
        reason: 'Root admin has all permissions',
        layer: 'authorization',
        permission,
      };
    }

    // Check exact permission match in role defaults
    if (rolePermissions.includes(permission)) {
      return {
        allowed: true,
        reason: `Permission granted via ${role} role defaults`,
        layer: 'authorization',
        permission,
      };
    }

    // Check for broader permission (e.g., 'projects.read' covers 'projects.read.own')
    const [resource, action] = permission.split('.');
    const broadPermission = `${resource}.${action}` as Permission;
    if (permission !== broadPermission && rolePermissions.includes(broadPermission)) {
      return {
        allowed: true,
        reason: `Permission granted via broader ${broadPermission} permission`,
        layer: 'authorization',
        permission,
      };
    }

    // Skip database check if requested (for performance in bulk operations)
    if (options?.skipDatabaseCheck) {
      return {
        allowed: false,
        reason: `Permission ${permission} not in role defaults for ${role}`,
        layer: 'authorization',
        permission,
      };
    }

    // Check database for direct grants and custom role permissions
    const { data: hasDbPermission, error } = await supabase.rpc('user_has_permission', {
      p_user_id: userId,
      p_permission_name: permission,
      p_resource_type: options?.resourceType || null,
      p_resource_id: options?.resourceId || null,
    });

    if (error) {
      logger.error('[Security] Permission check error:', error);
      // Fail closed - deny access on error
      return {
        allowed: false,
        reason: `Permission check failed: ${error.message}`,
        layer: 'authorization',
        permission,
      };
    }

    if (hasDbPermission) {
      return {
        allowed: true,
        reason: 'Permission granted via database (direct grant or custom role)',
        layer: 'authorization',
        permission,
      };
    }

    return {
      allowed: false,
      reason: `User lacks ${permission} permission`,
      layer: 'authorization',
      permission,
    };
  } catch (error) {
    logger.error('[Security] Permission check exception:', error);
    // Fail closed
    return {
      allowed: false,
      reason: 'Permission check failed due to exception',
      layer: 'authorization',
      permission,
    };
  }
}

/**
 * Check if user has any of the specified permissions
 */
export async function hasAnyPermission(
  userId: string,
  permissions: Permission[],
  role: UserRole
): Promise<SecurityCheckResult> {
  for (const permission of permissions) {
    const result = await hasPermission(userId, permission, role, { skipDatabaseCheck: true });
    if (result.allowed) {
      return result;
    }
  }

  // Check database for any permission
  for (const permission of permissions) {
    const result = await hasPermission(userId, permission, role);
    if (result.allowed) {
      return result;
    }
  }

  return {
    allowed: false,
    reason: `User lacks any of: ${permissions.join(', ')}`,
    layer: 'authorization',
  };
}

/**
 * Check if user has all of the specified permissions
 */
export async function hasAllPermissions(
  userId: string,
  permissions: Permission[],
  role: UserRole
): Promise<SecurityCheckResult> {
  const results: SecurityCheckResult[] = [];

  for (const permission of permissions) {
    const result = await hasPermission(userId, permission, role);
    results.push(result);
    if (!result.allowed) {
      return {
        allowed: false,
        reason: `User lacks required permission: ${permission}`,
        layer: 'authorization',
        permission,
      };
    }
  }

  return {
    allowed: true,
    reason: 'User has all required permissions',
    layer: 'authorization',
  };
}

// =============================================================================
// ROLE LEVEL CHECKING (Layer 2)
// =============================================================================

/**
 * Get the numeric level for a role
 */
export function getRoleLevel(role: UserRole): number {
  return ROLE_LEVELS[role] || 0;
}

/**
 * Check if user's role meets minimum level requirement
 */
export function checkRoleLevel(
  role: UserRole,
  minLevel: number
): SecurityCheckResult {
  const userLevel = getRoleLevel(role);

  if (userLevel >= minLevel) {
    return {
      allowed: true,
      reason: `Role ${role} (level ${userLevel}) meets minimum (${minLevel})`,
      layer: 'authorization',
    };
  }

  return {
    allowed: false,
    reason: `Role ${role} (level ${userLevel}) below minimum (${minLevel})`,
    layer: 'authorization',
  };
}

/**
 * Check if user has one of the allowed roles
 */
export function checkAllowedRoles(
  role: UserRole,
  allowedRoles: UserRole[]
): SecurityCheckResult {
  if (allowedRoles.includes(role)) {
    return {
      allowed: true,
      reason: `Role ${role} is in allowed roles`,
      layer: 'authorization',
    };
  }

  return {
    allowed: false,
    reason: `Role ${role} not in allowed roles: ${allowedRoles.join(', ')}`,
    layer: 'authorization',
  };
}

// =============================================================================
// RESOURCE OWNERSHIP CHECKING (Layer 3)
// =============================================================================

/**
 * Check if user owns or has access to a resource
 */
export async function checkResourceOwnership(
  userId: string,
  companyId: string | null,
  resourceType: ResourceType,
  resourceId: string,
  allowedScopes: ('own' | 'team' | 'company' | 'all')[] = ['all']
): Promise<OwnershipCheckResult> {
  try {
    // Map resource types to table names
    const tableMap: Record<ResourceType, string> = {
      project: 'projects',
      invoice: 'invoices',
      time_entry: 'time_entries',
      document: 'documents',
      expense: 'expenses',
      estimate: 'estimates',
      contact: 'crm_contacts',
      lead: 'crm_leads',
      user: 'user_profiles',
    };

    const tableName = tableMap[resourceType];
    if (!tableName) {
      return {
        isOwner: false,
        isTeamMember: false,
        isCompanyMember: false,
        hasAccess: false,
        reason: `Unknown resource type: ${resourceType}`,
      };
    }

    // Query resource ownership
    const { data: resource, error } = await supabase
      .from(tableName)
      .select('id, company_id, created_by, assigned_to, project_manager_id')
      .eq('id', resourceId)
      .maybeSingle();

    if (error) {
      logger.error('[Security] Ownership check error:', error);
      return {
        isOwner: false,
        isTeamMember: false,
        isCompanyMember: false,
        hasAccess: false,
        reason: `Ownership check failed: ${error.message}`,
      };
    }

    if (!resource) {
      return {
        isOwner: false,
        isTeamMember: false,
        isCompanyMember: false,
        hasAccess: false,
        reason: 'Resource not found',
      };
    }

    // Check ownership levels
    const isOwner = resource.created_by === userId;
    const isAssignee = resource.assigned_to === userId || resource.project_manager_id === userId;
    const isCompanyMember = companyId && resource.company_id === companyId;

    // Determine access based on allowed scopes
    let hasAccess = false;
    let reason = '';

    if (allowedScopes.includes('all') && isCompanyMember) {
      hasAccess = true;
      reason = 'Access granted: company member with "all" scope';
    } else if (allowedScopes.includes('company') && isCompanyMember) {
      hasAccess = true;
      reason = 'Access granted: company member';
    } else if (allowedScopes.includes('team') && (isAssignee || isOwner)) {
      hasAccess = true;
      reason = 'Access granted: team member or owner';
    } else if (allowedScopes.includes('own') && isOwner) {
      hasAccess = true;
      reason = 'Access granted: resource owner';
    } else {
      reason = `Access denied: user is not ${allowedScopes.join(' or ')}`;
    }

    return {
      isOwner,
      isTeamMember: isAssignee,
      isCompanyMember: !!isCompanyMember,
      hasAccess,
      reason,
    };
  } catch (error) {
    logger.error('[Security] Ownership check exception:', error);
    return {
      isOwner: false,
      isTeamMember: false,
      isCompanyMember: false,
      hasAccess: false,
      reason: 'Ownership check failed due to exception',
    };
  }
}

/**
 * Check company membership (tenant isolation)
 */
export async function checkCompanyAccess(
  userId: string,
  targetCompanyId: string
): Promise<SecurityCheckResult> {
  try {
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('company_id')
      .eq('id', userId)
      .single();

    if (error) {
      return {
        allowed: false,
        reason: `Company access check failed: ${error.message}`,
        layer: 'ownership',
      };
    }

    if (profile?.company_id === targetCompanyId) {
      return {
        allowed: true,
        reason: 'User belongs to the target company',
        layer: 'ownership',
      };
    }

    return {
      allowed: false,
      reason: 'User does not belong to the target company',
      layer: 'ownership',
    };
  } catch (error) {
    logger.error('[Security] Company access check exception:', error);
    return {
      allowed: false,
      reason: 'Company access check failed due to exception',
      layer: 'ownership',
    };
  }
}

// =============================================================================
// COMBINED SECURITY CHECK
// =============================================================================

/**
 * Perform a complete security check (all layers)
 */
export async function performSecurityCheck(options: {
  userId: string;
  role: UserRole;
  companyId: string | null;
  permission?: Permission;
  permissions?: Permission[];
  minRoleLevel?: number;
  allowedRoles?: UserRole[];
  resourceType?: ResourceType;
  resourceId?: string;
  ownershipScopes?: ('own' | 'team' | 'company' | 'all')[];
}): Promise<SecurityCheckResult> {
  const {
    userId,
    role,
    companyId,
    permission,
    permissions,
    minRoleLevel,
    allowedRoles,
    resourceType,
    resourceId,
    ownershipScopes = ['all'],
  } = options;

  // Layer 2: Role level check
  if (minRoleLevel !== undefined) {
    const roleResult = checkRoleLevel(role, minRoleLevel);
    if (!roleResult.allowed) {
      await logSecurityEvent({
        eventType: 'role_insufficient',
        userId,
        action: 'access',
        resource: resourceType || 'unknown',
        resourceId,
        allowed: false,
        reason: roleResult.reason,
      });
      return roleResult;
    }
  }

  // Layer 2: Allowed roles check
  if (allowedRoles && allowedRoles.length > 0) {
    const rolesResult = checkAllowedRoles(role, allowedRoles);
    if (!rolesResult.allowed) {
      await logSecurityEvent({
        eventType: 'role_insufficient',
        userId,
        action: 'access',
        resource: resourceType || 'unknown',
        resourceId,
        allowed: false,
        reason: rolesResult.reason,
      });
      return rolesResult;
    }
  }

  // Layer 2: Permission check (single)
  if (permission) {
    const permResult = await hasPermission(userId, permission, role, {
      resourceType,
      resourceId,
    });
    if (!permResult.allowed) {
      await logSecurityEvent({
        eventType: 'permission_denied',
        userId,
        action: permission,
        resource: resourceType || 'unknown',
        resourceId,
        allowed: false,
        reason: permResult.reason,
      });
      return permResult;
    }
  }

  // Layer 2: Permission check (multiple - all required)
  if (permissions && permissions.length > 0) {
    const permsResult = await hasAllPermissions(userId, permissions, role);
    if (!permsResult.allowed) {
      await logSecurityEvent({
        eventType: 'permission_denied',
        userId,
        action: permissions.join(','),
        resource: resourceType || 'unknown',
        resourceId,
        allowed: false,
        reason: permsResult.reason,
      });
      return permsResult;
    }
  }

  // Layer 3: Resource ownership check
  if (resourceType && resourceId && companyId) {
    const ownershipResult = await checkResourceOwnership(
      userId,
      companyId,
      resourceType,
      resourceId,
      ownershipScopes
    );

    if (!ownershipResult.hasAccess) {
      await logSecurityEvent({
        eventType: 'ownership_denied',
        userId,
        action: 'access',
        resource: resourceType,
        resourceId,
        allowed: false,
        reason: ownershipResult.reason,
      });
      return {
        allowed: false,
        reason: ownershipResult.reason,
        layer: 'ownership',
        resourceType,
        resourceId,
      };
    }
  }

  // All checks passed
  return {
    allowed: true,
    reason: 'All security checks passed',
    layer: 'authorization',
    permission,
    resourceType,
    resourceId,
  };
}

// =============================================================================
// SECURITY AUDIT LOGGING
// =============================================================================

const eventQueue: SecurityAuditEvent[] = [];
let flushTimeout: ReturnType<typeof setTimeout> | null = null;

/**
 * Log a security event
 * Events are batched and flushed periodically for performance
 */
export async function logSecurityEvent(event: SecurityAuditEvent): Promise<void> {
  // Add to queue
  eventQueue.push({
    ...event,
    metadata: {
      ...event.metadata,
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    },
  });

  // Log locally for immediate visibility
  if (!event.allowed) {
    logger.warn('[Security Event]', event.eventType, event);
  } else {
    logger.debug('[Security Event]', event.eventType, event);
  }

  // Schedule flush
  if (!flushTimeout) {
    flushTimeout = setTimeout(flushEventQueue, 5000); // Flush every 5 seconds
  }
}

/**
 * Flush queued security events to database
 */
async function flushEventQueue(): Promise<void> {
  if (eventQueue.length === 0) {
    flushTimeout = null;
    return;
  }

  const eventsToFlush = [...eventQueue];
  eventQueue.length = 0;
  flushTimeout = null;

  try {
    // Log denied events to permission_audit_log
    const deniedEvents = eventsToFlush.filter((e) => !e.allowed);

    if (deniedEvents.length > 0) {
      const auditLogs = deniedEvents.map((event) => ({
        user_id: event.userId,
        action: event.eventType,
        permission_name: event.action,
        resource_type: event.resource,
        resource_id: event.resourceId,
        granted: false,
        reason: event.reason,
        ip_address: event.metadata?.ipAddress as string | undefined,
        user_agent: event.metadata?.userAgent as string | undefined,
      }));

      const { error } = await supabase.from('permission_audit_log').insert(auditLogs);

      if (error) {
        logger.error('[Security] Failed to flush audit logs:', error);
      }
    }
  } catch (error) {
    logger.error('[Security] Flush audit queue exception:', error);
  }
}

// Flush remaining events on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (eventQueue.length > 0) {
      // Use sendBeacon for reliable delivery
      const eventsJson = JSON.stringify(eventQueue);
      navigator.sendBeacon?.('/api/security-audit', eventsJson);
    }
  });
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get all permissions for a user (role defaults + database grants)
 */
export async function getUserPermissions(
  userId: string,
  role: UserRole
): Promise<Permission[]> {
  const rolePermissions = DEFAULT_ROLE_PERMISSIONS[role] || [];

  try {
    const { data, error } = await supabase.rpc('get_user_permissions', {
      p_user_id: userId,
    });

    if (error) {
      logger.error('[Security] Get user permissions error:', error);
      return rolePermissions;
    }

    // Combine role defaults with database permissions
    const dbPermissions = (data || []).map(
      (p: { permission_name: string }) => p.permission_name as Permission
    );

    // Return unique permissions
    return [...new Set([...rolePermissions, ...dbPermissions])];
  } catch (error) {
    logger.error('[Security] Get user permissions exception:', error);
    return rolePermissions;
  }
}

/**
 * Check if a permission string matches a scope
 */
export function permissionMatchesScope(
  permission: Permission,
  scope: 'own' | 'team' | 'all'
): boolean {
  const parts = permission.split('.');
  const permissionScope = parts[2] as 'own' | 'team' | undefined;

  // 'all' scope permissions don't have a third part
  if (!permissionScope) {
    return scope === 'all';
  }

  // Broader scopes include narrower ones
  if (scope === 'all') return true;
  if (scope === 'team' && (permissionScope === 'team' || permissionScope === 'own')) return true;
  if (scope === 'own' && permissionScope === 'own') return true;

  return false;
}
