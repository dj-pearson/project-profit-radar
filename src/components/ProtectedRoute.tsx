import React, { useEffect, useRef } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface RouteGuardProps {
  children: React.ReactNode;
  routePath?: string;
}

export const RouteGuard: React.FC<RouteGuardProps> = ({
  children,
  routePath,
}) => {
  const authState = useAuth();
  const { user, userProfile, loading } = authState;
  const redirectedRef = useRef(false);
  const lastStateRef = useRef({ user: null, userProfile: null, loading: true });

  // Debug logging to track state changes
  useEffect(() => {
    const currentState = {
      user: !!user,
      userProfile: userProfile?.role || "undefined",
      loading,
    };
    const lastState = lastStateRef.current;

    if (
      currentState.user !== !!lastState.user ||
      currentState.userProfile !==
        (lastState.userProfile?.role || "undefined") ||
      currentState.loading !== lastState.loading
    ) {
      console.log("RouteGuard check:", {
        routePath,
        userProfile: userProfile?.role || "undefined",
        loading,
        hasUser: !!user,
        hasCompany: !!userProfile?.company_id,
      });

      lastStateRef.current = { user, userProfile, loading };
    }
  }, [user, userProfile, loading, routePath]);

  // Show loading while auth is being determined
  if (loading) {
    console.log("RouteGuard: Loading auth state");
    redirectedRef.current = false;
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Critical fix: If we have a user but no profile, AND we haven't already redirected,
  // wait for profile to load instead of redirecting
  if (user && !userProfile && !redirectedRef.current) {
    console.log("RouteGuard: User authenticated, waiting for profile...");
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Setting up your account...</p>
        </div>
      </div>
    );
  }

  // Only redirect to auth if we're absolutely sure there's no user
  if (!user) {
    if (!redirectedRef.current) {
      console.log("RouteGuard: No user, redirecting to auth");
      redirectedRef.current = true;
      return <Navigate to="/auth" replace />;
    }
    return null; // Prevent multiple redirects
  }

  // At this point we should have both user and userProfile
  if (userProfile) {
    // Check for root admin access
    if (userProfile.role === "root_admin") {
      console.log("RouteGuard: Root admin detected, allowing access");
      redirectedRef.current = false;
      return <>{children}</>;
    }

    // Redirect to setup if no company for non-root admins
    if (!userProfile.company_id) {
      if (!redirectedRef.current) {
        console.log("RouteGuard: No company, redirecting to setup");
        redirectedRef.current = true;
        return <Navigate to="/setup" replace />;
      }
      return null;
    }

    // All checks passed, allow access
    console.log("RouteGuard: Access granted");
    redirectedRef.current = false;
    return <>{children}</>;
  }

  // Fallback: if we somehow get here, show loading
  console.log("RouteGuard: Fallback loading state");
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Please wait...</p>
      </div>
    </div>
  );
};

// Legacy alias for backward compatibility
export const ProtectedRoute = RouteGuard;
