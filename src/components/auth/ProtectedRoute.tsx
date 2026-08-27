// NOTE: this module is not currently imported anywhere. The route guard the app
// actually uses is RouteGuard in src/components/ProtectedRoute.tsx, wired up in
// src/routes/appRoutes.tsx. Two guards with the same name is a hazard on its own
// — this one sits under auth/, which reads as the more canonical location — so
// see US-302 for consolidating them. Until then it must at least fail CLOSED.

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

  // Fail closed. This used to read `if (role && !allowedRoles.includes(role))`,
  // which skipped the check entirely when role was null or undefined — a signed-in
  // user whose profile had not loaded, or who had no role at all, passed every
  // role gate.
  if (!role || !allowedRoles.includes(role)) {
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

  // Fail closed, same reasoning as RoleProtectedRoute above: a missing role must
  // not satisfy a role requirement.
  if (!user || !role || !allowedRoles.includes(role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
