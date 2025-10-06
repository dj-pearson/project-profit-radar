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

/**
 * SECURITY: This hook now queries user roles from the secure user_roles table
 * instead of trusting client-side JWT metadata. This prevents privilege escalation attacks.
 */
export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    role: null,
    isLoading: true,
    error: null,
  });
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Fetch user role from secure server-side table
  const fetchUserRole = async (userId: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .rpc('get_user_primary_role', { _user_id: userId });
      
      if (error) {
        console.error('[Auth] Failed to fetch user role:', error);
        return null;
      }
      
      return data;
    } catch (err) {
      console.error('[Auth] Error fetching user role:', err);
      return null;
    }
  };

  useEffect(() => {
    // Get initial session and role
    const initializeAuth = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        setAuthState({ user: null, role: null, isLoading: false, error });
        return;
      }

      if (session?.user) {
        // Fetch role from secure server-side table
        const role = await fetchUserRole(session.user.id);
        setAuthState({
          user: session.user,
          role,
          isLoading: false,
          error: null,
        });
      } else {
        setAuthState({
          user: null,
          role: null,
          isLoading: false,
          error: null,
        });
      }
    };

    initializeAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setAuthState({
          user: null,
          role: null,
          isLoading: false,
          error: null,
        });
        // Clear all cached data on signout
        queryClient.clear();
        navigate('/login');
        return;
      }

      if (session?.user) {
        // Fetch role from secure server-side table on auth changes
        const role = await fetchUserRole(session.user.id);
        setAuthState({
          user: session.user,
          role,
          isLoading: false,
          error: null,
        });
      } else {
        setAuthState({
          user: null,
          role: null,
          isLoading: false,
          error: null,
        });
      }

      if (event === 'TOKEN_REFRESHED') {
        console.log('[Auth] Session token refreshed');
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
