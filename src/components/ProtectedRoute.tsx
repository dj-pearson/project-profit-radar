import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface RouteGuardProps {
  children: React.ReactNode;
  routePath?: string;
}

export const RouteGuard: React.FC<RouteGuardProps> = ({ children }) => {
  const { user, userProfile, loading } = useAuth();

  // Show loading while auth is being determined
  if (loading) {
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
    return <Navigate to="/auth" replace />;
  }

  // If we have a user but no profile yet, show loading (don't redirect)
  // This prevents the redirect loop when profile is still being fetched
  if (!userProfile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Setting up your account...</p>
        </div>
      </div>
    );
  }

  // Redirect to setup if no company (only after we have both user and profile)
  if (!userProfile.company_id) {
    return <Navigate to="/setup" replace />;
  }

  return <>{children}</>;
};

// Legacy alias for backward compatibility
export const ProtectedRoute = RouteGuard;