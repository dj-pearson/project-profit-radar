import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import type { User } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  role: string | null;
  isLoading: boolean;
  error: Error | null;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    role: null,
    isLoading: true,
    error: null,
  });
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        setAuthState({ user: null, role: null, isLoading: false, error });
        return;
      }

      setAuthState({
        user: session?.user ?? null,
        role: session?.user?.user_metadata?.role ?? null,
        isLoading: false,
        error: null,
      });
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setAuthState({
        user: session?.user ?? null,
        role: session?.user?.user_metadata?.role ?? null,
        isLoading: false,
        error: null,
      });

      if (event === 'SIGNED_OUT') {
        // Clear all cached data on signout
        queryClient.clear();
        navigate('/login');
      }

      if (event === 'TOKEN_REFRESHED') {
        console.log('Session token refreshed');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [queryClient, navigate]);

  const logout = async () => {
    try {
      // Clear sensitive data
      queryClient.clear();
      localStorage.removeItem('sensitive_data');

      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      setAuthState((prev) => ({ ...prev, error: error as Error }));
    }
  };

  return {
    ...authState,
    logout,
  };
}
