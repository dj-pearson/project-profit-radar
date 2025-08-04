import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  loading: boolean;
  profile: any | null;
}

export const useAuth = () => {
  const [auth, setAuth] = useState<AuthState>({
    user: null,
    loading: true,
    profile: null
  });

  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        // Get user profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', session.user.id)
          .single();
        
        setAuth({
          user: session.user,
          loading: false,
          profile: profile || null
        });
      } else {
        setAuth({
          user: null,
          loading: false,
          profile: null
        });
      }
    };

    getSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        // Get user profile when user signs in
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', session.user.id)
          .single();
        
        setAuth({
          user: session.user,
          loading: false,
          profile: profile || null
        });
      } else {
        setAuth({
          user: null,
          loading: false,
          profile: null
        });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const updateProfile = async (updates: any) => {
    if (!auth.user) throw new Error('No user logged in');

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('user_id', auth.user.id)
      .select()
      .single();

    if (error) throw error;

    setAuth(prev => ({
      ...prev,
      profile: data
    }));

    return data;
  };

  return {
    user: auth.user,
    profile: auth.profile,
    loading: auth.loading,
    isAuthenticated: !!auth.user,
    signOut,
    updateProfile
  };
};