import { useAuth } from '@/contexts/AuthContext';

export type UserRole = 'root_admin' | 'admin' | 'project_manager' | 'field_supervisor' | 'office_staff' | 'accounting' | 'client_portal';

export interface Permission {
  resource: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'manage';
  roles: UserRole[];
}

// Define all permissions in the system
export const PERMISSIONS: Permission[] = [
  // Projects
  { resource: 'projects', action: 'create', roles: ['root_admin', 'admin', 'project_manager'] },
  { resource: 'projects', action: 'read', roles: ['root_admin', 'admin', 'project_manager', 'field_supervisor', 'office_staff', 'accounting'] },
  { resource: 'projects', action: 'update', roles: ['root_admin', 'admin', 'project_manager'] },
  { resource: 'projects', action: 'delete', roles: ['root_admin', 'admin'] },
  
  // Daily Reports
  { resource: 'daily_reports', action: 'create', roles: ['root_admin', 'admin', 'project_manager', 'field_supervisor'] },
  { resource: 'daily_reports', action: 'read', roles: ['root_admin', 'admin', 'project_manager', 'field_supervisor', 'office_staff'] },
  { resource: 'daily_reports', action: 'update', roles: ['root_admin', 'admin', 'project_manager', 'field_supervisor'] },
  
  // Change Orders
  { resource: 'change_orders', action: 'create', roles: ['root_admin', 'admin', 'project_manager'] },
  { resource: 'change_orders', action: 'read', roles: ['root_admin', 'admin', 'project_manager', 'accounting'] },
  { resource: 'change_orders', action: 'update', roles: ['root_admin', 'admin', 'project_manager'] },
  
  // Financial Data
  { resource: 'financial', action: 'read', roles: ['root_admin', 'admin', 'project_manager', 'accounting'] },
  { resource: 'financial', action: 'update', roles: ['root_admin', 'admin', 'accounting'] },
  
  // Team Management
  { resource: 'team', action: 'read', roles: ['root_admin', 'admin', 'project_manager'] },
  { resource: 'team', action: 'manage', roles: ['root_admin', 'admin'] },
  
  // Documents
  { resource: 'documents', action: 'create', roles: ['root_admin', 'admin', 'project_manager', 'office_staff'] },
  { resource: 'documents', action: 'read', roles: ['root_admin', 'admin', 'project_manager', 'field_supervisor', 'office_staff'] },
  { resource: 'documents', action: 'update', roles: ['root_admin', 'admin', 'project_manager', 'office_staff'] },
  { resource: 'documents', action: 'delete', roles: ['root_admin', 'admin', 'office_staff'] },
  
  // Safety & Compliance
  { resource: 'safety', action: 'read', roles: ['root_admin', 'admin', 'project_manager', 'field_supervisor'] },
  { resource: 'safety', action: 'manage', roles: ['root_admin', 'admin', 'project_manager'] },
  
  // System Administration
  { resource: 'admin_companies', action: 'manage', roles: ['root_admin'] },
  { resource: 'admin_users', action: 'manage', roles: ['root_admin'] },
  { resource: 'admin_billing', action: 'manage', roles: ['root_admin'] },
  { resource: 'admin_analytics', action: 'read', roles: ['root_admin'] },
  { resource: 'admin_settings', action: 'manage', roles: ['root_admin'] },
  { resource: 'blog_manager', action: 'manage', roles: ['root_admin'] },
  { resource: 'rate_limiting', action: 'manage', roles: ['root_admin'] },
  { resource: 'security_monitoring', action: 'read', roles: ['root_admin'] },
  { resource: 'compliance_audit', action: 'read', roles: ['root_admin', 'admin'] },
  { resource: 'gdpr_compliance', action: 'manage', roles: ['root_admin', 'admin'] },
];

export const usePermissions = () => {
  const { userProfile } = useAuth();

  const hasPermission = (resource: string, action: 'create' | 'read' | 'update' | 'delete' | 'manage'): boolean => {
    if (!userProfile) return false;
    
    // Root admin has all permissions
    if (userProfile.role === 'root_admin') return true;

    const permission = PERMISSIONS.find(p => p.resource === resource && p.action === action);
    return permission ? permission.roles.includes(userProfile.role) : false;
  };

  const hasAnyPermission = (resource: string, actions: ('create' | 'read' | 'update' | 'delete' | 'manage')[]): boolean => {
    return actions.some(action => hasPermission(resource, action));
  };

  const hasRole = (roles: UserRole | UserRole[]): boolean => {
    if (!userProfile) return false;
    const roleArray = Array.isArray(roles) ? roles : [roles];
    return roleArray.includes(userProfile.role);
  };

  const canAccessRoute = (routePath: string): boolean => {
    if (!userProfile) return false;

    // Define route permissions
    const routePermissions: Record<string, UserRole[]> = {
      '/create-project': ['root_admin', 'admin', 'project_manager'],
      '/time-tracking': ['root_admin', 'admin', 'project_manager', 'field_supervisor', 'office_staff'],
      '/daily-reports': ['root_admin', 'admin', 'project_manager', 'field_supervisor'],
      '/change-orders': ['root_admin', 'admin', 'project_manager'],
      '/financial': ['root_admin', 'admin', 'project_manager', 'accounting'],
      '/reports': ['root_admin', 'admin', 'project_manager', 'accounting'],
      '/team': ['root_admin', 'admin', 'project_manager'],
      '/documents': ['root_admin', 'admin', 'project_manager', 'office_staff'],
      '/safety': ['root_admin', 'admin', 'project_manager', 'field_supervisor'],
      '/compliance-audit': ['root_admin', 'admin'],
      '/gdpr-compliance': ['root_admin', 'admin'],
      '/security-monitoring': ['root_admin'],
      '/rate-limiting': ['root_admin'],
      '/admin/companies': ['root_admin'],
      '/admin/users': ['root_admin'],
      '/admin/billing': ['root_admin'],
      '/admin/analytics': ['root_admin'],
      '/admin/settings': ['root_admin'],
      '/admin/seo': ['root_admin'],
      '/blog-manager': ['root_admin'],
    };

    // Root admin can access everything
    if (userProfile.role === 'root_admin') return true;

    const allowedRoles = routePermissions[routePath];
    return allowedRoles ? allowedRoles.includes(userProfile.role) : true; // Default allow if no restriction
  };

  return {
    hasPermission,
    hasAnyPermission,
    hasRole,
    canAccessRoute,
    userRole: userProfile?.role,
    isAuthenticated: !!userProfile,
  };
};