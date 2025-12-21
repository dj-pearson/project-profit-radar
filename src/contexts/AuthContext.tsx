import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { User, Session, AuthError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { gtag } from "@/hooks/useGoogleAnalytics";
import { clearRememberedRoute } from "@/lib/routeMemory";
import { setSentryUser, clearSentryUser } from "@/lib/sentry";
import { logger } from "@/lib/logger";
import { getSiteConfig, getCurrentSiteId, clearSiteCache, type SiteConfig } from "@/lib/site-resolver";
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
  site_id?: string;
  tenant_id?: string;
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

// OTP types for email verification flows
type OTPType =
  | 'confirm_signup'
  | 'invite_user'
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
  accessToken?: string;
  refreshToken?: string;
  error?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userProfile: UserProfile | null;
  siteId: string | null;
  siteConfig: SiteConfig | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signInWithGoogle: () => Promise<{ error?: string }>;
  signInWithApple: () => Promise<{ error?: string }>;
  signUp: (
    email: string,
    password: string,
    userData?: any
  ) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
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
  const [siteId, setSiteId] = useState<string | null>(null);
  const [siteConfig, setSiteConfig] = useState<SiteConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileFetching, setProfileFetching] = useState(false);
  const [isProfileFetchInProgress, setIsProfileFetchInProgress] = useState(false);
  const { toast } = useToast();

  const successfulProfiles = useRef<Map<string, UserProfile>>(new Map());
  const sessionTimeoutRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const inactivityTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Session monitoring constants
  const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  const SESSION_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

  // Initialize site config on mount
  useEffect(() => {
    const initializeSite = async () => {
      const config = await getSiteConfig();
      if (config) {
        setSiteConfig(config);
        setSiteId(config.id);
        logger.debug(`Site initialized: ${config.key} (${config.id})`);
      } else {
        logger.error('Failed to initialize site config');
      }
    };
    
    initializeSite();
  }, []);

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

    // Show toast notification
    toast({
      title: "Session Expired",
      description: "Your session has expired. Please sign in again.",
      variant: "destructive",
      duration: 5000,
    });

    // Redirect to auth page (web only)
    const location = getWindowLocation();
    if (location) {
      location.href = '/auth';
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
          .select("id, email, first_name, last_name, phone, company_id, site_id, tenant_id, role, is_active")
          .eq("id", userId)
          .maybeSingle(); // Use maybeSingle() to handle cases where user doesn't exist

        const { data, error } = await Promise.race([
          fetchPromise,
          timeoutPromise,
        ]);

        if (error) {
          logger.error("Profile fetch error:", error);
          
          // If it's a user not found error or RLS violation, the user likely doesn't exist
          if (error.code === 'PGRST116' || error.message?.includes('0 rows')) {
            logger.warn("User profile not found - user may have been deleted");
            // Sign out the user since their profile doesn't exist
            await supabase.auth.signOut();
            toast({
              title: "Account not found",
              description: "Your user account no longer exists. Please sign up again.",
              variant: "destructive",
            });
            return null;
          }
          
          if (retryCount < 2) {
            // Retry up to 3 times for other errors
            logger.debug(`Retrying profile fetch (${retryCount + 1}/3)`);
            await new Promise((resolve) => setTimeout(resolve, 1000));
            return await fetchUserProfile(userId, retryCount + 1);
          }
          return null;
        }

        // If data is null, user profile doesn't exist
        if (!data) {
          logger.warn("User profile not found - user may have been deleted");
          // Sign out the user since their profile doesn't exist
          await supabase.auth.signOut();
          toast({
            title: "Account not found",
            description: "Your user account no longer exists. Please sign up again.",
            variant: "destructive",
          });
          return null;
        }

        // SECURITY: Get authoritative role from user_roles via RPC
        try {
          const { data: secureRole, error: roleError } = await supabase
            .rpc('get_user_primary_role', { _user_id: userId });

          if (roleError) {
            logger.error('Error fetching user role from user_roles:', roleError);
          } else if (secureRole) {
            (data as any).role = secureRole;
          }
        } catch (roleErr) {
          logger.error('Exception fetching user role from user_roles:', roleErr);
        }

        logger.debug('Profile fetched successfully:', {
          role: (data as any).role,
          site_id: data.site_id,
          tenant_id: data.tenant_id,
        });
        
        // Update site context if needed
        if (data.site_id && data.site_id !== siteId) {
          logger.debug(`Updating site context to: ${data.site_id}`);
          setSiteId(data.site_id);
        }
        
        // Set Sentry user context for error tracking
        setSentryUser({
          id: data.id,
          email: data.email,
          role: (data as any).role,
          site_id: data.site_id,
          tenant_id: data.tenant_id,
        });
        
        // SECURITY: Use sessionStorage instead of localStorage for PII
        // sessionStorage is cleared when browser/tab closes, reducing exposure
        try {
          sessionStorage.setItem(`bd.userProfile.${userId}`, JSON.stringify(data));
        } catch {}
        return data as UserProfile;
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
              const parsed = JSON.parse(stored);
              logger.debug("Initial session: Using stored profile (will refresh in background)");
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
          } catch {}

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
    }
  }, [user?.id, userProfile?.role, userProfile?.email, userProfile?.company_id]);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      logger.debug("Signing in...");
      setLoading(true);

      // Get current site ID before authentication
      const currentSiteId = await getCurrentSiteId();
      if (!currentSiteId) {
        logger.error("Unable to determine site_id");
        setLoading(false);
        return { error: "Unable to determine site. Please try again." };
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        logger.error("Sign in error:", error);
        setLoading(false);
        return { error: error.message };
      }

      // Update user metadata to include site_id
      if (data.user && !data.user.app_metadata?.site_id) {
        logger.debug(`Setting site_id ${currentSiteId} for user ${data.user.id}`);
        await supabase.auth.updateUser({
          data: {
            site_id: currentSiteId,
          },
        });
      }

      logger.debug("Sign in successful");
      gtag.trackAuth('login', 'email');
      // Loading will be set to false by the auth state change listener
      return {};
    } catch (error) {
      logger.error("Sign in exception:", error);
      setLoading(false);
      return { error: "An unexpected error occurred" };
    }
  }, []);

  const signInWithGoogle = useCallback(async () => {
    try {
      logger.debug("Signing in with Google...");
      setLoading(true);

      // Resolve current site so OAuth users are scoped to the correct tenant/site
      const currentSiteId = await getCurrentSiteId();
      if (!currentSiteId) {
        logger.error("Unable to determine site_id during Google sign in");
        setLoading(false);
        return { error: "Unable to determine site. Please try again." };
      }

      const location = getWindowLocation();
      const redirectUrl = location ? `${location.origin}/dashboard` : 'builddesk://dashboard';

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          data: {
            site_id: currentSiteId,
          },
        },
      });

      if (error) {
        logger.error("Google sign in error:", error);
        setLoading(false);
        return { error: error.message };
      }

      logger.debug("Google sign in successful");
      gtag.trackAuth('login', 'google');
      // User will be redirected, loading will be handled by redirect
      return {};
    } catch (error) {
      logger.error("Google sign in exception:", error);
      setLoading(false);
      return { error: "An unexpected error occurred" };
    }
  }, []);

  const signInWithApple = useCallback(async () => {
    try {
      logger.debug("Signing in with Apple...");
      setLoading(true);

      // Resolve current site so OAuth users are scoped to the correct tenant/site
      const currentSiteId = await getCurrentSiteId();
      if (!currentSiteId) {
        logger.error("Unable to determine site_id during Apple sign in");
        setLoading(false);
        return { error: "Unable to determine site. Please try again." };
      }

      const location = getWindowLocation();
      const redirectUrl = location ? `${location.origin}/dashboard` : 'builddesk://dashboard';

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: redirectUrl,
          data: {
            site_id: currentSiteId,
          },
        },
      });

      if (error) {
        logger.error("Apple sign in error:", error);
        setLoading(false);
        return { error: error.message };
      }

      logger.debug("Apple sign in successful");
      gtag.trackAuth('login', 'apple');
      // User will be redirected, loading will be handled by redirect
      return {};
    } catch (error) {
      logger.error("Apple sign in exception:", error);
      setLoading(false);
      return { error: "An unexpected error occurred" };
    }
  }, []);

  // Sign up using our custom edge function (bypasses Supabase's email)
  const signUp = useCallback(
    async (email: string, password: string, userData?: any): Promise<{ error?: string; userId?: string; expiresInMinutes?: number }> => {
      try {
        logger.debug("AuthContext: Signing up via OTP flow...");
        setLoading(true);

        // Resolve current site so new users are scoped to the correct tenant/site
        const currentSiteId = await getCurrentSiteId();
        if (!currentSiteId) {
          logger.error("Unable to determine site_id during sign up");
          setLoading(false);
          return { error: "Unable to determine site. Please try again." };
        }

        // Call our custom signup edge function (doesn't trigger Supabase email)
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/signup-with-otp`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
            },
            body: JSON.stringify({
              email,
              password,
              firstName: userData?.first_name || "",
              lastName: userData?.last_name || "",
              siteId: currentSiteId,
              role: userData?.role || "admin",
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

      // Clear all state
      setUser(null);
      setSession(null);
      setUserProfile(null);
      setSiteId(null);
      successfulProfiles.current.clear();

      // Clear site cache
      clearSiteCache();

      // Clear Sentry user context
      clearSentryUser();

      // Clear route memory on sign out
      clearRememberedRoute();

      gtag.trackAuth('logout');
      logger.debug("AuthContext: Sign out completed");

    } catch (error) {
      logger.error("AuthContext: Sign out error:", error);
      // Still clear state on error
      setUser(null);
      setSession(null);
      setUserProfile(null);
      successfulProfiles.current.clear();
      clearSentryUser();
      clearRememberedRoute();
    } finally {
      setLoading(false);
    }
  }, []);

  // Request password reset using our custom edge function (bypasses Supabase's email)
  const resetPassword = useCallback(async (email: string): Promise<{ error?: string; expiresInMinutes?: number }> => {
    try {
      logger.debug("AuthContext: Requesting password reset via OTP flow...");

      const currentSiteId = await getCurrentSiteId();
      if (!currentSiteId) {
        return { error: "Unable to determine site. Please try again." };
      }

      // Call our custom reset password edge function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reset-password-otp`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            action: "request",
            email,
            siteId: currentSiteId,
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

      const currentSiteId = await getCurrentSiteId();
      if (!currentSiteId) {
        return { success: false, error: "Unable to determine site. Please try again." };
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reset-password-otp`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            action: "verify",
            email,
            otpCode,
            newPassword,
            siteId: currentSiteId,
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
        const currentSiteId = await getCurrentSiteId();
        if (!currentSiteId) {
          return { error: "Unable to determine site. Please try again." };
        }

        logger.debug(`Sending OTP for ${options.type} to ${options.email}`);

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-auth-otp`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
            },
            body: JSON.stringify({
              ...options,
              siteId: currentSiteId,
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
        const currentSiteId = await getCurrentSiteId();
        if (!currentSiteId) {
          return { success: false, error: "Unable to determine site. Please try again." };
        }

        logger.debug(`Verifying OTP for ${options.type}`);

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-auth-otp`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
            },
            body: JSON.stringify({
              ...options,
              siteId: currentSiteId,
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
      siteId,
      siteConfig,
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
      sendOTP,
      verifyOTP,
      resendOTP,
    }),
    [
      user,
      session,
      userProfile,
      siteId,
      siteConfig,
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
      sendOTP,
      verifyOTP,
      resendOTP,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
