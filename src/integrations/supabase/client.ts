// Supabase client configuration for self-hosted infrastructure
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { supabaseStorage } from '@/lib/supabaseStorage';

// Load configuration from environment variables
// SUPABASE_URL points to Kong (handles /auth, /rest, /storage, etc.)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// SECURITY: Validate required environment variables in production
// In production, missing credentials should fail loudly rather than falling back to insecure defaults
if (import.meta.env.PROD) {
  if (!SUPABASE_URL) {
    throw new Error(
      'CRITICAL SECURITY ERROR: VITE_SUPABASE_URL environment variable is required in production. ' +
      'Application cannot start without proper Supabase configuration.'
    );
  }
  if (!SUPABASE_PUBLISHABLE_KEY) {
    throw new Error(
      'CRITICAL SECURITY ERROR: VITE_SUPABASE_PUBLISHABLE_KEY environment variable is required in production. ' +
      'Application cannot start without proper Supabase configuration.'
    );
  }
}

// Development fallbacks - only used when env vars are not set in development mode
const DEV_FALLBACK_URL = 'https://api.build-desk.com';
const RESOLVED_SUPABASE_URL = SUPABASE_URL || DEV_FALLBACK_URL;
const RESOLVED_SUPABASE_KEY = SUPABASE_PUBLISHABLE_KEY || '';

// Edge Functions URL (separate deployment for self-hosted)
// Falls back to SUPABASE_URL/functions/v1 if not specified (for backward compatibility)
const EDGE_FUNCTIONS_URL = import.meta.env.VITE_EDGE_FUNCTIONS_URL || `${RESOLVED_SUPABASE_URL}/functions/v1`;

// Log warning in development if using fallback values
if (import.meta.env.DEV && (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY)) {
  console.warn(
    '[SECURITY WARNING] Using development fallback Supabase configuration. ' +
    'Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY environment variables for proper configuration.'
  );
}

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(RESOLVED_SUPABASE_URL, RESOLVED_SUPABASE_KEY, {
  auth: {
    storage: supabaseStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    // Override functions URL for self-hosted setup
    fetch: (url, options) => {
      // If it's a functions call, redirect to our edge functions server
      const urlString = url.toString();
      if (urlString.includes('/functions/v1/')) {
        const functionPath = urlString.split('/functions/v1/')[1];
        const newUrl = `${EDGE_FUNCTIONS_URL}/${functionPath}`;
        return fetch(newUrl, options);
      }
      return fetch(url, options);
    }
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
  mainApiUrl: RESOLVED_SUPABASE_URL,
  edgeFunctionsUrl: EDGE_FUNCTIONS_URL,
  isSelfHosted: !RESOLVED_SUPABASE_URL.includes('supabase.co'),
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
