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
import { z } from "zod";
import { supabase, getEdgeFunctionUrl, supabaseAnonKey } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { gtag } from "@/hooks/useGoogleAnalytics";
import { clearRememberedRoute } from "@/lib/routeMemory";
import { setSentryUser, clearSentryUser } from "@/lib/sentry";
import { setErrorLoggingUser } from "@/services/errorLoggingService";
import { logger } from "@/lib/logger";
import { purgeSupabaseSessionStorage } from "@/lib/supabaseStorage";
import { useSupabaseSessionResume } from "@/hooks/useSupabaseSessionResume";
import { checkMfaRequired, markMfaPending, readDeviceId, readMfaPending } from "@/lib/auth/mfaChallenge";
import { LEGAL_TERMS_VERSION } from "@/lib/legal/termsVersion";
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
// Site-resolver removed - single-tenant architecture
import type { ReactNode, FC } from "react";

// Platform-safe window location helpers
const isWeb = typeof window !== "undefined";
const getWindowLocation = () => {
  if (isWeb && typeof window !== "undefined") {
    return window.location;
  }
  return null;
};

interface UserProfile {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  company_id?: string;
  role:
    | "root_admin"
    | "admin"
    | "project_manager"
    | "field_supervisor"
    | "office_staff"
    | "accounting"
    | "client_portal";
  is_active: boolean;
}

// SECURITY: Zod schema for validating cached user profile data
// This prevents type confusion and injection attacks from tampered sessionStorage
const UserProfileSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email().max(255),
  first_name: z.string().max(100).optional().nullable(),
  last_name: z.string().max(100).optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  company_id: z.string().uuid().optional().nullable(),
  role: z.enum([
    "root_admin",
    "admin",
    "project_manager",
    "field_supervisor",
    "office_staff",
    "accounting",
    "client_portal",
  ]),
  is_active: z.boolean(),
});

// OTP types for email verification flows
// No 'invite_user': send-auth-otp no longer accepts it (US-339). Invites go
// through invite-team-member, which authenticates the inviter.
type OTPType =
  | 'confirm_signup'
  | 'magic_link'
  | 'change_email'
  | 'reset_password'
  | 'reauthentication';

interface SendOTPOptions {
  email: string;
  type: OTPType;
  recipientName?: string;
  newEmail?: string;
  inviterName?: string;
  inviterUserId?: string;
  companyId?: string;
  companyName?: string;
  metadata?: Record<string, unknown>;
}

interface VerifyOTPOptions {
  email: string;
  otpCode: string;
  type: OTPType;
  password?: string;
  firstName?: string;
  lastName?: string;
}

interface VerifyOTPResult {
  success: boolean;
  verified?: boolean;
  emailConfirmed?: boolean;
  userCreated?: boolean;
  emailChanged?: boolean;
  passwordReset?: boolean;
  canResetPassword?: boolean;
  reauthenticated?: boolean;
  userId?: string;
  newEmail?: string;
  // SECURITY (US-131): the magic_link flow returns only a short-lived, single-use
  // token hash — never raw access/refresh JWTs. The client exchanges it via
  // supabase.auth.verifyOtp({ token_hash, type: 'magiclink' }).
  tokenHash?: string;
  error?: string;
}

/** A signed-in session held back until its MFA code is verified (US-346). */
export interface MfaChallenge {
  userId: string;
  email: string | null;
  accessToken: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string; mfaRequired?: boolean }>;
  signInWithGoogle: () => Promise<{ error?: string }>;
  signInWithApple: () => Promise<{ error?: string }>;
  signUp: (
    email: string,
    password: string,
    userData?: { first_name?: string; last_name?: string; terms_accepted?: boolean }
  ) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
  // MFA challenge after password sign-in (US-346). While set, the session
  // exists but user, session and userProfile stay null.
  mfaChallenge: MfaChallenge | null;
  completeMfaChallenge: () => Promise<void>;
  cancelMfaChallenge: () => Promise<void>;
  // OTP-based authentication methods
  sendOTP: (options: SendOTPOptions) => Promise<{ error?: string; expiresInMinutes?: number }>;
  verifyOTP: (options: VerifyOTPOptions) => Promise<VerifyOTPResult>;
  resendOTP: (options: SendOTPOptions) => Promise<{ error?: string; expiresInMinutes?: number }>;
  resetPasswordWithOTP: (email: string, otpCode: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Export types for use in components
export type { OTPType, SendOTPOptions, VerifyOTPOptions, VerifyOTPResult };

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  // Removed: siteId and siteConfig - single-tenant architecture
  const [loading, setLoading] = useState(true);
  const [profileFetching, setProfileFetching] = useState(false);
  const [isProfileFetchInProgress, setIsProfileFetchInProgress] = useState(false);
  const { toast } = useToast();

  // On Capacitor-native, refresh the Supabase session whenever the app
  // returns to the foreground — otherwise a backgrounded app silently 401s
  // on the first request after the access token's 1 h TTL elapses.
  useSupabaseSessionResume();

  const successfulProfiles = useRef<Map<string, UserProfile>>(new Map());
  // US-346: while mfaGateRef is set, auth events are stashed instead of
  // applied, so a password-only session cannot reach the app.
  const [mfaChallenge, setMfaChallenge] = useState<MfaChallenge | null>(null);
  const mfaGateRef = useRef(false);
  const pendingSessionRef = useRef<Session | null>(null);
  const sessionTimeoutRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const inactivityTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Session monitoring constants
  const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  const SESSION_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

  // Removed: Site initialization - single-tenant architecture

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
    setUser(null);
    setSession(null);
    setUserProfile(null);
    successfulProfiles.current.clear();

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
        if (key.startsWith('bd.userProfile.')) {
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
  }, [toast]);

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

      // Check if refresh token is valid by trying to refresh
      if (currentSession.refresh_token) {
        try {
          const { error: refreshError } = await supabase.auth.refreshSession({
            refresh_token: currentSession.refresh_token
          });
          
          if (refreshError) {
            logger.debug('Refresh token invalid:', refreshError.message);
            await handleSessionExpired('Refresh token invalid');
            return;
          }
        } catch (refreshError) {
          logger.debug('Refresh failed:', refreshError);
          await handleSessionExpired('Token refresh failed');
          return;
        }
      }

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
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    const handleActivity = () => resetInactivityTimer();

    activityEvents.forEach(event => {
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
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, [session, checkSessionValidity, handleSessionExpired]);

  // A session with no user_profiles row (US-357). This used to be read as
  // "account deleted": sign out, "please sign up again". It is really what an
  // SSO/OAuth user hits when handle_new_user fails, or anyone after a partial
  // signup. ensure_user_profile() creates the caller's minimal profile with no
  // company, and the app routes a company-less user to /setup. Sign-out is
  // kept for the one case it fits: the auth user itself is gone.
  const recoverMissingProfile = async (): Promise<UserProfile | null> => {
    logger.warn("No user_profiles row for this session; creating a minimal one");
    type UntypedRpc = (fn: string) => Promise<{ data: unknown; error: { code?: string; message: string } | null }>;
    const { data: ensured, error: ensureError } = await (supabase.rpc as unknown as UntypedRpc)('ensure_user_profile');
    if (!ensureError && ensured) {
      return ensured as UserProfile;
    }

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user) {
      await supabase.auth.signOut();
      toast({
        title: "Account not found",
        description: "This account no longer exists. Please sign up again.",
        variant: "destructive",
      });
      return null;
    }

    logger.error("Could not create a missing profile:", ensureError);
    toast({
      title: "We couldn't finish setting up your account",
      description: "Please reload the page. If this keeps happening, contact support.",
      variant: "destructive",
    });
    return null;
  };

  // Fetch user profile with retry logic
  const fetchUserProfile = useCallback(
    async (userId: string, retryCount = 0): Promise<UserProfile | null> => {
      try {
        logger.debug(`Fetching profile for user: ${userId}`);
        setProfileFetching(true);

        // Add timeout to prevent hanging
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error("Profile fetch timeout")), 10000);
        });

        const fetchPromise = supabase
          .from("user_profiles")
          .select("id, email, first_name, last_name, phone, company_id, role, is_active")
          .eq("id", userId)
          .maybeSingle(); // Use maybeSingle() to handle cases where user doesn't exist

        const { data, error } = await Promise.race([
          fetchPromise,
          timeoutPromise,
        ]);

        if (error) {
          logger.error("Profile fetch error:", error);
          
          if (error.code === 'PGRST116' || error.message?.includes('0 rows')) {
            return await recoverMissingProfile();
          }
          
          if (retryCount < 2) {
            // Retry up to 3 times for other errors
            logger.debug(`Retrying profile fetch (${retryCount + 1}/3)`);
            await new Promise((resolve) => setTimeout(resolve, 1000));
            return await fetchUserProfile(userId, retryCount + 1);
          }
          return null;
        }

        if (!data) {
          return await recoverMissingProfile();
        }

        // user_profiles.role is the one source of truth for role (US-348).
        // This used to overwrite it with get_user_primary_role(), which read
        // user_roles, a copy frozen in 2025-10: a demoted admin kept admin in
        // the UI, and a user created since had no row at all.
        const profile = data as UserProfile;

        logger.debug('Profile fetched successfully:', {
          role: profile.role,
        });

        // Removed: Site context update - single-tenant architecture

        // Set Sentry user context for error tracking
        setSentryUser({
          id: profile.id,
          email: profile.email,
          role: profile.role,
        });

        // Set error logging user context
        setErrorLoggingUser({
          id: profile.id,
          email: profile.email,
          role: profile.role,
          company_id: profile.company_id,
        });

        // SECURITY: Use sessionStorage instead of localStorage for PII
        // sessionStorage is cleared when browser/tab closes, reducing exposure
        try {
          sessionStorage.setItem(`bd.userProfile.${userId}`, JSON.stringify(profile));
        } catch { /* ignore: non-critical, best-effort */ }
        return profile;
      } catch (error) {
        logger.error("Profile fetch exception:", error);
        const isTimeout =
          error instanceof Error && error.message === "Profile fetch timeout";
        
        // Check if it's a user not found error
        if (!isTimeout && error instanceof Error && 
            (error.message.includes('0 rows') || error.message.includes('not found'))) {
          logger.warn("User profile not found in catch block - user may have been deleted");
          await supabase.auth.signOut();
          toast({
            title: "Account not found", 
            description: "Your user account no longer exists. Please sign up again.",
            variant: "destructive",
          });
          return null;
        }
        
        if (retryCount < 2 && !isTimeout) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          return await fetchUserProfile(userId, retryCount + 1);
        }
        return null;
      } finally {
        setProfileFetching(false);
      }
    },
    []
  );

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
        if (session?.user && readMfaPending() === session.user.id) {
          logger.warn("Discarding a session that never passed its MFA challenge");
          markMfaPending(null);
          void supabase.auth.signOut({ scope: "local" });
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
            const stored = sessionStorage.getItem(`bd.userProfile.${session.user.id}`);
            if (stored) {
              // SECURITY: Validate cached data with Zod schema to prevent injection attacks
              const rawParsed = JSON.parse(stored);
              const parseResult = UserProfileSchema.safeParse(rawParsed);

              if (!parseResult.success) {
                logger.warn("Cached profile validation failed, removing corrupted data:", parseResult.error.errors);
                sessionStorage.removeItem(`bd.userProfile.${session.user.id}`);
                throw new Error("Invalid cached profile data");
              }

              const parsed = parseResult.data as UserProfile;
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
          if (userProfile?.id === session.user.id) {
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
        if (sessionTimeoutRef.current) {
          clearInterval(sessionTimeoutRef.current);
          sessionTimeoutRef.current = null;
        }
        if (inactivityTimeoutRef.current) {
          clearTimeout(inactivityTimeoutRef.current);
          inactivityTimeoutRef.current = null;
        }
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

      // US-346: hold a session that has not passed MFA. During signIn the
      // gate is up and the session is stashed for release after verify; a
      // leftover pending marker (abandoned challenge) is ignored here and
      // signed out by the initial-session path.
      if (session?.user && (mfaGateRef.current || readMfaPending() === session.user.id)) {
        if (mfaGateRef.current) pendingSessionRef.current = session;
        return;
      }

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        // Only fetch profile if we don't have one or the user changed
        const currentUserId = userProfile?.id;
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
        if (isProfileFetchInProgress) {
          logger.debug("Profile fetch already in progress, waiting...");
          return;
        }

        // If current profile matches user, keep it
        if (userProfile?.id === newUserId) {
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
      if (sessionTimeoutRef.current) {
        clearInterval(sessionTimeoutRef.current);
      }
      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
      }
    };
  }, []); // Removed fetchUserProfile from deps to prevent infinite loop

  // Setup session monitoring when session changes
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    
    if (session && user) {
      cleanup = setupSessionMonitoring();
    }

    return cleanup;
  }, [session, user, setupSessionMonitoring]);

  // Ensure loading remains true while profile is being fetched
  // But don't get stuck if profile fetch failed and we're not actively fetching
  const effectiveLoading =
    loading ||
    profileFetching ||
    (user && !userProfile && isProfileFetchInProgress);

  // Log authentication state changes and update Sentry user context
  useEffect(() => {
    if (user && userProfile) {
      logger.debug("Authentication complete:", {
        userId: user.id,
        role: userProfile.role,
      });

      // Set Sentry user context for error tracking
      setSentryUser({
        id: user.id,
        email: userProfile.email,
        role: userProfile.role,
        company_id: userProfile.company_id,
      });

      // Set error logging user context
      setErrorLoggingUser({
        id: user.id,
        email: userProfile.email,
        role: userProfile.role,
        company_id: userProfile.company_id,
      });
    }
  }, [user?.id, userProfile?.role, userProfile?.email, userProfile?.company_id]);

  // Let a held session into the app: the same state the auth listener would
  // have set, applied once MFA has passed or was not needed (US-346).
  async function releaseSession(held: Session) {
    const latest = pendingSessionRef.current ?? held;
    mfaGateRef.current = false;
    pendingSessionRef.current = null;
    markMfaPending(null);
    setSession(latest);
    setUser(latest.user);
    setIsProfileFetchInProgress(true);
    try {
      const profile = await fetchUserProfile(latest.user.id);
      setUserProfile(profile ?? null);
      if (profile) successfulProfiles.current.set(profile.id, profile);
    } finally {
      setIsProfileFetchInProgress(false);
      setLoading(false);
    }
  }

  // Drop a half-finished sign-in: revoke this session only, not the user's
  // sessions on other devices.
  async function abandonSignIn() {
    mfaGateRef.current = false;
    pendingSessionRef.current = null;
    markMfaPending(null);
    setMfaChallenge(null);
    try {
      await supabase.auth.signOut({ scope: "local" });
    } finally {
      setLoading(false);
    }
  }

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
      mfaGateRef.current = true;
      pendingSessionRef.current = null;

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        mfaGateRef.current = false;
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
        // Mark first, so a reload during the check still discards the session.
        markMfaPending(data.user.id);
        let mfaRequired: boolean;
        try {
          const check = await checkMfaRequired(data.session.access_token, data.user.id, readDeviceId());
          mfaRequired = check.required;
        } catch (checkError) {
          // Fail closed: if we cannot tell whether this account has MFA, a
          // password alone is not enough.
          logger.error("MFA check failed; not signing in:", checkError);
          await abandonSignIn();
          return { error: "We couldn't confirm your two-factor settings, so you weren't signed in. Please try again." };
        }

        if (mfaRequired) {
          pendingSessionRef.current = pendingSessionRef.current ?? data.session;
          setMfaChallenge({
            userId: data.user.id,
            email: data.user.email ?? null,
            accessToken: data.session.access_token,
          });
          setLoading(false);
          return { mfaRequired: true };
        }

        await releaseSession(data.session);
      } else {
        mfaGateRef.current = false;
      }

      logger.debug("Sign in successful");
      gtag.trackAuth('login', 'email');
      return {};
    } catch (error) {
      logger.error("Sign in exception:", error);
      if (mfaGateRef.current) await abandonSignIn();
      setLoading(false);
      return { error: "An unexpected error occurred" };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- releaseSession/abandonSignIn only touch refs and stable setters
  }, []);

  const completeMfaChallenge = useCallback(async () => {
    const held = pendingSessionRef.current;
    setMfaChallenge(null);
    if (!held) {
      await abandonSignIn();
      return;
    }
    await releaseSession(held);
    gtag.trackAuth('login', 'email');
  // eslint-disable-next-line react-hooks/exhaustive-deps -- see signIn
  }, []);

  const cancelMfaChallenge = useCallback(async () => {
    setMfaChallenge(null);
    await abandonSignIn();
  }, []);

  const signInWithGoogle = useCallback(async () => {
    try {
      logger.debug("Signing in with Google via OAuth proxy...");
      setLoading(true);

      // Use our custom OAuth proxy edge function to bypass GoTrue's GOTRUE_SITE_URL limitation
      const edgeFunctionsUrl = getEdgeFunctionUrl('oauth-proxy');
      const redirectTo = '/dashboard';

      const oauthUrl = `${edgeFunctionsUrl}?action=authorize&provider=google&redirect_to=${encodeURIComponent(redirectTo)}`;

      gtag.trackAuth('login', 'google');

      // Redirect to OAuth proxy which handles the full flow
      const location = getWindowLocation();
      if (location) {
        location.href = oauthUrl;
      }

      return {};
    } catch (error) {
      logger.error("Google sign in exception:", error);
      setLoading(false);
      return { error: "An unexpected error occurred" };
    }
  }, []);

  const signInWithApple = useCallback(async () => {
    try {
      logger.debug("Signing in with Apple via OAuth proxy...");
      setLoading(true);

      // Use our custom OAuth proxy edge function to bypass GoTrue's GOTRUE_SITE_URL limitation
      const edgeFunctionsUrl = getEdgeFunctionUrl('oauth-proxy');
      const redirectTo = '/dashboard';

      const oauthUrl = `${edgeFunctionsUrl}?action=authorize&provider=apple&redirect_to=${encodeURIComponent(redirectTo)}`;

      gtag.trackAuth('login', 'apple');

      // Redirect to OAuth proxy which handles the full flow
      const location = getWindowLocation();
      if (location) {
        location.href = oauthUrl;
      }

      return {};
    } catch (error) {
      logger.error("Apple sign in exception:", error);
      setLoading(false);
      return { error: "An unexpected error occurred" };
    }
  }, []);

  // Sign up using our custom edge function (bypasses Supabase's email)
  const signUp = useCallback(
    async (email: string, password: string, userData?: { first_name?: string; last_name?: string; terms_accepted?: boolean }): Promise<{ error?: string; userId?: string; expiresInMinutes?: number }> => {
      try {
        logger.debug("AuthContext: Signing up via OTP flow...");
        setLoading(true);

        // Call our custom signup edge function (doesn't trigger Supabase email)
        const response = await fetch(
          getEdgeFunctionUrl('signup-with-otp'),
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: supabaseAnonKey,
            },
            body: JSON.stringify({
              email,
              password,
              firstName: userData?.first_name || "",
              lastName: userData?.last_name || "",
              // US-361: recorded on the profile with the version agreed to.
              termsAccepted: userData?.terms_accepted === true,
              termsVersion: LEGAL_TERMS_VERSION,
              // No role: the server fixes it. It used to be forwarded from the
              // caller straight into a service-role insert (US-338).
            }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          logger.error("AuthContext: Sign up error:", data.error);
          setLoading(false);
          return { error: data.error || "Failed to create account" };
        }

        logger.debug("AuthContext: Sign up successful, OTP sent");
        gtag.trackAuth("signup", "email");
        setLoading(false);
        return { userId: data.userId, expiresInMinutes: data.expiresInMinutes };
      } catch (error) {
        logger.error("AuthContext: Sign up exception:", error);
        setLoading(false);
        return { error: "An unexpected error occurred" };
      }
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
      setUser(null);
      setSession(null);
      setUserProfile(null);
      successfulProfiles.current.clear();

      // Clear Sentry user context
      clearSentryUser();
      setErrorLoggingUser(null);

      // Clear route memory on sign out
      clearRememberedRoute();

      gtag.trackAuth('logout');
      logger.debug("AuthContext: Sign out completed");

    } catch (error) {
      logger.error("AuthContext: Sign out error:", error);
      // Still clear state on error — including the stored tokens
      await purgeSupabaseSessionStorage().catch(() => {});
      setUser(null);
      setSession(null);
      setUserProfile(null);
      successfulProfiles.current.clear();
      clearSentryUser();
      setErrorLoggingUser(null);
      clearRememberedRoute();
    } finally {
      setLoading(false);
    }
  }, []);

  // Request password reset using our custom edge function (bypasses Supabase's email)
  const resetPassword = useCallback(async (email: string): Promise<{ error?: string; expiresInMinutes?: number }> => {
    try {
      logger.debug("AuthContext: Requesting password reset via OTP flow...");

      // Call our custom reset password edge function
      const response = await fetch(
        getEdgeFunctionUrl('reset-password-otp'),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: supabaseAnonKey,
          },
          body: JSON.stringify({
            action: "request",
            email,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        logger.error("AuthContext: Reset password error:", data.error);
        return { error: data.error || "Failed to send reset code" };
      }

      logger.debug("AuthContext: Password reset OTP sent");
      return { expiresInMinutes: data.expiresInMinutes };
    } catch (error) {
      logger.error("AuthContext: Reset password exception:", error);
      return { error: "An unexpected error occurred" };
    }
  }, []);

  // Verify OTP and set new password
  const resetPasswordWithOTP = useCallback(async (
    email: string,
    otpCode: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      logger.debug("AuthContext: Verifying reset OTP and updating password...");

      const response = await fetch(
        getEdgeFunctionUrl('reset-password-otp'),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: supabaseAnonKey,
          },
          body: JSON.stringify({
            action: "verify",
            email,
            otpCode,
            newPassword,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        logger.error("AuthContext: Reset password verify error:", data.error);
        return { success: false, error: data.error || "Failed to reset password" };
      }

      logger.debug("AuthContext: Password reset successful");
      return { success: true };
    } catch (error) {
      logger.error("AuthContext: Reset password verify exception:", error);
      return { success: false, error: "An unexpected error occurred" };
    }
  }, []);

  const updateProfile = useCallback(
    async (updates: Partial<UserProfile>) => {
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
    [user]
  );

  const refreshProfile = useCallback(async () => {
    if (!user) return;

    try {
      const profile = await fetchUserProfile(user.id);
      setUserProfile(profile);
    } catch (error) {
      logger.error("FIXED AuthContext: Refresh profile error:", error);
    }
  }, [user, fetchUserProfile]);

  // OTP-based authentication functions
  const sendOTP = useCallback(
    async (options: SendOTPOptions): Promise<{ error?: string; expiresInMinutes?: number }> => {
      try {
        logger.debug(`Sending OTP for ${options.type} to ${options.email}`);

        const response = await fetch(
          getEdgeFunctionUrl('send-auth-otp'),
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: supabaseAnonKey,
            },
            body: JSON.stringify({
              ...options,
            }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          logger.error("Send OTP error:", data.error);
          return { error: data.error || "Failed to send verification code" };
        }

        logger.debug("OTP sent successfully");
        return { expiresInMinutes: data.expiresInMinutes || 15 };
      } catch (error) {
        logger.error("Send OTP exception:", error);
        return { error: "An unexpected error occurred" };
      }
    },
    []
  );

  const verifyOTP = useCallback(
    async (options: VerifyOTPOptions): Promise<VerifyOTPResult> => {
      try {
        logger.debug(`Verifying OTP for ${options.type}`);

        const response = await fetch(
          getEdgeFunctionUrl('verify-auth-otp'),
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: supabaseAnonKey,
            },
            body: JSON.stringify({
              ...options,
            }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          logger.error("Verify OTP error:", data.error);
          return { success: false, error: data.error || "Verification failed" };
        }

        logger.debug("OTP verified successfully:", data);
        gtag.trackAuth("otp_verified", options.type);

        return {
          success: true,
          ...data,
        };
      } catch (error) {
        logger.error("Verify OTP exception:", error);
        return { success: false, error: "An unexpected error occurred" };
      }
    },
    []
  );

  const resendOTP = useCallback(
    async (options: SendOTPOptions): Promise<{ error?: string; expiresInMinutes?: number }> => {
      // Resend is just sending again
      return sendOTP(options);
    },
    [sendOTP]
  );

  const value = useMemo(
    () => ({
      user,
      session,
      userProfile,
      loading: effectiveLoading,
      signIn,
      signInWithGoogle,
      signInWithApple,
      signUp,
      signOut,
      resetPassword,
      resetPasswordWithOTP,
      updateProfile,
      refreshProfile,
      mfaChallenge,
      completeMfaChallenge,
      cancelMfaChallenge,
      sendOTP,
      verifyOTP,
      resendOTP,
    }),
    [
      user,
      session,
      userProfile,
      effectiveLoading,
      signIn,
      signInWithGoogle,
      signInWithApple,
      signUp,
      signOut,
      resetPassword,
      resetPasswordWithOTP,
      updateProfile,
      refreshProfile,
      mfaChallenge,
      completeMfaChallenge,
      cancelMfaChallenge,
      sendOTP,
      verifyOTP,
      resendOTP,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
