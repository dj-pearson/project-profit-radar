/**
 * Session monitoring: a periodic validity check, the 30-minute inactivity
 * sign-out, and the expiry path both of them end in.
 */
import { useCallback, useEffect, useRef } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { useToast } from "@/hooks/use-toast";
import { clearRememberedRoute } from "@/lib/routeMemory";
import { clearSentryUser } from "@/lib/sentry";
import { setErrorLoggingUser } from "@/services/errorLoggingService";
import { logger } from "@/lib/logger";
import { PROFILE_STORAGE_PREFIX } from "./profile";
import { getWindowLocation } from "./windowLocation";

type Toast = ReturnType<typeof useToast>["toast"];

// Session monitoring constants
const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const SESSION_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

interface Options {
  session: Session | null;
  toast: Toast;
  /** Clears user, session, profile and the in-memory profile cache. Must be stable. */
  clearAuthState: () => void;
}

export function useSessionMonitoring({ session, toast, clearAuthState }: Options) {
  const sessionTimeoutRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const inactivityTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear all session-related state and redirect to auth
  const handleSessionExpired = useCallback(async (reason: string = 'Session expired') => {
    logger.debug(`Auth session expired: ${reason}`);

    // Clear timeouts
    if (sessionTimeoutRef.current) {
      clearTimeout(sessionTimeoutRef.current);
      sessionTimeoutRef.current = null;
    }
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
      inactivityTimeoutRef.current = null;
    }

    // Clear all state
    clearAuthState();

    // Clear Sentry user context
    clearSentryUser();
    setErrorLoggingUser(null);

    // SECURITY: Clear both localStorage and sessionStorage
    try {
      // Clear localStorage auth tokens
      const localKeys = Object.keys(localStorage);
      localKeys.forEach(key => {
        if (key.startsWith('sb-') && key.includes('-auth-token')) {
          localStorage.removeItem(key);
        }
      });

      // Clear sessionStorage user profiles
      const sessionKeys = Object.keys(sessionStorage);
      sessionKeys.forEach(key => {
        if (key.startsWith(PROFILE_STORAGE_PREFIX)) {
          sessionStorage.removeItem(key);
        }
      });

      // Clear route memory on session expiry
      clearRememberedRoute();
    } catch (error) {
      logger.error('Error clearing storage:', error);
    }

    // Sign out from Supabase
    try {
      await supabase.auth.signOut();
    } catch (error) {
      logger.error('Error signing out:', error);
    }

    // Only redirect if not already on auth page to prevent redirect loops
    const location = getWindowLocation();
    if (location) {
      const currentPath = location.pathname;
      const isOnAuthPage = currentPath === '/auth' || currentPath === '/login' || currentPath === '/reset-password';

      if (!isOnAuthPage) {
        // Show toast notification only when redirecting
        toast({
          title: "Session Expired",
          description: "Your session has expired. Please sign in again.",
          variant: "destructive",
          duration: 5000,
        });
        location.href = '/auth';
      } else {
        logger.debug('Already on auth page, skipping redirect');
      }
    }
  }, [toast, clearAuthState]);

  // Monitor session validity
  const checkSessionValidity = useCallback(async () => {
    if (!session) return;

    try {
      const { data: { session: currentSession }, error } = await supabase.auth.getSession();

      if (error || !currentSession) {
        logger.debug('Session check failed:', error?.message || 'No session');
        await handleSessionExpired('Session validation failed');
        return;
      }

      // Check if token is expired
      const now = Math.floor(Date.now() / 1000);
      if (currentSession.expires_at && currentSession.expires_at <= now) {
        logger.debug('Token expired');
        await handleSessionExpired('Token expired');
        return;
      }

      // No refreshSession() here (US-356). The client runs with
      // autoRefreshToken, and getSession() above renews an expiring token
      // itself. Forcing a rotation every five minutes from every tab raced
      // GoTrue's refresh-token reuse detection: two tabs presenting the same
      // token, one of them rejected, and the user signed out.

    } catch (error) {
      logger.error('Session validity check error:', error);
      await handleSessionExpired('Session check error');
    }
  }, [session, handleSessionExpired]);

  // Setup session monitoring
  const setupSessionMonitoring = useCallback(() => {
    if (!session) return;

    // Clear existing timeouts
    if (sessionTimeoutRef.current) {
      clearTimeout(sessionTimeoutRef.current);
    }
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
    }

    // Start periodic session validation
    sessionTimeoutRef.current = setInterval(() => {
      checkSessionValidity();
    }, SESSION_CHECK_INTERVAL);

    // Setup inactivity timeout
    const resetInactivityTimer = () => {
      lastActivityRef.current = Date.now();

      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
      }

      inactivityTimeoutRef.current = setTimeout(() => {
        handleSessionExpired('User inactivity');
      }, INACTIVITY_TIMEOUT);
    };

    // Track user activity
    const handleActivity = () => resetInactivityTimer();

    ACTIVITY_EVENTS.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Initial reset
    resetInactivityTimer();

    // Cleanup function
    return () => {
      if (sessionTimeoutRef.current) {
        clearInterval(sessionTimeoutRef.current);
        sessionTimeoutRef.current = null;
      }
      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
        inactivityTimeoutRef.current = null;
      }
      ACTIVITY_EVENTS.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, [session, checkSessionValidity, handleSessionExpired]);

  /** Stop both timers (on SIGNED_OUT). */
  const stopMonitoringTimers = useCallback(() => {
    if (sessionTimeoutRef.current) {
      clearInterval(sessionTimeoutRef.current);
      sessionTimeoutRef.current = null;
    }
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
      inactivityTimeoutRef.current = null;
    }
  }, []);

  /** Stop both timers when the provider unmounts. */
  const clearMonitoringTimersOnUnmount = useCallback(() => {
    if (sessionTimeoutRef.current) {
      clearInterval(sessionTimeoutRef.current);
    }
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
    }
  }, []);

  return {
    handleSessionExpired,
    setupSessionMonitoring,
    stopMonitoringTimers,
    clearMonitoringTimersOnUnmount,
  };
}

/**
 * Runs the monitoring while a session and user are present. A separate hook
 * so the provider can register it after its auth-listener effect, the order
 * the effects have always run in.
 */
export function useSessionMonitoringEffect(
  session: Session | null,
  user: User | null,
  setupSessionMonitoring: () => (() => void) | undefined,
): void {
  useEffect(() => {
    let cleanup: (() => void) | undefined;

    if (session && user) {
      cleanup = setupSessionMonitoring();
    }

    return cleanup;
  }, [session, user, setupSessionMonitoring]);
}
