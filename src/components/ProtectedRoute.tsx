import React, { memo } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface RouteGuardProps {
  children: React.ReactNode;
  routePath?: string;
}

const RouteGuardComponent: React.FC<RouteGuardProps> = ({ children }) => {
  const { user, userProfile, loading } = useAuth();

  console.log('RouteGuard render:', { 
    hasUser: !!user, 
    userId: user?.id,
    hasProfile: !!userProfile, 
    profileRole: userProfile?.role,
    loading 
  });

  // Show loading while auth is being determined OR while we have a user but no profile yet
  if (loading || (user && !userProfile)) {
    console.log('RouteGuard: Showing loading state');
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">
            {loading ? "Loading..." : "Setting up your account..."}
          </p>
        </div>
      </div>
    );
  }

  // Only redirect to auth if we're sure there's no user AND not loading
  if (!user) {
    console.log('RouteGuard: No user, redirecting to auth');
    return <Navigate to="/auth" replace />;
  }

  // At this point we have both user and userProfile
  // Redirect to setup if no company
  if (!userProfile?.company_id) {
    console.log('RouteGuard: No company ID, redirecting to setup');
    return <Navigate to="/setup" replace />;
  }

  console.log('RouteGuard: Access granted');
  return <>{children}</>;
};

// Memoize to prevent unnecessary re-renders
export const RouteGuard = memo(RouteGuardComponent);

// Legacy alias for backward compatibility
export const ProtectedRoute = RouteGuard;