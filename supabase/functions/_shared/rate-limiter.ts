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
  const {
    identifier,
    endpoint,
    maxRequests,
    windowMinutes,
  } = config;

  const now = new Date();
  const windowStart = new Date(now.getTime() - windowMinutes * 60 * 1000);

  try {
    // Count requests in current time window
    const { data: violations, error } = await supabaseClient
      .from('rate_limit_violations')
      .select('*')
      .eq('ip_address', identifier)
      .eq('endpoint', endpoint)
      .gte('created_at', windowStart.toISOString());

    if (error && error.code !== 'PGRST116') {
      console.error('[RateLimit] Database error:', error);
      // Fail open (allow request) if database is unavailable
      return {
        allowed: true,
        requestCount: 0,
        retryAfter: 0,
        limit: maxRequests,
      };
    }

    const requestCount = violations?.length || 0;
    const allowed = requestCount < maxRequests;

    // Calculate retry time
    let retryAfter = 0;
    if (!allowed && violations && violations.length > 0) {
      const oldestViolation = violations.reduce((oldest: any, current: any) => {
        return new Date(current.created_at) < new Date(oldest.created_at) ? current : oldest;
      });
      const resetTime = new Date(oldestViolation.created_at).getTime() + windowMinutes * 60 * 1000;
      retryAfter = Math.ceil((resetTime - now.getTime()) / 1000);
    }

    // Log violation if rate limit exceeded
    if (!allowed) {
      await supabaseClient.from('rate_limit_violations').insert({
        ip_address: identifier,
        endpoint,
        requests_made: requestCount + 1,
        limit_value: maxRequests,
        window_minutes: windowMinutes,
        created_at: now.toISOString(),
      });

      console.warn(
        `[RateLimit] Limit exceeded for ${identifier} on ${endpoint}: ${requestCount}/${maxRequests} requests`
      );
    }

    return {
      allowed,
      requestCount,
      retryAfter: retryAfter > 0 ? retryAfter : 0,
      limit: maxRequests,
    };
  } catch (error) {
    console.error('[RateLimit] Unexpected error:', error);
    // Fail open on unexpected errors
    return {
      allowed: true,
      requestCount: 0,
      retryAfter: 0,
      limit: maxRequests,
    };
  }
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
