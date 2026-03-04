/**
 * Edge Function Security Headers - Frontend Types (US-006)
 *
 * TypeScript type definitions documenting the security headers
 * returned by Supabase Edge Functions. These types help frontend
 * code understand and work with the headers set by the shared
 * security-headers utility in supabase/functions/_shared/.
 */

// =============================================================================
// SECURITY HEADER NAMES
// =============================================================================

/**
 * Union type of all security header names returned by edge functions.
 */
export type SecurityHeaderName =
  | 'X-Content-Type-Options'
  | 'X-Frame-Options'
  | 'Cache-Control'
  | 'X-Request-ID'
  | 'Access-Control-Allow-Origin'
  | 'Access-Control-Allow-Headers'
  | 'Access-Control-Allow-Methods'
  | 'Access-Control-Max-Age'
  | 'Vary';

// =============================================================================
// SECURITY HEADERS INTERFACE
// =============================================================================

/**
 * Interface documenting all security headers expected on edge function responses.
 *
 * Security headers:
 * - X-Content-Type-Options: Prevents MIME-type sniffing attacks
 * - X-Frame-Options: Prevents clickjacking by denying framing
 * - Cache-Control: Prevents caching of sensitive auth endpoint responses
 * - X-Request-ID: Unique request identifier for tracing and debugging
 *
 * CORS headers:
 * - Access-Control-Allow-Origin: Validated against server-side allowlist
 * - Access-Control-Allow-Headers: Permitted request headers
 * - Access-Control-Allow-Methods: Permitted HTTP methods
 * - Access-Control-Max-Age: Preflight cache duration in seconds
 * - Vary: Ensures correct caching per origin
 */
export interface SecurityHeaders {
  /** Prevents MIME-type sniffing; always "nosniff" */
  'X-Content-Type-Options': 'nosniff';

  /** Prevents clickjacking; always "DENY" */
  'X-Frame-Options': 'DENY';

  /** Prevents caching of auth responses; always "no-store" */
  'Cache-Control': 'no-store';

  /** Unique request identifier (UUID v4) for distributed tracing */
  'X-Request-ID': string;

  /** Validated origin from the server-side allowlist */
  'Access-Control-Allow-Origin': string;

  /** Comma-separated list of allowed request headers */
  'Access-Control-Allow-Headers': string;

  /** Comma-separated list of allowed HTTP methods */
  'Access-Control-Allow-Methods': string;

  /** Preflight response cache duration in seconds */
  'Access-Control-Max-Age': string;

  /** Indicates response varies by Origin header for proper caching */
  'Vary': 'Origin';
}
