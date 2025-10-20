import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

interface RoleGuardProps {
  allowedRoles: string[];
  children: React.ReactNode;
  redirectTo?: string;
  showToast?: boolean;
}

/**
 * Component wrapper that enforces role-based access control
 * Redirects unauthorized users and optionally shows a toast message
 */
export function RoleGuard({
  allowedRoles,
  children,
  redirectTo = '/dashboard',
  showToast = true
}: RoleGuardProps) {
  const { userProfile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && userProfile) {
      if (!allowedRoles.includes(userProfile.role)) {
        if (showToast) {
          toast({
            variant: "destructive",
            title: "Access Denied",
            description: "You don't have permission to access this page.",
          });
        }
        navigate(redirectTo, { replace: true });
      }
    }
  }, [userProfile, loading, allowedRoles, navigate, redirectTo, showToast]);

  // Show nothing while checking permissions
  if (loading) {
    return null;
  }

  // Only render children if user has required role
  if (userProfile && allowedRoles.includes(userProfile.role)) {
    return <>{children}</>;
  }

  return null;
}

/**
 * Hook for role-based access control in functional components
 */
export function useRoleCheck(allowedRoles: string[]): {
  hasAccess: boolean;
  isLoading: boolean;
  checkAccess: () => boolean;
} {
  const { userProfile, loading } = useAuth();

  const checkAccess = () => {
    if (!userProfile) return false;
    return allowedRoles.includes(userProfile.role);
  };

  return {
    hasAccess: checkAccess(),
    isLoading: loading,
    checkAccess
  };
}

/**
 * Common role groups for convenience
 */
export const ROLE_GROUPS = {
  // Can view project details
  PROJECT_VIEWERS: ['root_admin', 'admin', 'project_manager', 'field_supervisor', 'office_staff', 'accounting'],

  // Can create/edit projects
  PROJECT_EDITORS: ['root_admin', 'admin', 'project_manager'],

  // Can create/view daily reports
  DAILY_REPORT_ACCESS: ['root_admin', 'admin', 'project_manager', 'field_supervisor'],

  // Can create/approve change orders
  CHANGE_ORDER_ACCESS: ['root_admin', 'admin', 'project_manager'],

  // Can view financial data
  FINANCIAL_VIEWERS: ['root_admin', 'admin', 'project_manager', 'accounting'],

  // Can edit financial data
  FINANCIAL_EDITORS: ['root_admin', 'admin', 'accounting'],

  // Can manage team
  TEAM_MANAGERS: ['root_admin', 'admin', 'project_manager'],

  // Can access admin features
  ADMINS: ['root_admin', 'admin'],

  // Root admin only (multi-tenant access)
  ROOT_ADMIN: ['root_admin'],

  // All authenticated users
  ALL_USERS: ['root_admin', 'admin', 'project_manager', 'field_supervisor', 'office_staff', 'accounting', 'client_portal'],
};
