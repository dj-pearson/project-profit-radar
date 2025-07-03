import React from 'react';
import { usePermissions, UserRole } from '@/hooks/usePermissions';

interface PermissionGateProps {
  children: React.ReactNode;
  resource?: string;
  action?: 'create' | 'read' | 'update' | 'delete' | 'manage';
  roles?: UserRole[];
  fallback?: React.ReactNode;
  requireAll?: boolean; // If true, requires all conditions; if false, requires any condition
}

export const PermissionGate: React.FC<PermissionGateProps> = ({
  children,
  resource,
  action,
  roles,
  fallback = null,
  requireAll = false
}) => {
  const { hasPermission, hasRole, isAuthenticated } = usePermissions();

  if (!isAuthenticated) {
    return <>{fallback}</>;
  }

  const conditions: boolean[] = [];

  // Check resource permission
  if (resource && action) {
    conditions.push(hasPermission(resource, action));
  }

  // Check role permission
  if (roles) {
    conditions.push(hasRole(roles));
  }

  // If no conditions specified, default to authenticated
  if (conditions.length === 0) {
    return <>{children}</>;
  }

  // Apply logic based on requireAll flag
  const hasAccess = requireAll 
    ? conditions.every(condition => condition)
    : conditions.some(condition => condition);

  return hasAccess ? <>{children}</> : <>{fallback}</>;
};

// Convenience components for common use cases
export const AdminOnly: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({ 
  children, 
  fallback = null 
}) => (
  <PermissionGate roles={['root_admin', 'admin']} fallback={fallback}>
    {children}
  </PermissionGate>
);

export const RootAdminOnly: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({ 
  children, 
  fallback = null 
}) => (
  <PermissionGate roles={['root_admin']} fallback={fallback}>
    {children}
  </PermissionGate>
);

export const ProjectManagerAndUp: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({ 
  children, 
  fallback = null 
}) => (
  <PermissionGate roles={['root_admin', 'admin', 'project_manager']} fallback={fallback}>
    {children}
  </PermissionGate>
);

export const FieldStaffAndUp: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({ 
  children, 
  fallback = null 
}) => (
  <PermissionGate 
    roles={['root_admin', 'admin', 'project_manager', 'field_supervisor']} 
    fallback={fallback}
  >
    {children}
  </PermissionGate>
);