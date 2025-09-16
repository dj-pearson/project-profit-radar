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
import type { ReactNode, FC } from "react";

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
        try {
          localStorage.setItem(`bd.userProfile.${userId}`, JSON.stringify(data));
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

        // Check localStorage profile cache
        try {
          const stored = localStorage.getItem(`bd.userProfile.${session.user.id}`);
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

      // Check if this is a password recovery session
      const urlParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const type = urlParams.get('type') || hashParams.get('type');
      
      // If this is a password recovery session, handle it specially
      if (type === 'recovery' && session?.user) {
        console.log("Password recovery session detected in auth state change");
        setSession(session);
        setUser(session.user);
        setLoading(false);
        
        // Don't fetch profile for password recovery - redirect using React Router for SEO
        if (window.location.pathname === '/auth') {
          // Use setTimeout to avoid redirect during render cycle
          setTimeout(() => {
            window.location.href = `/reset-password${window.location.search}${window.location.hash}`;
          }, 100);
        }
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
    };
  }, []); // Removed fetchUserProfile from deps to prevent infinite loop

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

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
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

        const redirectUrl = `${window.location.origin}/`;
        const { data, error } = await supabase.auth.signUp({
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
      
      gtag.trackAuth('logout');
      console.log("AuthContext: Sign out completed");
      
    } catch (error) {
      console.error("AuthContext: Sign out error:", error);
      // Still clear state on error
      setUser(null);
      setSession(null);
      setUserProfile(null);
      successfulProfiles.current.clear();
    } finally {
      setLoading(false);
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    try {
      console.log("FIXED AuthContext: Resetting password...");
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`,
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
