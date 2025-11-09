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

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signInWithGoogle: () => Promise<{ error?: string }>;
  signUp: (
    email: string,
    password: string,
    userData?: any
  ) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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

  // Clear all session-related state and redirect to auth
  const handleSessionExpired = useCallback(async (reason: string = 'Session expired') => {
    console.log(`Auth session expired: ${reason}`);

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

    // SECURITY: Clear both localStorage and sessionStorage
    try {
      // Clear localStorage auth tokens
      const localKeys = Object.keys(localStorage);
      localKeys.forEach(key => {
        if (key.startsWith('sb-ilhzuvemiuyfuxfegtlv-auth-token')) {
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
      console.error('Error clearing storage:', error);
    }

    // Sign out from Supabase
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
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
        console.log('Session check failed:', error?.message || 'No session');
        await handleSessionExpired('Session validation failed');
        return;
      }

      // Check if token is expired
      const now = Math.floor(Date.now() / 1000);
      if (currentSession.expires_at && currentSession.expires_at <= now) {
        console.log('Token expired');
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
            console.log('Refresh token invalid:', refreshError.message);
            await handleSessionExpired('Refresh token invalid');
            return;
          }
        } catch (refreshError) {
          console.log('Refresh failed:', refreshError);
          await handleSessionExpired('Token refresh failed');
          return;
        }
      }

    } catch (error) {
      console.error('Session validity check error:', error);
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
        console.log(`Fetching profile for user: ${userId}`);
        setProfileFetching(true);

        // Add timeout to prevent hanging
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error("Profile fetch timeout")), 10000);
        });

        const fetchPromise = supabase
          .from("user_profiles")
          .select("*")
          .eq("id", userId)
          .maybeSingle(); // Use maybeSingle() to handle cases where user doesn't exist

        const { data, error } = await Promise.race([
          fetchPromise,
          timeoutPromise,
        ]);

        if (error) {
          console.error("Profile fetch error:", error);
          
          // If it's a user not found error or RLS violation, the user likely doesn't exist
          if (error.code === 'PGRST116' || error.message?.includes('0 rows')) {
            console.warn("User profile not found - user may have been deleted");
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
            console.log(`Retrying profile fetch (${retryCount + 1}/3)`);
            await new Promise((resolve) => setTimeout(resolve, 1000));
            return await fetchUserProfile(userId, retryCount + 1);
          }
          return null;
        }

        // If data is null, user profile doesn't exist
        if (!data) {
          console.warn("User profile not found - user may have been deleted");
          // Sign out the user since their profile doesn't exist
          await supabase.auth.signOut();
          toast({
            title: "Account not found",
            description: "Your user account no longer exists. Please sign up again.",
            variant: "destructive",
          });
          return null;
        }

        console.log("Profile fetched successfully:", data.role);
        // SECURITY: Use sessionStorage instead of localStorage for PII
        // sessionStorage is cleared when browser/tab closes, reducing exposure
        try {
          sessionStorage.setItem(`bd.userProfile.${userId}`, JSON.stringify(data));
        } catch {}
        return data as UserProfile;
      } catch (error) {
        console.error("Profile fetch exception:", error);
        const isTimeout =
          error instanceof Error && error.message === "Profile fetch timeout";
        
        // Check if it's a user not found error
        if (!isTimeout && error instanceof Error && 
            (error.message.includes('0 rows') || error.message.includes('not found'))) {
          console.warn("User profile not found in catch block - user may have been deleted");
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
    console.log("Initializing authentication...");

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log("Initial session:", session?.user?.id || "none");
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        // Check cache first for instant access
        const cachedProfile = successfulProfiles.current.get(session.user.id);
        if (cachedProfile) {
          console.log("Initial session: Using cached profile");
          setUserProfile(cachedProfile);
          setLoading(false);
          return;
        }

        // SECURITY: Check sessionStorage profile cache (more secure than localStorage)
        try {
          const stored = sessionStorage.getItem(`bd.userProfile.${session.user.id}`);
          if (stored) {
            const parsed = JSON.parse(stored);
            console.log("Initial session: Using stored profile");
            setUserProfile(parsed);
            successfulProfiles.current.set(parsed.id, parsed);
            setLoading(false);
            return;
          }
        } catch {}

        // Check current profile
        if (userProfile?.id === session.user.id) {
          console.log(
            "Initial session: Profile already exists, skipping fetch"
          );
          setLoading(false);
          return;
        }

        // Fetch profile for initial session
        console.log("Initial session: Fetching profile for user");
        setIsProfileFetchInProgress(true);
        fetchUserProfile(session.user.id)
          .then((profile) => {
            if (profile) {
              setUserProfile(profile);
              successfulProfiles.current.set(profile.id, profile);
              console.log("Initial profile loaded successfully");
            } else {
              setUserProfile(null);
              console.warn("Initial profile fetch failed");
            }
          })
          .catch((error) => {
            console.error("Initial profile fetch error:", error);
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
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state change:", event, session?.user?.id || "none");

      // Handle session expiration or token errors
      if (event === 'TOKEN_REFRESHED' && !session) {
        console.log('Token refresh failed, session expired');
        await handleSessionExpired('Token refresh failed');
        return;
      }

      if (event === 'SIGNED_OUT') {
        console.log('User signed out');
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
          console.log("Password recovery session detected in auth state change");
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
          console.log("Using cached profile for user, skipping fetch");
          setUserProfile(cachedProfile);
          setLoading(false);
          return;
        }

        // If profile fetch is in progress, wait
        if (isProfileFetchInProgress) {
          console.log("Profile fetch already in progress, waiting...");
          return;
        }

        // If current profile matches user, keep it
        if (userProfile?.id === newUserId) {
          console.log("Profile already loaded for user, skipping fetch");
          setLoading(false);
          return;
        }

        // Fetch profile for new user
        console.log("Fetching profile for user:", newUserId);
        setLoading(true);
        setIsProfileFetchInProgress(true);

        try {
          const profile = await fetchUserProfile(session.user.id);

          if (profile) {
            setUserProfile(profile);
            successfulProfiles.current.set(profile.id, profile);
            console.log("Profile loaded successfully, user ready");
          } else {
            console.warn("Profile fetch failed, user may have limited access");
            setUserProfile(null);
          }
        } catch (error) {
          console.error("Profile fetch failed:", error);
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

  // Log authentication state changes
  useEffect(() => {
    if (user && userProfile) {
      console.log("Authentication complete:", {
        userId: user.id,
        role: userProfile.role,
      });
    }
  }, [user?.id, userProfile?.role]);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      console.log("Signing in...");
      setLoading(true);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("Sign in error:", error);
        setLoading(false);
        return { error: error.message };
      }

      console.log("Sign in successful");
      gtag.trackAuth('login', 'email');
      // Loading will be set to false by the auth state change listener
      return {};
    } catch (error) {
      console.error("Sign in exception:", error);
      setLoading(false);
      return { error: "An unexpected error occurred" };
    }
  }, []);

  const signInWithGoogle = useCallback(async () => {
    try {
      console.log("Signing in with Google...");
      setLoading(true);

      const location = getWindowLocation();
      const redirectUrl = location ? `${location.origin}/dashboard` : 'builddesk://dashboard';

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
        },
      });

      if (error) {
        console.error("Google sign in error:", error);
        setLoading(false);
        return { error: error.message };
      }

      console.log("Google sign in successful");
      gtag.trackAuth('login', 'google');
      // User will be redirected, loading will be handled by redirect
      return {};
    } catch (error) {
      console.error("Google sign in exception:", error);
      setLoading(false);
      return { error: "An unexpected error occurred" };
    }
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, userData?: any) => {
      try {
        console.log("FIXED AuthContext: Signing up...");
        setLoading(true);

        const location = getWindowLocation();
        const redirectUrl = location ? `${location.origin}/` : 'builddesk://';
        const { data, error} = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectUrl,
            data: userData,
          },
        });

        if (error) {
          console.error("FIXED AuthContext: Sign up error:", error);
          setLoading(false);
          return { error: error.message };
        }

        console.log("FIXED AuthContext: Sign up successful");
        gtag.trackAuth('signup', 'email');
        setLoading(false);
        return {};
      } catch (error) {
        console.error("FIXED AuthContext: Sign up exception:", error);
        setLoading(false);
        return { error: "An unexpected error occurred" };
      }
    },
    []
  );

  const signOut = useCallback(async () => {
    try {
      console.log("AuthContext: Starting sign out...");
      setLoading(true);

      // Sign out from Supabase first
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("AuthContext: Supabase signOut error:", error);
      }

      // Clear all state
      setUser(null);
      setSession(null);
      setUserProfile(null);
      successfulProfiles.current.clear();

      // Clear route memory on sign out
      clearRememberedRoute();

      gtag.trackAuth('logout');
      console.log("AuthContext: Sign out completed");

    } catch (error) {
      console.error("AuthContext: Sign out error:", error);
      // Still clear state on error
      setUser(null);
      setSession(null);
      setUserProfile(null);
      successfulProfiles.current.clear();
      clearRememberedRoute();
    } finally {
      setLoading(false);
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    try {
      console.log("FIXED AuthContext: Resetting password...");
      const location = getWindowLocation();
      const redirectUrl = location ? `${location.origin}/auth` : 'builddesk://auth';
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) {
        console.error("FIXED AuthContext: Reset password error:", error);
        return { error: error.message };
      }

      console.log("FIXED AuthContext: Password reset email sent");
      return {};
    } catch (error) {
      console.error("FIXED AuthContext: Reset password exception:", error);
      return { error: "An unexpected error occurred" };
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
        console.error("FIXED AuthContext: Update profile error:", error);
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
      console.error("FIXED AuthContext: Refresh profile error:", error);
    }
  }, [user, fetchUserProfile]);

  const value = useMemo(
    () => ({
      user,
      session,
      userProfile,
      loading: effectiveLoading,
      signIn,
      signInWithGoogle,
      signUp,
      signOut,
      resetPassword,
      updateProfile,
      refreshProfile,
    }),
    [
      user,
      session,
      userProfile,
      effectiveLoading,
      signIn,
      signInWithGoogle,
      signUp,
      signOut,
      resetPassword,
      updateProfile,
      refreshProfile,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
