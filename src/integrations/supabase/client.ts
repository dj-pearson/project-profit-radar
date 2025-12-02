// Supabase client configuration
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { supabaseStorage } from '@/lib/supabaseStorage';

// Load configuration from environment variables
// For production, set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in your environment
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Validate required environment variables
if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error(
    'Missing Supabase configuration. Please set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY environment variables.'
  );
}


// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: supabaseStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});

// Helper to get edge function URLs without hardcoding the project URL
export const getEdgeFunctionUrl = (functionName: string): string => {
  return `${SUPABASE_URL}/functions/v1/${functionName}`;
};