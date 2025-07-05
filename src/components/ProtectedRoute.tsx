import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface RouteGuardProps {
  children: React.ReactNode;
  routePath?: string;
}

export const RouteGuard: React.FC<RouteGuardProps> = ({ children, routePath }) => {
  const { user, userProfile, loading } = useAuth();

  // Debug excessive calls
  useEffect(() => {
    console.log('RouteGuard render:', { 
      hasUser: !!user, 
      hasProfile: !!userProfile, 
      loading, 
      routePath 
    });
  }, [user, userProfile, loading, routePath]);

  // Show loading while auth is being determined
  if (loading) {
    console.log('RouteGuard: Loading auth state');
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Only redirect if we're absolutely sure there's no user
  if (!user) {
    console.log('RouteGuard: No user, redirecting to auth');
    return <Navigate to="/auth" replace />;
  }

  // If we have a user but no profile yet, show loading (don't redirect)
  if (!userProfile) {
    console.log('RouteGuard: No user profile, waiting...');
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Setting up your account...</p>
        </div>
      </div>
    );
  }

  // Redirect to setup if no company
  if (!userProfile.company_id) {
    console.log('RouteGuard: No company, redirecting to setup');
    return <Navigate to="/setup" replace />;
  }

  console.log('RouteGuard: Access granted');
  return <>{children}</>;
};

// Legacy alias for backward compatibility
export const ProtectedRoute = RouteGuard;