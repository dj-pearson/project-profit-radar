import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
} from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileFetching, setProfileFetching] = useState(false);

  // Fetch user profile with retry logic
  const fetchUserProfile = useCallback(
    async (userId: string, retryCount = 0): Promise<UserProfile | null> => {
      try {
        console.log(`Fetching profile for user: ${userId}`);
        setProfileFetching(true);

        const { data, error } = await supabase
          .from("user_profiles")
          .select("*")
          .eq("id", userId)
          .single();

        if (error) {
          console.error("Profile fetch error:", error);
          if (retryCount < 2) {
            // Retry up to 3 times
            console.log(`Retrying profile fetch (${retryCount + 1}/3)`);
            await new Promise((resolve) => setTimeout(resolve, 1000));
            return await fetchUserProfile(userId, retryCount + 1);
          }
          return null;
        }

        console.log("Profile fetched successfully:", data?.role);
        return data as UserProfile;
      } catch (error) {
        console.error("Profile fetch exception:", error);
        if (retryCount < 2) {
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
        fetchUserProfile(session.user.id).then((profile) => {
          setUserProfile(profile);
          setLoading(false);
        });
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state change:", event, session?.user?.id || "none");

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        // Keep loading true until profile is fetched
        setLoading(true);
        const profile = await fetchUserProfile(session.user.id);
        setUserProfile(profile);
        setLoading(false);
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchUserProfile]);

  // Ensure loading remains true while profile is being fetched
  const effectiveLoading = loading || profileFetching || (user && !userProfile);

  // Log current state for debugging
  const logCurrentState = useCallback(() => {
    console.log("Auth state:", {
      hasUser: !!user,
      hasProfile: !!userProfile,
      loading: effectiveLoading,
      profileFetching,
    });
  }, [user, userProfile, effectiveLoading, profileFetching]);

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
      // Loading will be set to false by the auth state change listener
      return {};
    } catch (error) {
      console.error("Sign in exception:", error);
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
      console.log("FIXED AuthContext: Signing out...");
      setLoading(true);
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setUserProfile(null);
      setLoading(false);
    } catch (error) {
      console.error("FIXED AuthContext: Sign out error:", error);
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
      signUp,
      signOut,
      resetPassword,
      updateProfile,
      refreshProfile,
    ]
  );

  logCurrentState();

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
