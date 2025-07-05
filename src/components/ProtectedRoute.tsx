import React, { useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface RouteGuardProps {
  children: React.ReactNode;
  routePath?: string;
}

// Global circuit breaker to prevent infinite loops across all instances
let globalRedirectCount = 0;
let lastResetTime = Date.now();
let isCircuitOpen = false;

export const RouteGuard: React.FC<RouteGuardProps> = ({
  children,
  routePath,
}) => {
  const authState = useAuth();
  const { user, userProfile, loading } = authState;
  const [localRedirectCount, setLocalRedirectCount] = useState(0);
  const [forceLoading, setForceLoading] = useState(false);
  const [emergencyMode, setEmergencyMode] = useState(false);
  const lastRenderTime = useRef(Date.now());
  const renderCount = useRef(0);
  const accessGrantedLogged = useRef(false);

  // Reset global circuit breaker every 30 seconds
  useEffect(() => {
    const now = Date.now();
    if (now - lastResetTime > 30000) {
      globalRedirectCount = 0;
      lastResetTime = now;
      isCircuitOpen = false;
    }
  }, []);

  // Detect rapid re-renders (sign of infinite loop)
  useEffect(() => {
    const now = Date.now();
    renderCount.current++;

    if (now - lastRenderTime.current < 100) {
      // More than 10 renders per second = infinite loop
      if (renderCount.current > 10) {
        console.error(
          "Infinite render loop detected, activating recovery mode"
        );
        setEmergencyMode(true);
        setForceLoading(true);

        // Force a 2-second delay before any action
        setTimeout(() => {
          setForceLoading(false);
          if (user && !userProfile) {
            // Force page reload to clear state
            window.location.reload();
          }
        }, 2000);
      }
    } else {
      renderCount.current = 0;
    }

    lastRenderTime.current = now;
  });

  // Emergency circuit breaker - only count actual redirects
  const incrementRedirectCount = () => {
    globalRedirectCount++;

    if (globalRedirectCount > 5) {
      console.error("Redirect limit reached, opening circuit breaker");
      isCircuitOpen = true;

      // Force emergency reload after delay
      setTimeout(() => {
        console.log("Force reloading page to clear state");
        window.location.href = "/auth";
      }, 3000);
    }
  };

  // Reset access granted log when user changes
  useEffect(() => {
    accessGrantedLogged.current = false;
  }, [user?.id]);

  // Circuit breaker is open - force loading state
  if (isCircuitOpen || emergencyMode || forceLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg border-2 border-red-200">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-red-500" />
          <h2 className="text-xl font-bold text-red-700 mb-2">Recovery Mode</h2>
          <p className="text-red-600 mb-4">Resolving authentication issue...</p>
        </div>
      </div>
    );
  }

  // Show loading while auth state is being determined
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-construction-orange" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // If no user, redirect with circuit breaker protection
  if (!user) {
    if (localRedirectCount >= 2) {
      console.error("Local redirect limit reached, forcing auth page");
      window.location.href = "/auth";
      return null;
    }

    console.log("No user found, redirecting to auth");
    incrementRedirectCount();
    setLocalRedirectCount((prev) => prev + 1);
    return <Navigate to="/auth" replace />;
  }

  // If user exists but no profile, handle carefully
  if (!userProfile) {
    if (localRedirectCount >= 1) {
      console.error("Profile not loaded, forcing page refresh");
      window.location.reload();
      return null;
    }

    console.log("User exists but no profile, redirecting to auth");
    incrementRedirectCount();
    setLocalRedirectCount((prev) => prev + 1);
    return <Navigate to="/auth" replace />;
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
    console.log("Invalid role, redirecting to auth");
    incrementRedirectCount();
    return <Navigate to="/auth" replace />;
  }

  // Success - allow access (log only once per session)
  if (!accessGrantedLogged.current) {
    console.log("Access granted for role:", userProfile.role);
    accessGrantedLogged.current = true;
  }

  // Reset counters on successful access (only if needed to prevent re-renders)
  if (globalRedirectCount > 0) {
    globalRedirectCount = 0;
  }
  if (localRedirectCount > 0) {
    setLocalRedirectCount(0);
  }

  return <>{children}</>;
};

// Legacy alias for backward compatibility
export const ProtectedRoute = RouteGuard;
