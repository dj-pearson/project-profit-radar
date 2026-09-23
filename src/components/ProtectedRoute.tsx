import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { rememberCurrentRoute } from "@/lib/routeMemory";
import { logger } from "@/lib/logger";
import type { ReactNode, FC } from "react";
import { PROFILE_FETCH_TIMEOUT_MS } from '@/lib/auth/timing';
import { toast } from "sonner";
import {
  getUnauthorizedRedirect,
  hasRouteAccess,
  type UserRole,
} from "@/config/routeConfig";

interface RouteGuardProps {
  children: ReactNode;
  /** Path to check against ROUTE_ACCESS; defaults to the current pathname. */
  routePath?: string;
  /**
   * A route a client_portal user may open (US-350). Everything else sends
   * them to /client-portal: the contractor dashboard, projects and invoices
   * are not theirs, even where RLS would show them an empty list.
   */
  portalScoped?: boolean;
}

/** Maximum redirects allowed within the reset window before tripping the breaker. */
const MAX_REDIRECTS = 5;
/** Window in ms after which the redirect counter resets. */
const RESET_WINDOW_MS = 30_000;

let redirectCount = 0;
let windowStart = Date.now();

function trackRedirect(): boolean {
  const now = Date.now();
  if (now - windowStart > RESET_WINDOW_MS) {
    redirectCount = 0;
    windowStart = now;
  }
  redirectCount++;
  if (redirectCount > MAX_REDIRECTS) {
    logger.error("Redirect loop detected – circuit breaker tripped");
    return false; // breaker tripped
  }
  return true; // redirect allowed
}

export const RouteGuard: FC<RouteGuardProps> = ({ children, routePath, portalScoped = false }) => {
  const { user, userProfile, loading } = useAuth();
  const location = useLocation();
  const [profileWaitExpired, setProfileWaitExpired] = useState(false);

  // Reset redirect counter when auth stabilises
  useEffect(() => {
    if (user && userProfile && !loading) {
      redirectCount = 0;
    }
  }, [user, userProfile, loading]);

  // Give the profile as long as its fetch is allowed to take
  useEffect(() => {
    if (user && !userProfile && !loading) {
      // Same limit as the fetch itself, so the guard never gives up on a
      // fetch that can still succeed (US-356).
      const timer = setTimeout(() => setProfileWaitExpired(true), PROFILE_FETCH_TIMEOUT_MS);
      return () => clearTimeout(timer);
    }
    setProfileWaitExpired(false);
  }, [user, userProfile, loading]);

  // --- render ---

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

  // No user → redirect to auth (with circuit-breaker protection)
  if (!user) {
    rememberCurrentRoute(location);
    if (!trackRedirect()) {
      return (
        <RecoveryUI message="Too many redirects detected." />
      );
    }
    return <Navigate to="/auth" replace />;
  }

  // User exists but profile hasn't loaded yet
  if (!userProfile) {
    if (!profileWaitExpired) {
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
    logger.warn("User profile not loaded after timeout – redirecting to auth");
    rememberCurrentRoute(location);
    if (!trackRedirect()) {
      return <RecoveryUI message="Unable to load your profile." />;
    }
    return <Navigate to="/auth" replace />;
  }

  // Check role
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
    if (!trackRedirect()) {
      return <RecoveryUI message="Your account role is not authorised." />;
    }
    return <Navigate to="/auth" replace />;
  }

  if (userProfile.role === "client_portal") {
    if (!portalScoped) {
      return <Navigate to="/client-portal" replace />;
    }
    return <>{children}</>;
  }

  // Per-route roles (US-302). ROUTE_ACCESS in src/config/routeConfig.ts is
  // the one table; a route it does not list stays open to every signed-in
  // role, as all RouteGuard routes were before it was enforced.
  const role = userProfile.role as UserRole;
  const path = routePath ?? location.pathname;
  if (!hasRouteAccess(path, role)) {
    if (!trackRedirect()) {
      return <RecoveryUI message="Your role does not have access to this page." />;
    }
    return <AccessDenied path={path} role={role} />;
  }

  return <>{children}</>;
};

/**
 * Sends a role that opened a route it may not use back to its home, and says
 * why, so the user lands somewhere real instead of on a blank page.
 */
function AccessDenied({ path, role }: { path: string; role: UserRole }) {
  const home = getUnauthorizedRedirect(role);
  useEffect(() => {
    logger.warn(`Route access denied: ${role} at ${path}`);
    toast.error("You don't have access to that page", {
      id: "route-access-denied",
      description: `Your role (${role.replace(/_/g, " ")}) can't open ${path}. Ask a company admin if you need it.`,
    });
  }, [path, role]);
  return <Navigate to={home} replace state={{ accessDenied: path }} />;
}

/** Minimal recovery UI shown when the circuit breaker trips. */
function RecoveryUI({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-red-50">
      <div className="text-center p-8 bg-white rounded-lg shadow-lg border-2 border-red-200 max-w-md">
        <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-red-500" />
        <h2 className="text-xl font-bold text-red-700 mb-2">Recovery Mode</h2>
        <p className="text-red-600 mb-4">{message}</p>
        <a
          href="/auth"
          className="inline-block px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Re-authenticate
        </a>
      </div>
    </div>
  );
}

// Legacy alias for backward compatibility
export const ProtectedRoute = RouteGuard;
