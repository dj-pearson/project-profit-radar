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
  /** Identifier kind for logging/columns. Inferred from the identifier shape when omitted. */
  identifierType?: 'ip' | 'user' | 'api_key';
  /** HTTP method recorded for the security dashboard (default 'POST'). */
  method?: string;
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

const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;
const looksLikeIp = (v: string) => IPV4.test(v) || (v.includes(':') && !v.includes(' '));
const inferIdentifierType = (identifier: string): 'ip' | 'user' | 'api_key' =>
  looksLikeIp(identifier) ? 'ip' : 'user';

/**
 * Sliding-window rate limit backed by the `rate_limit_state` counter table.
 *
 * IMPORTANT: pass a SERVICE-ROLE Supabase client. RLS on `rate_limit_state`
 * only lets the system (service role) read/write the counters; a user-scoped
 * client cannot SELECT the table and the limiter would silently fail open.
 *
 * Every request increments the window counter. (The previous implementation
 * only wrote a row to `rate_limit_violations` AFTER a request was already over
 * the limit, and then counted that same table — so the counter never grew on
 * normal traffic and the limiter could never actually block. This rewrite fixes
 * that.) On infrastructure error it fails open so a transient DB issue never
 * hard-locks the product; security-sensitive callers should treat a working
 * limit as defense-in-depth, not the sole control.
 */
export async function checkRateLimit(
  supabaseClient: any,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const { identifier, endpoint, maxRequests, windowMinutes } = config;
  const identifierType = config.identifierType ?? inferIdentifierType(identifier);
  const method = config.method ?? 'POST';

  const now = new Date();
  const windowMs = windowMinutes * 60 * 1000;
  const windowStartThreshold = new Date(now.getTime() - windowMs);

  const failOpen: RateLimitResult = {
    allowed: true,
    requestCount: 0,
    retryAfter: 0,
    limit: maxRequests,
  };

  try {
    // Find the active (non-expired) window for this identifier + endpoint.
    const { data: rows, error } = await supabaseClient
      .from('rate_limit_state')
      .select('id, request_count, window_start')
      .eq('identifier', identifier)
      .eq('endpoint', endpoint)
      .gte('window_start', windowStartThreshold.toISOString())
      .order('window_start', { ascending: false })
      .limit(1);

    if (error) {
      console.error('[RateLimit] Database error (failing open):', error);
      return failOpen;
    }

    const current = rows && rows.length > 0 ? rows[0] : null;

    // No active window — this request opens a fresh window as request #1.
    if (!current) {
      await supabaseClient.from('rate_limit_state').insert({
        identifier,
        identifier_type: identifierType,
        endpoint,
        method,
        request_count: 1,
        window_start: now.toISOString(),
        last_request: now.toISOString(),
      });
      return { allowed: maxRequests >= 1, requestCount: 1, retryAfter: 0, limit: maxRequests };
    }

    const newCount = (current.request_count ?? 0) + 1;
    const allowed = newCount <= maxRequests;
    const resetTime = new Date(current.window_start).getTime() + windowMs;
    const retryAfter = Math.max(0, Math.ceil((resetTime - now.getTime()) / 1000));

    // Record this request against the current window (every request, allowed or not).
    await supabaseClient
      .from('rate_limit_state')
      .update({
        request_count: newCount,
        last_request: now.toISOString(),
        is_blocked: !allowed,
        blocked_until: allowed ? null : new Date(resetTime).toISOString(),
        updated_at: now.toISOString(),
      })
      .eq('id', current.id);

    if (!allowed) {
      // Best-effort log to the violations table for the security dashboard.
      supabaseClient
        .from('rate_limit_violations')
        .insert({
          identifier,
          identifier_type: identifierType,
          ip_address: identifierType === 'ip' && looksLikeIp(identifier) ? identifier : null,
          endpoint,
          method,
          requests_made: newCount,
          limit_exceeded_by: newCount - maxRequests,
          time_window_seconds: windowMinutes * 60,
          action_taken: 'blocked',
        })
        .then(undefined, (e: unknown) => console.error('[RateLimit] violation log failed:', e));

      console.warn(
        `[RateLimit] ${identifierType}:${identifier} blocked on ${endpoint}: ${newCount}/${maxRequests}`
      );
    }

    return {
      allowed,
      requestCount: newCount,
      retryAfter: allowed ? 0 : retryAfter,
      limit: maxRequests,
    };
  } catch (error) {
    console.error('[RateLimit] Unexpected error (failing open):', error);
    return failOpen;
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
