/**
 * Rate Limiting Middleware for Supabase Edge Functions
 *
 * Security: Protects public endpoints from abuse, brute force, and DoS attacks.
 * Backed by the consume_rate_limit RPC over rate_limit_state, which increments
 * and decides atomically. Pass a SERVICE-ROLE client: rate_limit_state is
 * service-role-only (US-306) and EXECUTE on the function is granted to
 * service_role alone, so one caller cannot burn another caller's quota.
 *
 * Usage:
 * ```typescript
 * import { checkRateLimit } from '../_shared/rate-limiter.ts';
 *
 * const rateLimitResult = await checkRateLimit(supabaseClient, {
 *   identifier: ip_address,
 *   endpoint: 'capture-lead',
 *   maxRequests: 10,
 *   windowMinutes: 1,
 * });
 *
 * if (!rateLimitResult.allowed) {
 *   return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
 *     status: 429,
 *     headers: { 'Retry-After': String(rateLimitResult.retryAfter) }
 *   });
 * }
 * ```
 */

export interface RateLimitConfig {
  /** Unique identifier (IP address, user ID, etc.) */
  identifier: string;
  /** Endpoint name for tracking */
  endpoint: string;
  /** Maximum requests allowed in time window */
  maxRequests: number;
  /** Time window in minutes */
  windowMinutes: number;
}

export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Number of requests made in current window */
  requestCount: number;
  /** Time in seconds until rate limit resets */
  retryAfter: number;
  /** Maximum requests allowed */
  limit: number;
}

/**
 * Check if a request should be rate limited
 * Security: Prevents abuse by limiting requests per time window
 */
export async function checkRateLimit(
  supabaseClient: any,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const { identifier, endpoint, maxRequests, windowMinutes } = config;

  try {
    // US-307: this used to count rows in rate_limit_violations and insert one
    // only when the request was already over the limit, so from an empty table
    // the count was 0, every request passed, and no row was ever written. It
    // could not bootstrap, and no limit in the system had ever blocked
    // anything. consume_rate_limit increments the counter in rate_limit_state
    // and returns the decision in one atomic step - the increment has to
    // happen inside the same lock as the read, or two concurrent requests both
    // read the same count and both pass.
    const { data, error } = await supabaseClient.rpc('consume_rate_limit', {
      p_identifier: identifier,
      p_endpoint: endpoint,
      p_max_requests: maxRequests,
      p_window_minutes: windowMinutes,
    });

    if (error) {
      // Fail open, deliberately: a limiter that 500s when the database is
      // unreachable takes the endpoint down with it. Logged loudly because the
      // previous version failed open silently and nobody noticed for a year.
      console.error('[RateLimit] consume_rate_limit failed, allowing request:', error);
      return { allowed: true, requestCount: 0, retryAfter: 0, limit: maxRequests };
    }

    // The function RETURNS TABLE, so PostgREST hands back an array of one row.
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) {
      console.error('[RateLimit] consume_rate_limit returned no row, allowing request');
      return { allowed: true, requestCount: 0, retryAfter: 0, limit: maxRequests };
    }

    if (!row.allowed) {
      console.warn(
        `[RateLimit] Limit exceeded for ${identifier} on ${endpoint}: ${row.request_count}/${maxRequests} requests`
      );
    }

    return {
      allowed: Boolean(row.allowed),
      requestCount: Number(row.request_count) || 0,
      retryAfter: Math.max(0, Number(row.retry_after) || 0),
      limit: maxRequests,
    };
  } catch (err) {
    console.error('[RateLimit] Unexpected error, allowing request:', err);
    return { allowed: true, requestCount: 0, retryAfter: 0, limit: maxRequests };
  }
}

/** Preset rate limit configurations by endpoint type */
export const RATE_LIMITS = {
  /** Auth endpoints: 10 requests per minute per IP */
  AUTH: { maxRequests: 10, windowMinutes: 1 },
  /** AI endpoints: 20 requests per minute per user */
  AI: { maxRequests: 20, windowMinutes: 1 },
  /** General API: 100 requests per minute */
  GENERAL: { maxRequests: 100, windowMinutes: 1 },
  /** Webhook endpoints: 200 requests per minute (server-to-server) */
  WEBHOOK: { maxRequests: 200, windowMinutes: 1 },
} as const;

/**
 * Create a 429 Too Many Requests response with Retry-After header
 */
export function rateLimitResponse(
  result: RateLimitResult,
  corsHeaders: Record<string, string> = {}
): Response {
  return new Response(
    JSON.stringify({
      // CLAUDE.md's API response shape. success and timestamp were added
      // alongside the existing fields rather than replacing them (US-243), so a
      // client already reading error/retryAfter keeps working.
      success: false,
      error: 'Rate limit exceeded',
      timestamp: new Date().toISOString(),
      retryAfter: result.retryAfter,
      limit: result.limit,
      requestCount: result.requestCount,
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Retry-After': String(result.retryAfter),
        'X-RateLimit-Limit': String(result.limit),
        'X-RateLimit-Remaining': '0',
      },
    }
  );
}

/**
 * Get client IP address from request headers
 * Security: Extracts real IP even behind proxies/CDNs
 */
export function getClientIP(req: Request): string {
  // Try Cloudflare header first
  const cfIP = req.headers.get('cf-connecting-ip');
  if (cfIP) return cfIP;

  // Try X-Forwarded-For (may contain multiple IPs)
  const xForwardedFor = req.headers.get('x-forwarded-for');
  if (xForwardedFor) {
    // Take the first IP (client IP before proxies)
    return xForwardedFor.split(',')[0].trim();
  }

  // Try X-Real-IP
  const xRealIP = req.headers.get('x-real-ip');
  if (xRealIP) return xRealIP;

  // Fallback to unknown
  return 'unknown';
}

/**
 * Enforce a rate limit for one caller and return a 429 if they are over it.
 *
 *   const limited = await enforceRateLimit(serviceClient, user.id, 'voice-to-text', RATE_LIMITS.AI, corsHeaders);
 *   if (limited) return limited;
 *
 * Pass a SERVICE-ROLE client. rate_limit_violations is not the caller's to read
 * or write, and using their JWT would make the limit depend on RLS — which is
 * the wrong thing for a limit to depend on.
 *
 * Prefer a user id as the identifier over an IP. An IP limit is shared by
 * everyone behind one corporate NAT, and a compromised token sidesteps it by
 * moving address. Fall back to IP only where there is no authenticated user.
 *
 * Note checkRateLimit() returns allowed when it cannot reach the database, so a
 * limiter outage never blocks legitimate traffic. That trade is deliberate: for
 * a cost control, failing open beats taking the product down. It does mean a
 * database outage removes the ceiling, which is why the expensive calls behind
 * these limits should also have provider-side spend caps.
 */
export async function enforceRateLimit(
  // deno-lint-ignore no-explicit-any
  serviceClient: any,
  identifier: string,
  endpoint: string,
  preset: { maxRequests: number; windowMinutes: number },
  corsHeaders: Record<string, string> = {},
): Promise<Response | null> {
  const result = await checkRateLimit(serviceClient, {
    identifier,
    endpoint,
    ...preset,
  });
  return result.allowed ? null : rateLimitResponse(result, corsHeaders);
}
