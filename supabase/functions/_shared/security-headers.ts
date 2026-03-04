/**
 * Shared Security Headers Utility for Supabase Edge Functions (US-006)
 *
 * Provides standardized security headers, strict CORS validation,
 * and a secure response factory for all edge function endpoints.
 *
 * Runtime: Deno (Supabase Edge Functions)
 */

// =============================================================================
// ALLOWED ORIGINS
// =============================================================================

const DEFAULT_ALLOWED_ORIGINS = [
  'https://build-desk.com',
  'https://www.build-desk.com',
  'https://builddesk.pearsonperformance.workers.dev',
  'https://builddesk.pages.dev',
];

// Parse custom origins from environment variable (for self-hosted deployments)
const customOriginsEnv = Deno.env.get('ALLOWED_CORS_ORIGINS');
export const ALLOWED_ORIGINS: readonly string[] = (() => {
  const origins = customOriginsEnv
    ? [
        ...new Set([
          ...customOriginsEnv
            .split(',')
            .map((origin) => origin.trim())
            .filter(Boolean),
          ...DEFAULT_ALLOWED_ORIGINS,
        ]),
      ]
    : [...DEFAULT_ALLOWED_ORIGINS];

  // Add localhost only in development
  if (
    Deno.env.get('ENVIRONMENT') === 'development' ||
    Deno.env.get('DEV') === 'true'
  ) {
    origins.push(
      'http://localhost:8080',
      'http://localhost:5173',
      'http://127.0.0.1:8080',
      'http://127.0.0.1:5173',
    );
  }

  return origins;
})();

// =============================================================================
// ORIGIN VALIDATION
// =============================================================================

/**
 * Validates whether a request origin is in the allowed origins list.
 * @param origin - The origin string from the request
 * @returns true if the origin is allowed
 */
export function validateOrigin(origin: string): boolean {
  if (!origin) return false;
  return ALLOWED_ORIGINS.includes(origin);
}

// =============================================================================
// SECURITY HEADERS
// =============================================================================

/**
 * Returns standard security headers that should be present on every response.
 *
 * Headers included:
 * - X-Content-Type-Options: nosniff (prevents MIME-type sniffing)
 * - X-Frame-Options: DENY (prevents clickjacking)
 * - Cache-Control: no-store (prevents caching of auth responses)
 * - X-Request-ID: unique UUID per request for tracing
 */
export function getSecurityHeaders(): Record<string, string> {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Cache-Control': 'no-store',
    'X-Request-ID': crypto.randomUUID(),
  };
}

// =============================================================================
// CORS HEADERS
// =============================================================================

/**
 * Generates CORS headers with strict origin validation against the allowlist.
 * If the request origin is not in ALLOWED_ORIGINS, the first allowed origin
 * is returned (the browser will reject the mismatched origin).
 *
 * @param request - The incoming Request object
 * @returns CORS headers record
 */
export function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('origin') || '';
  const isAllowed = validateOrigin(origin);
  const allowedOrigin = isAllowed ? origin : ALLOWED_ORIGINS[0];

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type, x-api-key, x-request-id',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

// =============================================================================
// SECURE RESPONSE FACTORY
// =============================================================================

/**
 * Creates a Response with all security headers and CORS headers applied.
 *
 * @param body - Response body (string or object; objects are JSON-serialized)
 * @param status - HTTP status code
 * @param request - Optional Request for CORS origin validation. If omitted,
 *                  CORS headers default to the first allowed origin.
 * @returns Response with security and CORS headers
 */
export function createSecureResponse(
  body: string | object,
  status: number,
  request?: Request,
): Response {
  const isObject = typeof body === 'object' && body !== null;
  const responseBody = isObject ? JSON.stringify(body) : body;

  const securityHdrs = getSecurityHeaders();
  const cors = request
    ? corsHeaders(request)
    : {
        'Access-Control-Allow-Origin': ALLOWED_ORIGINS[0],
        'Access-Control-Allow-Headers':
          'authorization, x-client-info, apikey, content-type, x-api-key, x-request-id',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Max-Age': '86400',
        'Vary': 'Origin',
      };

  const headers: Record<string, string> = {
    ...securityHdrs,
    ...cors,
  };

  if (isObject) {
    headers['Content-Type'] = 'application/json';
  }

  return new Response(responseBody, { status, headers });
}
