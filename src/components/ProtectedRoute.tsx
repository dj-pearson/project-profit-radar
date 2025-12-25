import { useEffect, useRef, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { rememberCurrentRoute } from "@/lib/routeMemory";
import type { ReactNode, FC } from "react";

interface RouteGuardProps {
  children: ReactNode;
  routePath?: string;
}

// Global circuit breaker to prevent infinite loops across all instances
let globalRedirectCount = 0;
let lastResetTime = Date.now();
let isCircuitOpen = false;

export const RouteGuard: FC<RouteGuardProps> = ({ children, routePath }) => {
  const authState = useAuth();
  const { user, userProfile, loading } = authState;
  const location = useLocation();
  // SECURITY FIX: Use ref instead of state to prevent setState during render
  const localRedirectCountRef = useRef(0);
  const [forceLoading, setForceLoading] = useState(false);
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [profileWaitTime, setProfileWaitTime] = useState(0);
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
  }, []); // Empty dependency array to prevent infinite loop

  // Emergency circuit breaker - only count actual redirects
  const incrementRedirectCount = () => {
    globalRedirectCount++;
    localRedirectCountRef.current++;

    if (globalRedirectCount > 5) {
      console.error("Redirect limit reached, opening circuit breaker");
      isCircuitOpen = true;

      // Force emergency reload after delay
      setTimeout(() => {
        window.location.href = "/auth";
      }, 3000);
    }
  };

  // Reset access granted log when user changes
  useEffect(() => {
    accessGrantedLogged.current = false;
  }, [user?.id]);

  // Reset local redirect count when auth state stabilizes
  useEffect(() => {
    if (user && userProfile && !loading) {
      // Auth is stable, reset counters
      localRedirectCountRef.current = 0;
      if (globalRedirectCount > 0) {
        globalRedirectCount = 0;
      }
    }
  }, [user, userProfile, loading]);

  // Profile wait timer for authenticated users without profiles
  useEffect(() => {
    if (user && !userProfile && !loading) {
      const timer = setTimeout(() => {
        setProfileWaitTime((prev) => prev + 1);
      }, 2000); // Wait 2 seconds before considering profile fetch failed

      return () => clearTimeout(timer);
    } else {
      // Reset wait time when user changes or profile loads
      setProfileWaitTime(0);
    }
  }, [user, userProfile, loading]);

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
    // Remember current route before redirecting
    rememberCurrentRoute(location);

    if (localRedirectCountRef.current >= 2) {
      console.error("Local redirect limit reached, forcing auth page");
      window.location.href = "/auth";
      return null;
    }

    incrementRedirectCount();
    return <Navigate to="/auth" replace />;
  }

  // If user exists but no profile, give time for profile to load
  if (!userProfile) {
    // Don't redirect immediately - profile might still be loading
    // Only redirect if we've waited a reasonable amount of time

    if (profileWaitTime < 3) {
      // Still waiting for profile to load
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-construction-orange" />
            <p className="text-muted-foreground">Loading profile...</p>
          </div>
        </div>
      );
    }

    // Profile failed to load after waiting
    if (localRedirectCountRef.current >= 1) {
      console.error("Profile not loaded after waiting, forcing page refresh");
      window.location.reload();
      return null;
    }

    // Remember current route before redirecting
    rememberCurrentRoute(location);
    incrementRedirectCount();
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
    incrementRedirectCount();
    return <Navigate to="/auth" replace />;
  }

  // Success - allow access (log only once per session)
  if (!accessGrantedLogged.current) {
    accessGrantedLogged.current = true;
  }

  return <>{children}</>;
};

// Legacy alias for backward compatibility
export const ProtectedRoute = RouteGuard;
