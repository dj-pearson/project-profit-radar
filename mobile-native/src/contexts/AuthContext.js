/**
 * Authentication Context
 * Manages user authentication state across the app
 */

import React, {createContext, useState, useEffect, useContext} from 'react';
import {supabase, authHelpers} from '../services/supabase';

const AuthContext = createContext({
  session: null,
  user: null,
  userProfile: null,
  loading: true,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({children}) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch user profile from database
  const fetchUserProfile = async userId => {
    try {
      const {data, error} = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setUserProfile(data);
      return data;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  };

  // Initialize auth state
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({data: {session}}) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: {subscription},
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setUserProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Sign in function
  const signIn = async (email, password) => {
    try {
      const {data, error} = await authHelpers.signIn(email, password);
      if (error) throw error;
      return {success: true, data};
    } catch (error) {
      console.error('Sign in error:', error);
      return {success: false, error};
    }
  };

  // Sign up function
  const signUp = async (email, password, userData = {}) => {
    try {
      const {data, error} = await authHelpers.signUp(email, password, userData);
      if (error) throw error;
      return {success: true, data};
    } catch (error) {
      console.error('Sign up error:', error);
      return {success: false, error};
    }
  };

  // Sign out function
  const signOut = async () => {
    try {
      const {error} = await authHelpers.signOut();
      if (error) throw error;
      setSession(null);
      setUser(null);
      setUserProfile(null);
      return {success: true};
    } catch (error) {
      console.error('Sign out error:', error);
      return {success: false, error};
    }
  };

  // Refresh profile
  const refreshProfile = async () => {
    if (user) {
      return await fetchUserProfile(user.id);
    }
    return null;
  };

  const value = {
    session,
    user,
    userProfile,
    loading,
    signIn,
    signUp,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
