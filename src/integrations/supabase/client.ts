// Supabase client configuration for self-hosted infrastructure
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { supabaseStorage } from '@/lib/supabaseStorage';

// Load configuration from environment variables
// SUPABASE_URL points to Kong (handles /auth, /rest, /storage, etc.)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Edge Functions URL (separate deployment for self-hosted)
// Falls back to SUPABASE_URL/functions/v1 if not specified (for backward compatibility)
const EDGE_FUNCTIONS_URL = import.meta.env.VITE_EDGE_FUNCTIONS_URL || `${SUPABASE_URL}/functions/v1`;

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

/**
 * Get edge function URL
 * For self-hosted setup, this points to functions.build-desk.com
 * For cloud setup, this points to your-project.supabase.co/functions/v1
 */
export const getEdgeFunctionUrl = (functionName: string): string => {
  // Remove /v1 suffix if present in EDGE_FUNCTIONS_URL (we'll add it ourselves)
  const baseUrl = EDGE_FUNCTIONS_URL.replace(/\/v1\/?$/, '');
  
  // For self-hosted edge functions (functions.build-desk.com), no /v1 prefix
  // For cloud Supabase, includes /v1 prefix
  const needsV1Prefix = EDGE_FUNCTIONS_URL.includes('/functions/v1');
  
  if (needsV1Prefix) {
    return `${baseUrl}/v1/${functionName}`;
  } else {
    // Self-hosted: direct function call
    return `${baseUrl}/${functionName}`;
  }
};

/**
 * Invoke an edge function
 * Wrapper around supabase.functions.invoke with better error handling
 */
export const invokeEdgeFunction = async <T = any>(
  functionName: string,
  options?: {
    body?: any;
    headers?: Record<string, string>;
  }
): Promise<{ data: T | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase.functions.invoke<T>(functionName, options);
    
    if (error) {
      console.error(`Edge function '${functionName}' error:`, error);
      return { data: null, error };
    }
    
    return { data, error: null };
  } catch (error) {
    console.error(`Edge function '${functionName}' exception:`, error);
    return { 
      data: null, 
      error: error instanceof Error ? error : new Error(String(error)) 
    };
  }
};

/**
 * Configuration info (for debugging)
 */
export const getSupabaseConfig = () => ({
  mainApiUrl: SUPABASE_URL,
  edgeFunctionsUrl: EDGE_FUNCTIONS_URL,
  isSelfHosted: !SUPABASE_URL.includes('supabase.co'),
});

// Log configuration in development
if (import.meta.env.DEV) {
  const config = getSupabaseConfig();
  console.log('Supabase Configuration:', {
    mainApiUrl: config.mainApiUrl,
    edgeFunctionsUrl: config.edgeFunctionsUrl,
    isSelfHosted: config.isSelfHosted,
  });
}
