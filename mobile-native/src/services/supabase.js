/**
 * Supabase Client Configuration
 * Same backend as main web app
 */

import {createClient} from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Using the same Supabase instance as your web app
const supabaseUrl = 'https://ilhzuvemiuyfuxfegtlv.supabase.co';
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlsaHp1dmVtaXV5ZnV4ZmVndGx2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzIxMzg4MDcsImV4cCI6MjA0NzcxNDgwN30.gvFHQ8pGr_zqnSoXBRvMiYUcQFhkrSc5uWvQy2LYmcE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Helper functions for common operations
export const authHelpers = {
  // Sign in with email and password
  signIn: async (email, password) => {
    const {data, error} = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return {data, error};
  },

  // Sign up new user
  signUp: async (email, password, userData = {}) => {
    const {data, error} = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData,
      },
    });
    return {data, error};
  },

  // Sign out
  signOut: async () => {
    const {error} = await supabase.auth.signOut();
    return {error};
  },

  // Get current session
  getSession: async () => {
    const {data, error} = await supabase.auth.getSession();
    return {data, error};
  },

  // Get current user
  getUser: async () => {
    const {data, error} = await supabase.auth.getUser();
    return {data, error};
  },
};

export default supabase;
