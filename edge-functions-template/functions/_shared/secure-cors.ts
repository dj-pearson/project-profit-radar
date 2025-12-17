/**
 * CORS Configuration for Supabase Edge Functions
 * SECURITY: Whitelist-based approach to prevent unauthorized access
 */

// Whitelist of allowed origins
const ALLOWED_ORIGINS = [
  'https://build-desk.com',
  'https://www.build-desk.com',
  'https://builddesk.pearsonperformance.workers.dev',
  'https://builddesk.pages.dev', // Cloudflare Pages preview
];

// Add localhost only in development
if (Deno.env.get('ENVIRONMENT') === 'development' || Deno.env.get('DEV') === 'true') {
  ALLOWED_ORIGINS.push('http://localhost:8080');
  ALLOWED_ORIGINS.push('http://localhost:5173'); // Vite default
  ALLOWED_ORIGINS.push('http://127.0.0.1:8080');
  ALLOWED_ORIGINS.push('http://127.0.0.1:5173');
}

/**
 * Get CORS headers based on request origin
 * @param request - The incoming request
 * @returns CORS headers object
 */
export const getCorsHeaders = (request: Request) => {
  const origin = request.headers.get('origin') || '';

  // Check if origin is in whitelist
  const isAllowed = ALLOWED_ORIGINS.includes(origin);
  const allowedOrigin = isAllowed ? origin : ALLOWED_ORIGINS[0];

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Max-Age': '86400', // 24 hours
    'Vary': 'Origin', // Important for caching
  };
};

/**
 * Standard CORS headers for responses (legacy support)
 * DEPRECATED: Use getCorsHeaders() instead for whitelist-based CORS
 */
export const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGINS[0],
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

/**
 * Check if origin is allowed
 * @param origin - Origin to check
 * @returns true if origin is allowed
 */
export const isOriginAllowed = (origin: string): boolean => {
  return ALLOWED_ORIGINS.includes(origin);
};

/**
 * Handle OPTIONS preflight request
 * @param request - The incoming request
 * @returns Response with CORS headers
 */
export const handleCorsPreflightRequest = (request: Request): Response => {
  return new Response(null, {
    headers: getCorsHeaders(request),
    status: 204,
  });
};
