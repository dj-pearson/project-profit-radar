import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { gtag } from "@/hooks/useGoogleAnalytics";
import { clearRememberedRoute } from "@/lib/routeMemory";
import { clearSentryUser } from "@/lib/sentry";
import { setErrorLoggingUser } from "@/services/errorLoggingService";
import { logger } from "@/lib/logger";
import { purgeSupabaseSessionStorage } from "@/lib/supabaseStorage";
import { useSupabaseSessionResume } from "@/hooks/useSupabaseSessionResume";
import { useStructuralState } from "@/hooks/useStructuralState";
import {
  checkLoginAttempt,
  recordFailedLogin,
  clearFailedAttempts,
  getLockoutMessage,
} from "@/lib/security/loginProtection";
import {
  registerSession,
  checkSessionLimit,
} from "@/lib/security/sessionManagement";
import type {
  AuthActions,
  AuthContextType,
  AuthState,
  OTPType,
  SendOTPOptions,
  UserProfile,
  VerifyOTPOptions,
  VerifyOTPResult,
} from "@/contexts/auth/types";
import {
  fetchUserProfile as fetchProfile,
  readStoredProfile,
  useProfileTelemetry,
} from "@/contexts/auth/profile";
import { useSessionMonitoring, useSessionMonitoringEffect } from "@/contexts/auth/useSessionMonitoring";
import {
  discardAbandonedMfaSession,
  isAbandonedMfaSession,
  useMfaGate,
} from "@/contexts/auth/useMfaGate";
import { createOAuthSignIn } from "@/contexts/auth/oauth";
import {
  requestPasswordReset,
  resendAuthOtp,
  resetPasswordWithOtp,
  sendAuthOtp,
  signUpWithOtp,
  verifyAuthOtp,
  type SignUpUserData,
} from "@/contexts/auth/otpApi";
import { getWindowLocation } from "@/contexts/auth/windowLocation";
// Site-resolver removed - single-tenant architecture
import type { ReactNode, FC } from "react";

// The pieces of the provider live in ./auth/: types, profile fetching and
// cache (profile.ts), session monitoring, the MFA gate (US-346), OAuth and
// the OTP edge-function calls. This file keeps the contexts, the hooks that
// read them, and the provider that wires the pieces to its state.

// US-219: one context carrying everything made every useAuth() consumer
// re-render on each token refresh. The slices below change independently;
// AuthContext still carries the merged value so useAuth() is unchanged.
const AuthContext = createContext<AuthContextType | undefined>(undefined);
const AuthStateContext = createContext<AuthState | undefined>(undefined);
const AuthSessionContext = createContext<Session | null | undefined>(undefined);
const AuthActionsContext = createContext<AuthActions | undefined>(undefined);

// Export types for use in components
export type { OTPType, SendOTPOptions, VerifyOTPOptions, VerifyOTPResult, AuthState, AuthActions };
export type { MfaChallenge } from "@/contexts/auth/types";

function useRequired<T>(ctx: React.Context<T | undefined>, hook: string): T {
  const context = useContext(ctx);
  if (context === undefined) {
    throw new Error(`${hook} must be used within an AuthProvider`);
  }
  return context;
}

/** Everything. Re-renders on any auth change, including each token refresh. */
export const useAuth = () => useRequired(AuthContext, "useAuth");

/**
 * user, userProfile, loading and mfaChallenge. Does not re-render on a token
 * refresh: the user object keeps its identity while its data is unchanged.
 */
export const useAuthState = () => useRequired(AuthStateContext, "useAuthState");

/** The current Session; changes on every token refresh. */
export const useAuthSession = () => useRequired(AuthSessionContext, "useAuthSession");

/** signIn, signOut, refreshProfile and the rest. Never re-renders. */
export const useAuthActions = () => useRequired(AuthActionsContext, "useAuthActions");

export const AuthProvider: FC<{ children: ReactNode }> = ({ children }) => {
  // user and userProfile keep their identity when a token refresh or a
  // profile refetch hands back equal data (US-219); session always updates.
  const [user, setUser] = useStructuralState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useStructuralState<UserProfile | null>(null);
  // Removed: siteId and siteConfig - single-tenant architecture
  const [loading, setLoading] = useState(true);
  const [profileFetching, setProfileFetching] = useState(false);
  const [isProfileFetchInProgress, setIsProfileFetchInProgressState] = useState(false);
  // The auth listener is registered once, at mount, so it must read these
  // through refs; as plain state it saw their mount-time values forever
  // (US-356): userProfile always null, a fetch never "in progress".
  const profileFetchInProgressRef = useRef(false);
  const setIsProfileFetchInProgress = useCallback((v: boolean) => {
    profileFetchInProgressRef.current = v;
    setIsProfileFetchInProgressState(v);
  }, []);
  const userProfileRef = useRef<UserProfile | null>(null);
  // Read by updateProfile/refreshProfile so they stay stable (US-219).
  const userRef = useRef<User | null>(null);
  const { toast } = useToast();

  // On Capacitor-native, refresh the Supabase session whenever the app
  // returns to the foreground - otherwise a backgrounded app silently 401s
  // on the first request after the access token's 1 h TTL elapses.
  useSupabaseSessionResume();

  const successfulProfiles = useRef<Map<string, UserProfile>>(new Map());
  useEffect(() => {
    userProfileRef.current = userProfile;
  }, [userProfile]);
  // Assigned during render, not in an effect: a child's effect runs before
  // this provider's, and must not call refreshProfile against a stale user.
  userRef.current = user;

  // Removed: Site initialization - single-tenant architecture

  const clearAuthState = useCallback(() => {
    setUser(null);
    setSession(null);
    setUserProfile(null);
    successfulProfiles.current.clear();
  }, [setUser, setUserProfile]);

  const {
    handleSessionExpired,
    setupSessionMonitoring,
    stopMonitoringTimers,
    clearMonitoringTimersOnUnmount,
  } = useSessionMonitoring({ session, toast, clearAuthState });

  // Fetch user profile with retry logic
  const fetchUserProfile = useCallback(
    (userId: string): Promise<UserProfile | null> =>
      fetchProfile(userId, { toast, setProfileFetching }),
    []
  );

  // US-346: while the gate is raised, auth events are stashed instead of
  // applied, so a password-only session cannot reach the app.
  const mfa = useMfaGate({
    setSession,
    setUser,
    setUserProfile,
    setLoading,
    setIsProfileFetchInProgress,
    fetchUserProfile,
    successfulProfiles,
  });

  // Handle auth state changes
  useEffect(() => {
    logger.debug("Initializing authentication...");

    // Get initial session with error handling
    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        // Handle auth service errors (503, network failures, etc.)
        if (error) {
          logger.error("Auth initialization error:", error);
          toast({
            title: "Authentication Service Issue",
            description: "Unable to connect to authentication service. Some features may be limited.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        logger.debug("Initial session:", session?.user?.id || "none");

        // A session left behind by an MFA challenge that was never finished
        // (reload, closed tab) has not passed MFA. Sign it out (US-346).
        if (isAbandonedMfaSession(session)) {
          discardAbandonedMfaSession();
          setSession(null);
          setUser(null);
          setUserProfile(null);
          setLoading(false);
          return;
        }

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Check cache first for instant access
          const cachedProfile = successfulProfiles.current.get(session.user.id);
          if (cachedProfile) {
            logger.debug("Initial session: Using cached profile");
            setUserProfile(cachedProfile);
            setLoading(false);
            return;
          }

          // SECURITY: Check sessionStorage profile cache (more secure than localStorage)
          try {
            const parsed = readStoredProfile(session.user.id);
            if (parsed) {
              logger.debug("Initial session: Using validated stored profile (will refresh in background)");
              setUserProfile(parsed);
              successfulProfiles.current.set(parsed.id, parsed);

              // Always refresh profile from DB once per session to avoid stale company/role data
              setIsProfileFetchInProgress(true);
              fetchUserProfile(session.user.id)
                .then((fresh) => {
                  if (fresh) {
                    logger.debug("Background profile refresh completed", {
                      role: fresh.role,
                      company_id: fresh.company_id,
                    });
                    setUserProfile(fresh);
                    successfulProfiles.current.set(fresh.id, fresh);
                  }
                })
                .catch((err) => {
                  logger.error("Background profile refresh failed:", err);
                })
                .finally(() => {
                  setIsProfileFetchInProgress(false);
                });

              setLoading(false);
              return;
            }
          } catch { /* ignore: non-critical, best-effort */ }

          // Check current profile
          if (userProfileRef.current?.id === session.user.id) {
            logger.debug(
              "Initial session: Profile already exists, skipping fetch"
            );
            setLoading(false);
            return;
          }

          // Fetch profile for initial session
          logger.debug("Initial session: Fetching profile for user");
          setIsProfileFetchInProgress(true);
          fetchUserProfile(session.user.id)
            .then((profile) => {
              if (profile) {
                setUserProfile(profile);
                successfulProfiles.current.set(profile.id, profile);
                logger.debug("Initial profile loaded successfully");
              } else {
                setUserProfile(null);
                logger.warn("Initial profile fetch failed");
              }
            })
            .catch((error) => {
              logger.error("Initial profile fetch error:", error);
              setUserProfile(null);
            })
            .finally(() => {
              setLoading(false);
              setIsProfileFetchInProgress(false);
            });
        } else {
          setUserProfile(null);
          successfulProfiles.current.clear(); // Clear cache when signing out
          setLoading(false);
        }
      })
      .catch((error) => {
        // Handle network errors (503, connection failures, etc.)
        logger.error("Auth initialization network error:", error);
        toast({
          title: "Connection Error",
          description: "Unable to reach authentication service. Please check your connection and try refreshing the page.",
          variant: "destructive",
        });
        setLoading(false);
      });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      logger.debug("Auth state change:", event, session?.user?.id || "none");

      // Handle session expiration or token errors
      if (event === 'TOKEN_REFRESHED' && !session) {
        logger.debug('Token refresh failed, session expired');
        await handleSessionExpired('Token refresh failed');
        return;
      }

      if (event === 'SIGNED_OUT') {
        logger.debug('User signed out');
        // Clear monitoring when signed out
        stopMonitoringTimers();
      }

      // Check if this is a password recovery session (web only)
      const location = getWindowLocation();
      if (location) {
        const urlParams = new URLSearchParams(location.search);
        const hashParams = new URLSearchParams(location.hash.substring(1));
        const type = urlParams.get('type') || hashParams.get('type');

        // If this is a password recovery session, handle it specially
        if (type === 'recovery' && session?.user) {
          logger.debug("Password recovery session detected in auth state change");
          setSession(session);
          setUser(session.user);
          setLoading(false);

          // Don't fetch profile for password recovery - redirect using React Router for SEO
          if (location.pathname === '/auth') {
            // Use setTimeout to avoid redirect during render cycle
            setTimeout(() => {
              location.href = `/reset-password${location.search}${location.hash}`;
            }, 100);
          }
          return;
        }
      }

      // US-346: hold a session that has not passed MFA.
      if (mfa.holdsSession(session)) return;

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        // Only fetch profile if we don't have one or the user changed
        const newUserId = session.user.id;

        // Check cache first for instant access
        const cachedProfile = successfulProfiles.current.get(newUserId);
        if (cachedProfile) {
          logger.debug("Using cached profile for user, skipping fetch");
          setUserProfile(cachedProfile);
          setLoading(false);
          return;
        }

        // If profile fetch is in progress, wait
        if (profileFetchInProgressRef.current) {
          logger.debug("Profile fetch already in progress, waiting...");
          return;
        }

        // If current profile matches user, keep it
        if (userProfileRef.current?.id === newUserId) {
          logger.debug("Profile already loaded for user, skipping fetch");
          setLoading(false);
          return;
        }

        // Fetch profile for new user
        logger.debug("Fetching profile for user:", newUserId);
        setLoading(true);
        setIsProfileFetchInProgress(true);

        try {
          const profile = await fetchUserProfile(session.user.id);

          if (profile) {
            setUserProfile(profile);
            successfulProfiles.current.set(profile.id, profile);
            logger.debug("Profile loaded successfully, user ready");
          } else {
            logger.warn("Profile fetch failed, user may have limited access");
            setUserProfile(null);
          }
        } catch (error) {
          logger.error("Profile fetch failed:", error);
          setUserProfile(null);
        } finally {
          setLoading(false);
          setIsProfileFetchInProgress(false);
        }
      } else {
        setUserProfile(null);
        successfulProfiles.current.clear(); // Clear cache when signing out
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
      // Cleanup session monitoring
      clearMonitoringTimersOnUnmount();
    };
  }, []); // Removed fetchUserProfile from deps to prevent infinite loop

  // Setup session monitoring when session changes
  useSessionMonitoringEffect(session, user, setupSessionMonitoring);

  // Ensure loading remains true while profile is being fetched
  // But don't get stuck if profile fetch failed and we're not actively fetching
  const effectiveLoading = Boolean(
    loading ||
    profileFetching ||
    (user && !userProfile && isProfileFetchInProgress)
  );

  // Log authentication state changes and update Sentry user context
  useProfileTelemetry(user, userProfile);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      logger.debug("Signing in...");
      setLoading(true);

      // SECURITY: Check if login attempt is allowed (brute force protection)
      const attemptCheck = await checkLoginAttempt(email);
      if (!attemptCheck.allowed) {
        logger.warn("Login blocked due to account lockout");
        setLoading(false);
        return { error: getLockoutMessage(attemptCheck) };
      }

      // Raise the MFA gate before the SIGNED_IN event can fire (US-346).
      mfa.raiseGate();

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        mfa.lowerGate();
        logger.error("Sign in error:", error);
        // SECURITY: Record failed login attempt
        const failResult = await recordFailedLogin(email);
        setLoading(false);

        // Return lockout message if account is now locked
        if (!failResult.allowed) {
          return { error: getLockoutMessage(failResult) };
        }

        // Add warning about remaining attempts if low
        const warningMessage = failResult.message
          ? `${error.message}. ${failResult.message}`
          : error.message;
        return { error: warningMessage };
      }

      // SECURITY: Clear failed attempts on successful login
      if (data.user) {
        await clearFailedAttempts(data.user.id);

        // SECURITY: Enforce concurrent session limits and register new session
        await checkSessionLimit(data.user.id);
        if (data.session?.access_token) {
          await registerSession(data.user.id, data.session.access_token.slice(0, 64));
        }
      }

      if (data.user && data.session) {
        const early = await mfa.challengeOrRelease(data.user, data.session);
        if (early) return early;
      } else {
        mfa.lowerGate();
      }

      logger.debug("Sign in successful");
      gtag.trackAuth('login', 'email');
      return {};
    } catch (error) {
      logger.error("Sign in exception:", error);
      if (mfa.isGateRaised()) await mfa.abandonSignIn();
      setLoading(false);
      return { error: "An unexpected error occurred" };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- the MFA gate's functions only touch refs and stable setters
  }, []);

  const signInWithGoogle = useMemo(() => createOAuthSignIn('google', setLoading), []);
  const signInWithApple = useMemo(() => createOAuthSignIn('apple', setLoading), []);

  // Sign up using our custom edge function (bypasses Supabase's email)
  const signUp = useCallback(
    async (email: string, password: string, userData?: SignUpUserData): Promise<{ error?: string; userId?: string; expiresInMinutes?: number }> => {
      logger.debug("AuthContext: Signing up via OTP flow...");
      setLoading(true);
      const result = await signUpWithOtp(email, password, userData);
      setLoading(false);
      return result;
    },
    []
  );

  const signOut = useCallback(async () => {
    try {
      logger.debug("AuthContext: Starting sign out...");
      setLoading(true);

      // Sign out from Supabase first
      const { error } = await supabase.auth.signOut();
      if (error) {
        logger.error("AuthContext: Supabase signOut error:", error);
      }

      // Scrub any stray auth tokens from BOTH localStorage and
      // @capacitor/preferences. supabase.auth.signOut() resolves optimistically
      // while offline, so without this an attacker with the device could
      // reinstate the session from leftover Preferences data.
      await purgeSupabaseSessionStorage();

      // Clear all state
      clearAuthState();

      // Clear Sentry user context
      clearSentryUser();
      setErrorLoggingUser(null);

      // Clear route memory on sign out
      clearRememberedRoute();

      gtag.trackAuth('logout');
      logger.debug("AuthContext: Sign out completed");

    } catch (error) {
      logger.error("AuthContext: Sign out error:", error);
      // Still clear state on error - including the stored tokens
      await purgeSupabaseSessionStorage().catch(() => {});
      clearAuthState();
      clearSentryUser();
      setErrorLoggingUser(null);
      clearRememberedRoute();
    } finally {
      setLoading(false);
    }
  }, [clearAuthState]);

  const updateProfile = useCallback(
    async (updates: Partial<UserProfile>) => {
      const user = userRef.current;
      if (!user) return;

      try {
        const { error } = await supabase
          .from("user_profiles")
          .update(updates)
          .eq("id", user.id);

        if (error) throw error;

        setUserProfile((prev) => (prev ? { ...prev, ...updates } : null));
      } catch (error) {
        logger.error("FIXED AuthContext: Update profile error:", error);
        throw error;
      }
    },
    [setUserProfile]
  );

  const refreshProfile = useCallback(async () => {
    const user = userRef.current;
    if (!user) return;

    try {
      const profile = await fetchUserProfile(user.id);
      setUserProfile(profile);
    } catch (error) {
      logger.error("FIXED AuthContext: Refresh profile error:", error);
    }
  }, [fetchUserProfile, setUserProfile]);

  const { completeMfaChallenge, cancelMfaChallenge, mfaChallenge } = mfa;

  const actions = useMemo<AuthActions>(
    () => ({
      signIn,
      signInWithGoogle,
      signInWithApple,
      signUp,
      signOut,
      resetPassword: requestPasswordReset,
      resetPasswordWithOTP: resetPasswordWithOtp,
      updateProfile,
      refreshProfile,
      completeMfaChallenge,
      cancelMfaChallenge,
      sendOTP: sendAuthOtp,
      verifyOTP: verifyAuthOtp,
      resendOTP: resendAuthOtp,
    }),
    [
      signIn,
      signInWithGoogle,
      signInWithApple,
      signUp,
      signOut,
      updateProfile,
      refreshProfile,
      completeMfaChallenge,
      cancelMfaChallenge,
    ]
  );

  const state = useMemo<AuthState>(
    () => ({ user, userProfile, loading: effectiveLoading, mfaChallenge }),
    [user, userProfile, effectiveLoading, mfaChallenge]
  );

  const value = useMemo<AuthContextType>(
    () => ({ ...state, session, ...actions }),
    [state, session, actions]
  );

  return (
    <AuthActionsContext.Provider value={actions}>
      <AuthSessionContext.Provider value={session}>
        <AuthStateContext.Provider value={state}>
          <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
        </AuthStateContext.Provider>
      </AuthSessionContext.Provider>
    </AuthActionsContext.Provider>
  );
};
