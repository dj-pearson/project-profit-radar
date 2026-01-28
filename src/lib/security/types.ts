/**
 * Security Layer Types
 *
 * Defense-in-Depth Security Architecture:
 *
 * Layer 1: Authentication (WHO are you?)
 *   - requireAuth, protectedRoute middleware
 *   - Validates JWT/session is valid
 *
 * Layer 2: Authorization (WHAT can you do?)
 *   - requirePermission('projects.read')
 *   - Role level checks (roleLevel >= 5)
 *
 * Layer 3: Resource Ownership (IS this yours?)
 *   - Tenant filtering (tenantId = user's tenantId)
 *   - Owner checks (createdBy = userId for "own" access)
 *
 * Layer 4: Database RLS (FINAL enforcement)
 *   - Row-level security policies in PostgreSQL
 *   - Even if code has bugs, DB rejects unauthorized
 */

// =============================================================================
// ROLE DEFINITIONS
// =============================================================================

export type UserRole =
  | 'root_admin'
  | 'admin'
  | 'project_manager'
  | 'field_supervisor'
  | 'office_staff'
  | 'accounting'
  | 'client_portal';

/**
 * Role hierarchy levels - higher number = more privileges
 */
export const ROLE_LEVELS: Record<UserRole, number> = {
  root_admin: 100,
  admin: 80,
  project_manager: 60,
  field_supervisor: 40,
  office_staff: 30,
  accounting: 30,
  client_portal: 10,
} as const;

/**
 * Role display names
 */
export const ROLE_DISPLAY_NAMES: Record<UserRole, string> = {
  root_admin: 'Root Administrator',
  admin: 'Administrator',
  project_manager: 'Project Manager',
  field_supervisor: 'Field Supervisor',
  office_staff: 'Office Staff',
  accounting: 'Accounting',
  client_portal: 'Client Portal',
} as const;

// =============================================================================
// PERMISSION DEFINITIONS
// =============================================================================

/**
 * Permission format: resource.action[.scope]
 *
 * Resources: projects, invoices, time_entries, documents, users, reports, settings
 * Actions: read, write, delete, admin, export, approve, send
 * Scopes: own, team, all (optional - defaults to 'all')
 */
export type Permission =
  // Project permissions
  | 'projects.read'
  | 'projects.read.own'
  | 'projects.read.team'
  | 'projects.write'
  | 'projects.write.own'
  | 'projects.delete'
  | 'projects.admin'
  // Invoice permissions
  | 'invoices.read'
  | 'invoices.read.own'
  | 'invoices.write'
  | 'invoices.write.own'
  | 'invoices.delete'
  | 'invoices.send'
  | 'invoices.approve'
  // Time entry permissions
  | 'time_entries.read'
  | 'time_entries.read.own'
  | 'time_entries.read.team'
  | 'time_entries.write'
  | 'time_entries.write.own'
  | 'time_entries.approve'
  // Document permissions
  | 'documents.read'
  | 'documents.write'
  | 'documents.delete'
  // User management permissions
  | 'users.read'
  | 'users.write'
  | 'users.delete'
  // Report permissions
  | 'reports.read'
  | 'reports.export'
  // Settings permissions
  | 'settings.read'
  | 'settings.write'
  // Expense permissions
  | 'expenses.read'
  | 'expenses.read.own'
  | 'expenses.write'
  | 'expenses.write.own'
  | 'expenses.approve'
  // CRM permissions
  | 'crm.read'
  | 'crm.write'
  | 'crm.delete'
  // Estimate permissions
  | 'estimates.read'
  | 'estimates.write'
  | 'estimates.delete'
  | 'estimates.approve'
  // Schedule permissions
  | 'schedule.read'
  | 'schedule.write'
  // Equipment permissions
  | 'equipment.read'
  | 'equipment.write'
  // Safety permissions
  | 'safety.read'
  | 'safety.write'
  // Wildcard for admin
  | '*';

/**
 * Default permissions per role
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  root_admin: ['*'],
  admin: [
    'projects.read', 'projects.write', 'projects.delete', 'projects.admin',
    'invoices.read', 'invoices.write', 'invoices.delete', 'invoices.send', 'invoices.approve',
    'time_entries.read', 'time_entries.write', 'time_entries.approve',
    'documents.read', 'documents.write', 'documents.delete',
    'users.read', 'users.write', 'users.delete',
    'reports.read', 'reports.export',
    'settings.read', 'settings.write',
    'expenses.read', 'expenses.write', 'expenses.approve',
    'crm.read', 'crm.write', 'crm.delete',
    'estimates.read', 'estimates.write', 'estimates.delete', 'estimates.approve',
    'schedule.read', 'schedule.write',
    'equipment.read', 'equipment.write',
    'safety.read', 'safety.write',
  ],
  project_manager: [
    'projects.read', 'projects.write',
    'invoices.read', 'invoices.write', 'invoices.send',
    'time_entries.read', 'time_entries.write', 'time_entries.approve',
    'documents.read', 'documents.write',
    'users.read',
    'reports.read', 'reports.export',
    'expenses.read', 'expenses.write', 'expenses.approve',
    'crm.read', 'crm.write',
    'estimates.read', 'estimates.write',
    'schedule.read', 'schedule.write',
    'equipment.read',
    'safety.read', 'safety.write',
  ],
  field_supervisor: [
    'projects.read',
    'time_entries.read', 'time_entries.read.team', 'time_entries.write', 'time_entries.write.own',
    'documents.read', 'documents.write',
    'reports.read',
    'expenses.read.own', 'expenses.write.own',
    'schedule.read',
    'equipment.read',
    'safety.read', 'safety.write',
  ],
  office_staff: [
    'projects.read',
    'invoices.read', 'invoices.write',
    'time_entries.read',
    'documents.read', 'documents.write',
    'reports.read',
    'expenses.read', 'expenses.write',
    'crm.read', 'crm.write',
    'estimates.read',
    'schedule.read',
  ],
  accounting: [
    'projects.read',
    'invoices.read', 'invoices.write', 'invoices.send', 'invoices.approve',
    'time_entries.read', 'time_entries.approve',
    'documents.read',
    'reports.read', 'reports.export',
    'expenses.read', 'expenses.write', 'expenses.approve',
    'estimates.read', 'estimates.approve',
  ],
  client_portal: [
    'projects.read.own',
    'invoices.read.own',
    'documents.read',
    'schedule.read',
  ],
} as const;

// =============================================================================
// SECURITY CONTEXT
// =============================================================================

export interface SecurityContext {
  /** User ID from Supabase auth */
  userId: string;
  /** User's role */
  role: UserRole;
  /** User's company/tenant ID */
  companyId: string | null;
  /** Computed role level */
  roleLevel: number;
  /** User's effective permissions (role + direct grants) */
  permissions: Permission[];
  /** Whether security context is loaded */
  isLoaded: boolean;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
}

// =============================================================================
// RESOURCE OWNERSHIP
// =============================================================================

export type ResourceType =
  | 'project'
  | 'invoice'
  | 'time_entry'
  | 'document'
  | 'expense'
  | 'estimate'
  | 'contact'
  | 'lead'
  | 'user';

export interface ResourceOwnership {
  resourceType: ResourceType;
  resourceId: string;
  ownerId: string;
  companyId: string;
  teamIds?: string[];
  createdBy?: string;
}

export interface OwnershipCheckResult {
  isOwner: boolean;
  isTeamMember: boolean;
  isCompanyMember: boolean;
  hasAccess: boolean;
  reason: string;
}

// =============================================================================
// SECURITY CHECK RESULTS
// =============================================================================

export interface SecurityCheckResult {
  allowed: boolean;
  reason: string;
  layer: 'authentication' | 'authorization' | 'ownership' | 'rls';
  permission?: Permission;
  resourceType?: ResourceType;
  resourceId?: string;
}

export interface SecurityViolation {
  timestamp: Date;
  userId: string | null;
  action: string;
  resource: string;
  reason: string;
  ipAddress?: string;
  userAgent?: string;
}

// =============================================================================
// AUDIT LOGGING
// =============================================================================

export type SecurityEventType =
  | 'permission_check'
  | 'permission_denied'
  | 'permission_granted'
  | 'ownership_check'
  | 'ownership_denied'
  | 'authentication_required'
  | 'session_expired'
  | 'role_insufficient'
  | 'resource_access_denied';

export interface SecurityAuditEvent {
  eventType: SecurityEventType;
  userId: string | null;
  action: string;
  resource: string;
  resourceId?: string;
  allowed: boolean;
  reason: string;
  metadata?: Record<string, unknown>;
}

// =============================================================================
// ROUTE PROTECTION
// =============================================================================

export interface RouteSecurityConfig {
  /** Require authentication (Layer 1) */
  requireAuth?: boolean;
  /** Required permissions (Layer 2) */
  permissions?: Permission[];
  /** Required roles (Layer 2) */
  allowedRoles?: UserRole[];
  /** Minimum role level (Layer 2) */
  minRoleLevel?: number;
  /** Resource ownership check (Layer 3) */
  ownershipCheck?: {
    resourceType: ResourceType;
    resourceIdParam: string; // URL param name containing resource ID
    allowedScopes: ('own' | 'team' | 'company' | 'all')[];
  };
  /** Fallback redirect path */
  redirectTo?: string;
  /** Custom unauthorized component */
  unauthorizedComponent?: React.ComponentType;
}

// =============================================================================
// API SECURITY
// =============================================================================

export interface ApiSecurityHeaders {
  'X-Request-ID': string;
  'X-User-ID': string;
  'X-Company-ID': string;
  'X-Role': UserRole;
}

export interface SecureApiRequest {
  userId: string;
  companyId: string;
  role: UserRole;
  permissions: Permission[];
  ipAddress: string;
  userAgent: string;
}
