import React, { useEffect, useRef, useState } from "react";
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
  const [redirectCount, setRedirectCount] = useState(0);
  const [isStableLoading, setIsStableLoading] = useState(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastStateRef = useRef<string>("");

  // Create a stable loading state to prevent race conditions
  useEffect(() => {
    const currentState = `${!!user}-${!!userProfile}-${loading}`;

    if (currentState !== lastStateRef.current) {
      lastStateRef.current = currentState;
      setIsStableLoading(true);

      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set a minimum loading time to prevent rapid state changes
      timeoutRef.current = setTimeout(() => {
        setIsStableLoading(false);
      }, 500);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [user, userProfile, loading]);

  // Emergency redirect limit to prevent infinite loops
  useEffect(() => {
    if (redirectCount >= 3) {
      console.error("RouteGuard: Too many redirects, forcing auth page");
      window.location.href = "/auth";
      return;
    }
  }, [redirectCount]);

  // Log current state for debugging
  useEffect(() => {
    console.log("RouteGuard FIXED VERSION - State:", {
      routePath,
      hasUser: !!user,
      hasProfile: !!userProfile,
      profileRole: userProfile?.role || "none",
      loading,
      isStableLoading,
      redirectCount,
    });
  }, [user, userProfile, loading, isStableLoading, redirectCount, routePath]);

  // Show loading while auth state is being determined
  if (loading || isStableLoading) {
    console.log("RouteGuard: Loading auth state, showing spinner");
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-construction-orange" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // If no user, redirect to auth
  if (!user) {
    console.log("RouteGuard: No user, redirecting to auth");
    setRedirectCount((prev) => prev + 1);
    return <Navigate to="/auth" replace />;
  }

  // If user exists but no profile, wait or redirect based on attempts
  if (!userProfile) {
    console.log(
      "RouteGuard: User exists but no profile, redirect attempt:",
      redirectCount
    );
    if (redirectCount < 2) {
      setRedirectCount((prev) => prev + 1);
      return <Navigate to="/auth" replace />;
    } else {
      // Force hard refresh to clear any cached state
      console.error("RouteGuard: Profile fetch failed, forcing page refresh");
      window.location.reload();
      return null;
    }
  }

  // Check user role permissions
  const allowedRoles = [
    "root_admin",
    "admin",
    "project_manager",
    "field_supervisor",
    "office_staff",
    "accounting",
    "client_portal",
  ];

  if (!allowedRoles.includes(userProfile.role)) {
    console.log("RouteGuard: Invalid role, redirecting to auth");
    return <Navigate to="/auth" replace />;
  }

  // Success - allow access
  console.log("RouteGuard: Access granted for role:", userProfile.role);
  return <>{children}</>;
};

// Legacy alias for backward compatibility
export const ProtectedRoute = RouteGuard;
