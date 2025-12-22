/**
 * Shared authentication helpers for Edge Functions
 *
 * Usage:
 * import { initializeAuthContext, errorResponse, successResponse } from '../_shared/auth-helpers.ts';
 *
 * const authContext = await initializeAuthContext(req);
 * if (!authContext) return errorResponse('Unauthorized', 401);
 *
 * const { user, supabase } = authContext;
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { getCorsHeaders } from './secure-cors.ts';

// Default secure CORS headers (fallback when request not available)
const DEFAULT_SECURE_CORS = {
  'Access-Control-Allow-Origin': 'https://build-desk.com',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

export interface AuthContext {
  user: any;
  supabase: SupabaseClient;
}

/**
 * Initialize authenticated Supabase client
 *
 * @param req - The incoming request
 * @returns AuthContext with user and authenticated supabase client, or null if auth fails
 */
export async function initializeAuthContext(
  req: Request
): Promise<AuthContext | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    console.error('[Auth] Missing Authorization header');
    return null;
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    {
      global: {
        headers: { Authorization: authHeader },
      },
    }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    console.error('[Auth] Failed to get user:', authError);
    return null;
  }

  console.log(`[Auth] User ${user.email} authenticated`);

  return { user, supabase };
}

/**
 * Return a standardized error response
 * SECURITY: Uses secure CORS (whitelist-based) instead of wildcard
 *
 * @param message - Error message (keep generic to avoid info disclosure)
 * @param status - HTTP status code (default: 400)
 * @param request - Optional request for CORS header generation
 * @returns Response object
 */
export function errorResponse(
  message: string,
  status: number = 400,
  request?: Request
): Response {
  const corsHeaders = request ? getCorsHeaders(request) : DEFAULT_SECURE_CORS;
  return new Response(
    JSON.stringify({
      error: message,
      success: false,
      timestamp: new Date().toISOString(),
    }),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    }
  );
}

/**
 * Return a standardized success response
 * SECURITY: Uses secure CORS (whitelist-based) instead of wildcard
 *
 * @param data - Response data
 * @param request - Optional request for CORS header generation
 * @returns Response object
 */
export function successResponse(data: any, request?: Request): Response {
  const corsHeaders = request ? getCorsHeaders(request) : DEFAULT_SECURE_CORS;
  return new Response(
    JSON.stringify({
      data,
      success: true,
      timestamp: new Date().toISOString(),
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    }
  );
}

/**
 * Verify user has access to a specific company
 *
 * @param supabase - Authenticated Supabase client
 * @param userId - User ID
 * @param companyId - Company ID to check
 * @returns true if user has access, false otherwise
 */
export async function verifyCompanyAccess(
  supabase: SupabaseClient,
  userId: string,
  companyId: string
): Promise<boolean> {
  // Try user_profiles table first
  const { data: userProfile, error: profileError } = await supabase
    .from('user_profiles')
    .select('company_id')
    .eq('id', userId)
    .eq('company_id', companyId)
    .single();

  if (!profileError && userProfile) {
    return true;
  }

  // Fallback to profiles table if user_profiles doesn't exist
  const { data: profile, error: altError } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('user_id', userId)
    .eq('company_id', companyId)
    .single();

  return !altError && !!profile;
}

/**
 * Get user's role within their company
 *
 * @param supabase - Authenticated Supabase client
 * @param userId - User ID
 * @returns User's role or null
 */
export async function getUserRole(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  // Try user_profiles table first
  const { data: userProfile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (userProfile?.role) {
    return userProfile.role;
  }

  // Fallback to profiles table
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', userId)
    .single();

  return profile?.role || null;
}

/**
 * Check if user is an admin (admin or root_admin)
 *
 * @param supabase - Authenticated Supabase client
 * @param userId - User ID
 * @returns true if user is admin, false otherwise
 */
export async function isAdmin(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const role = await getUserRole(supabase, userId);
  return role === 'admin' || role === 'root_admin';
}

/**
 * Check if user is a root admin
 *
 * @param supabase - Authenticated Supabase client
 * @param userId - User ID
 * @returns true if user is root_admin, false otherwise
 */
export async function isRootAdmin(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data: userProfile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (userProfile?.role === 'root_admin') {
    return true;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', userId)
    .single();

  return profile?.role === 'root_admin';
}

/**
 * Handle CORS preflight requests
 * SECURITY: Uses secure CORS (whitelist-based) instead of wildcard
 *
 * @param request - Optional request for CORS header generation
 * @returns Response for OPTIONS request
 */
export function corsResponse(request?: Request): Response {
  const corsHeaders = request ? getCorsHeaders(request) : DEFAULT_SECURE_CORS;
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

/**
 * Wrapper for Edge Function handlers with automatic auth and CORS
 * SECURITY: Uses secure CORS and sanitizes error messages
 *
 * Usage:
 * export default withAuth(async (req, authContext) => {
 *   const { user, supabase } = authContext;
 *   // Your function logic here
 *   return successResponse({ message: 'Hello from ' + user.email }, req);
 * });
 */
export function withAuth(
  handler: (req: Request, authContext: AuthContext) => Promise<Response>
) {
  return async (req: Request): Promise<Response> => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return corsResponse(req);
    }

    // Initialize auth context
    const authContext = await initializeAuthContext(req);
    if (!authContext) {
      return errorResponse('Unauthorized', 401, req);
    }

    try {
      return await handler(req, authContext);
    } catch (error) {
      console.error('[Error]', error);
      // SECURITY: Don't expose internal error details to clients
      return errorResponse('An error occurred processing your request', 500, req);
    }
  };
}

