import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { PageLoading } from '@/components/loading/LoadingSpinner';

/**
 * Route wrapper that requires authentication
 */
export function ProtectedRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <PageLoading message="Checking authentication..." />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <Outlet />;
}

/**
 * Route wrapper that requires specific roles
 */
interface RoleProtectedRouteProps {
  allowedRoles: string[];
}

export function RoleProtectedRoute({ allowedRoles }: RoleProtectedRouteProps) {
  const { user, role, isLoading } = useAuth();

  if (isLoading) {
    return <PageLoading message="Verifying permissions..." />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (role && !allowedRoles.includes(role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}

/**
 * Component wrapper that hides content if not authorized
 */
interface RequirePermissionProps {
  allowedRoles: string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RequirePermission({
  allowedRoles,
  children,
  fallback = null,
}: RequirePermissionProps) {
  const { user, role, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (!user || (role && !allowedRoles.includes(role))) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
