import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface UserProfile {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  company_id?: string;
  role: 'root_admin' | 'admin' | 'project_manager' | 'field_supervisor' | 'office_staff' | 'accounting' | 'client_portal';
  is_active: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, userData?: any) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch user profile function
  const fetchUserProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching user profile:', error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Profile fetch failed:', error);
      return null;
    }
  }, []);

  // Initialize auth state - SINGLE useEffect to prevent race conditions
  useEffect(() => {
    let mounted = true;
    let profileFetchInProgress = false;

    const handleAuthChange = (event: string, session: Session | null) => {
      if (!mounted) return;

      // Update session and user immediately (synchronous)
      setSession(session);
      setUser(session?.user ?? null);

      // Handle profile fetch separately to avoid auth loops
      if (session?.user && !profileFetchInProgress) {
        profileFetchInProgress = true;
        
        // Defer profile fetch to prevent auth state loops
        setTimeout(() => {
          if (!mounted) return;
          
          fetchUserProfile(session.user.id).then(profile => {
            if (mounted) {
              setUserProfile(profile);
              profileFetchInProgress = false;
            }
          }).catch(error => {
            console.error('Profile fetch error:', error);
            if (mounted) {
              setUserProfile(null);
              profileFetchInProgress = false;
            }
          });
        }, 0);
      } else if (!session?.user) {
        // No user, clear profile immediately
        setUserProfile(null);
        profileFetchInProgress = false;
      }

      // Mark as ready and stop loading
      if (mounted) {
        setLoading(false);
      }
    };

    const initializeAuth = async () => {
      try {
        // Get current session first
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session error:', error);
        }

        // Handle initial session
        handleAuthChange('INITIAL_SESSION', session);
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthChange);

    // Initialize
    initializeAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []); // No dependencies to prevent re-initialization

  const refreshProfile = useCallback(async () => {
    if (user) {
      const profile = await fetchUserProfile(user.id);
      setUserProfile(profile);
    }
  }, [user, fetchUserProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        toast({
          variant: "destructive",
          title: "Sign In Failed",
          description: error.message
        });
      }

      return { error };
    } catch (err: any) {
      console.error('Error during sign in:', err);
      return { error: err };
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, userData?: any) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: userData
      }
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Sign Up Failed",
        description: error.message
      });
    }

    return { error };
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth`
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Reset Password Failed",
        description: error.message
      });
    } else {
      toast({
        title: "Reset Email Sent",
        description: "Check your email for a password reset link."
      });
    }

    return { error };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    toast({
      title: "Signed Out",
      description: "You have been successfully signed out."
    });
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo(() => ({
    user,
    session,
    userProfile,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    refreshProfile
  }), [user, session, userProfile, loading, signIn, signUp, signOut, resetPassword, refreshProfile]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};