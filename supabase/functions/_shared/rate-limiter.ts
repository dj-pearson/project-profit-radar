/**
 * Rate Limiting Middleware for Supabase Edge Functions
 *
 * Security: Protects public endpoints from abuse, brute force, and DoS attacks
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
  /**
   * Deny the request when the limiter itself cannot reach the database.
   *
   * Defaults to false (fail open) because for most endpoints a database
   * outage should degrade throughput, not availability. Set it on anything
   * where an unlimited retry budget is the attack -- OTP and password
   * verification above all.
   */
  failClosed?: boolean;
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
 * Check if a request should be rate limited, and record the attempt.
 *
 * Delegates counting to the consume_rate_limit() RPC so the read and the write
 * happen in one round trip against public.rate_limit_attempts.
 *
 * The previous implementation counted rows in rate_limit_violations but only
 * inserted one after the limit was already exceeded. Nothing ever incremented
 * the count, so `allowed` was unconditionally true and no caller was limited.
 *
 * Requires a service-role client: rate_limit_attempts has RLS on with no
 * policies, and EXECUTE on the RPC is granted to service_role only.
 */
export async function checkRateLimit(
  supabaseClient: any,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const {
    identifier,
    endpoint,
    maxRequests,
    windowMinutes,
    failClosed = false,
  } = config;

  const onError = (): RateLimitResult => ({
    allowed: !failClosed,
    requestCount: 0,
    retryAfter: failClosed ? windowMinutes * 60 : 0,
    limit: maxRequests,
  });

  try {
    const { data, error } = await supabaseClient.rpc('consume_rate_limit', {
      p_identifier: identifier,
      p_endpoint: endpoint,
      p_max_requests: maxRequests,
      p_window_minutes: windowMinutes,
    });

    if (error || !data) {
      console.error('[RateLimit] consume_rate_limit failed:', error);
      return onError();
    }

    const result: RateLimitResult = {
      allowed: data.allowed === true,
      requestCount: Number(data.request_count ?? 0),
      retryAfter: Number(data.retry_after ?? 0),
      limit: Number(data.limit ?? maxRequests),
    };

    if (!result.allowed) {
      console.warn(
        `[RateLimit] Limit exceeded for ${endpoint}: ${result.requestCount}/${result.limit} requests`
      );
    }

    return result;
  } catch (error) {
    console.error('[RateLimit] Unexpected error:', error);
    return onError();
  }
}

/**
 * Derive a non-reversible rate-limit key from user-supplied input.
 *
 * Rate limiting on an email or user id is what makes a limit survive an
 * attacker rotating IPs, but the raw value must not be persisted -- the
 * attempts table would otherwise become a list of addresses that tried to
 * reset a password. Callers should namespace the result, e.g.
 * `email:${await hashIdentifier(email)}`.
 */
export async function hashIdentifier(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value.trim().toLowerCase());
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
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
  /**
   * OTP / password-reset code verification: 5 attempts per 15 minutes.
   * A 6-digit code is only as strong as the number of guesses allowed, so
   * this is applied per email as well as per IP, and fails closed.
   */
  OTP_VERIFY: { maxRequests: 5, windowMinutes: 15, failClosed: true },
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
      error: 'Rate limit exceeded',
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
