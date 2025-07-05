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

  // Centralized auth initialization effect
  useEffect(() => {
    let mounted = true;
    let profileCache = new Map<string, UserProfile | null>();
    let pendingFetches = new Set<string>();

    const handleAuthChange = async (event: string, session: Session | null) => {
      if (!mounted) return;
      
      console.log('Auth state change:', event, session?.user?.id);
      
      if (session?.user) {
        const userId = session.user.id;
        
        // Check cache first
        if (profileCache.has(userId)) {
          console.log('Using cached profile for user:', userId);
          setUser(session.user);
          setSession(session);
          setUserProfile(profileCache.get(userId) || null);
          setLoading(false);
          return;
        }

        // Check if fetch is already pending
        if (pendingFetches.has(userId)) {
          console.log('Profile fetch already pending for user:', userId);
          setUser(session.user);
          setSession(session);
          return;
        }

        pendingFetches.add(userId);
        setLoading(true);
        setUser(session.user);
        setSession(session);
        
        console.log('Fetching profile for user:', userId);
        
        try {
          const { data: profile, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle();
            
          console.log('Profile query result:', { profile, error });
          
          if (mounted) {
            const profileData = error ? null : profile;
            profileCache.set(userId, profileData);
            setUserProfile(profileData);
            setLoading(false);
            
            if (error) {
              console.error('Profile fetch error:', error);
            }
          }
        } catch (error) {
          console.error('Profile fetch exception:', error);
          if (mounted) {
            profileCache.set(userId, null);
            setUserProfile(null);
            setLoading(false);
          }
        } finally {
          pendingFetches.delete(userId);
        }
      } else {
        // No session - clear everything
        console.log('No session, clearing auth state');
        profileCache.clear();
        pendingFetches.clear();
        setUser(null);
        setSession(null);
        setUserProfile(null);
        setLoading(false);
      }
    };

    // Initialize auth
    const initAuth = async () => {
      try {
        console.log('Initializing auth...');
        const { data: { session } } = await supabase.auth.getSession();
        console.log('Initial session:', session?.user?.id || 'none');
        
        // Set up listener first
        const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthChange);
        
        // Handle initial session
        if (session && mounted) {
          await handleAuthChange('INITIAL_SESSION', session);
        } else if (mounted) {
          setLoading(false);
        }
        
        return subscription;
      } catch (error) {
        console.error('Auth init error:', error);
        if (mounted) {
          setLoading(false);
        }
        return null;
      }
    };

    let subscription: any = null;
    initAuth().then(sub => subscription = sub);

    return () => {
      mounted = false;
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  // Debug effect to track profile changes
  useEffect(() => {
    console.log('Profile state changed:', { 
      hasProfile: !!userProfile, 
      role: userProfile?.role,
      companyId: userProfile?.company_id 
    });
  }, [userProfile]);

  const refreshProfile = useCallback(async () => {
    if (user) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      setUserProfile(profile);
    }
  }, [user]);

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