import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions, UserRole } from '@/hooks/usePermissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Shield } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: UserRole[];
  requireAuth?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRoles, 
  requireAuth = true 
}) => {
  const { userProfile, loading } = useAuth();
  const { hasRole, canAccessRoute } = usePermissions();

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  // Redirect to auth if not authenticated and auth is required
  if (requireAuth && !userProfile) {
    return <Navigate to="/auth" replace />;
  }

  // Check role-based access
  if (requiredRoles && userProfile && !hasRole(requiredRoles)) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Shield className="h-16 w-16 text-destructive" />
            </div>
            <CardTitle className="text-destructive">Access Denied</CardTitle>
            <CardDescription>
              You don't have permission to access this page
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Your current role: <span className="font-medium">{userProfile.role}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Required roles: {requiredRoles.join(', ')}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};

interface RouteGuardProps {
  children: React.ReactNode;
  routePath: string;
}

export const RouteGuard: React.FC<RouteGuardProps> = ({ children, routePath }) => {
  const { userProfile, loading, user } = useAuth();

  console.log('RouteGuard check:', { routePath, userProfile: userProfile?.role, loading, hasUser: !!user });

  if (loading) {
    console.log('RouteGuard: Still loading, showing spinner');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  // If user is authenticated but no profile, allow access (profile will load async)
  if (!userProfile && !user) {
    console.log('RouteGuard: No user profile and no authenticated user, redirecting to auth');
    return <Navigate to="/auth" replace />;
  }

  // Root admin has access to everything - no restrictions
  if (userProfile?.role === 'root_admin') {
    console.log('RouteGuard: Root admin detected, allowing access');
    return <>{children}</>;
  }

  // If user is authenticated but profile is still loading, allow access
  if (user && !userProfile) {
    console.log('RouteGuard: User authenticated but profile loading, allowing access');
    return <>{children}</>;
  }

  // For other roles, check permissions
  const { canAccessRoute } = usePermissions();
  
  if (!canAccessRoute(routePath)) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <AlertTriangle className="h-16 w-16 text-destructive" />
            </div>
            <CardTitle className="text-destructive">Access Restricted</CardTitle>
            <CardDescription>
              This page is not available for your current role
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground">
              Current role: <span className="font-medium">{userProfile.role}</span>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};