/**
 * Unit tests for the rate limiter shared utility
 * Tests the core logic used by supabase/functions/_shared/rate-limiter.ts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Re-implement the core rate limiter logic for testing (since the original is Deno)
interface RateLimitConfig {
  identifier: string;
  endpoint: string;
  maxRequests: number;
  windowMinutes: number;
}

interface RateLimitResult {
  allowed: boolean;
  requestCount: number;
  retryAfter: number;
  limit: number;
}

const RATE_LIMITS = {
  AUTH: { maxRequests: 10, windowMinutes: 1 },
  AI: { maxRequests: 20, windowMinutes: 1 },
  GENERAL: { maxRequests: 100, windowMinutes: 1 },
  WEBHOOK: { maxRequests: 200, windowMinutes: 1 },
} as const;

async function checkRateLimit(
  supabaseClient: { from: (table: string) => { select: (...args: unknown[]) => { eq: (...args: unknown[]) => { eq: (...args: unknown[]) => { gte: (...args: unknown[]) => Promise<{ data: unknown[] | null; error: { code?: string; message?: string } | null }> } } } }; insert: (data: unknown) => Promise<{ error: unknown }> } },
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const { identifier, endpoint, maxRequests, windowMinutes } = config;
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowMinutes * 60 * 1000);

  try {
    const { data: violations, error } = await supabaseClient
      .from('rate_limit_violations')
      .select('*')
      .eq('ip_address', identifier)
      .eq('endpoint', endpoint)
      .gte('created_at', windowStart.toISOString());

    if (error && error.code !== 'PGRST116') {
      return { allowed: true, requestCount: 0, retryAfter: 0, limit: maxRequests };
    }

    const requestCount = (violations as unknown[] | null)?.length || 0;
    const allowed = requestCount < maxRequests;

    let retryAfter = 0;
    if (!allowed && violations && (violations as unknown[]).length > 0) {
      const typedViolations = violations as Array<{ created_at: string }>;
      const oldestViolation = typedViolations.reduce((oldest, current) => {
        return new Date(current.created_at) < new Date(oldest.created_at) ? current : oldest;
      });
      const resetTime = new Date(oldestViolation.created_at).getTime() + windowMinutes * 60 * 1000;
      retryAfter = Math.ceil((resetTime - now.getTime()) / 1000);
    }

    if (!allowed) {
      await supabaseClient.from('rate_limit_violations').insert({
        ip_address: identifier,
        endpoint,
        requests_made: requestCount + 1,
        limit_value: maxRequests,
        window_minutes: windowMinutes,
        created_at: now.toISOString(),
      });
    }

    return { allowed, requestCount, retryAfter: retryAfter > 0 ? retryAfter : 0, limit: maxRequests };
  } catch {
    return { allowed: true, requestCount: 0, retryAfter: 0, limit: maxRequests };
  }
}

function getClientIP(headers: Map<string, string>): string {
  const cfIP = headers.get('cf-connecting-ip');
  if (cfIP) return cfIP;
  const xForwardedFor = headers.get('x-forwarded-for');
  if (xForwardedFor) return xForwardedFor.split(',')[0].trim();
  const xRealIP = headers.get('x-real-ip');
  if (xRealIP) return xRealIP;
  return 'unknown';
}

function rateLimitResponse(result: RateLimitResult): { status: number; retryAfter: string; body: { error: string } } {
  return {
    status: 429,
    retryAfter: String(result.retryAfter),
    body: { error: 'Rate limit exceeded' },
  };
}

// Mock Supabase client factory
function createMockSupabase(violations: Array<{ created_at: string }> = [], error: { code?: string; message?: string } | null = null) {
  const insertFn = vi.fn().mockResolvedValue({ error: null });
  return {
    client: {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockResolvedValue({ data: violations, error }),
            }),
          }),
        }),
        insert: insertFn,
      }),
    },
    insertFn,
  };
}

describe('Rate Limiter', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('RATE_LIMITS presets', () => {
    it('defines AUTH limits at 10 req/min', () => {
      expect(RATE_LIMITS.AUTH).toEqual({ maxRequests: 10, windowMinutes: 1 });
    });

    it('defines AI limits at 20 req/min', () => {
      expect(RATE_LIMITS.AI).toEqual({ maxRequests: 20, windowMinutes: 1 });
    });

    it('defines GENERAL limits at 100 req/min', () => {
      expect(RATE_LIMITS.GENERAL).toEqual({ maxRequests: 100, windowMinutes: 1 });
    });

    it('defines WEBHOOK limits at 200 req/min', () => {
      expect(RATE_LIMITS.WEBHOOK).toEqual({ maxRequests: 200, windowMinutes: 1 });
    });
  });

  describe('checkRateLimit', () => {
    it('allows requests under the limit', async () => {
      const { client } = createMockSupabase([
        { created_at: new Date().toISOString() },
        { created_at: new Date().toISOString() },
      ]);

      const result = await checkRateLimit(client, {
        identifier: '192.168.1.1',
        endpoint: 'test-endpoint',
        maxRequests: 10,
        windowMinutes: 1,
      });

      expect(result.allowed).toBe(true);
      expect(result.requestCount).toBe(2);
      expect(result.limit).toBe(10);
    });

    it('blocks requests at the limit', async () => {
      const violations = Array.from({ length: 10 }, () => ({
        created_at: new Date().toISOString(),
      }));
      const { client, insertFn } = createMockSupabase(violations);

      const result = await checkRateLimit(client, {
        identifier: '192.168.1.1',
        endpoint: 'test-endpoint',
        maxRequests: 10,
        windowMinutes: 1,
      });

      expect(result.allowed).toBe(false);
      expect(result.requestCount).toBe(10);
      expect(result.limit).toBe(10);
      expect(insertFn).toHaveBeenCalled();
    });

    it('returns retryAfter > 0 when blocked', async () => {
      const pastTime = new Date(Date.now() - 30 * 1000).toISOString(); // 30 seconds ago
      const violations = Array.from({ length: 10 }, () => ({
        created_at: pastTime,
      }));
      const { client } = createMockSupabase(violations);

      const result = await checkRateLimit(client, {
        identifier: '192.168.1.1',
        endpoint: 'test-endpoint',
        maxRequests: 10,
        windowMinutes: 1,
      });

      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeGreaterThan(0);
      expect(result.retryAfter).toBeLessThanOrEqual(60);
    });

    it('fails open on database error', async () => {
      const { client } = createMockSupabase([], { code: '500', message: 'Database unavailable' });

      const result = await checkRateLimit(client, {
        identifier: '192.168.1.1',
        endpoint: 'test-endpoint',
        maxRequests: 10,
        windowMinutes: 1,
      });

      expect(result.allowed).toBe(true);
      expect(result.requestCount).toBe(0);
    });

    it('ignores PGRST116 error (no rows)', async () => {
      const { client } = createMockSupabase([], { code: 'PGRST116', message: 'No rows' });

      const result = await checkRateLimit(client, {
        identifier: '192.168.1.1',
        endpoint: 'test-endpoint',
        maxRequests: 10,
        windowMinutes: 1,
      });

      expect(result.allowed).toBe(true);
      expect(result.requestCount).toBe(0);
    });

    it('allows zero violations', async () => {
      const { client } = createMockSupabase([]);

      const result = await checkRateLimit(client, {
        identifier: 'user-123',
        endpoint: 'ai-content-generator',
        ...RATE_LIMITS.AI,
      });

      expect(result.allowed).toBe(true);
      expect(result.requestCount).toBe(0);
    });

    it('respects different limits per endpoint type', async () => {
      const violations = Array.from({ length: 15 }, () => ({
        created_at: new Date().toISOString(),
      }));
      const { client: authClient } = createMockSupabase(violations);
      const { client: aiClient } = createMockSupabase(violations);

      const authResult = await checkRateLimit(authClient, {
        identifier: '192.168.1.1',
        endpoint: 'verify-auth-otp',
        ...RATE_LIMITS.AUTH, // 10 req/min
      });

      const aiResult = await checkRateLimit(aiClient, {
        identifier: 'user-123',
        endpoint: 'ai-content-generator',
        ...RATE_LIMITS.AI, // 20 req/min
      });

      expect(authResult.allowed).toBe(false); // 15 > 10
      expect(aiResult.allowed).toBe(true); // 15 < 20
    });

    it('does not insert violation record when allowed', async () => {
      const { client, insertFn } = createMockSupabase([
        { created_at: new Date().toISOString() },
      ]);

      await checkRateLimit(client, {
        identifier: '192.168.1.1',
        endpoint: 'test-endpoint',
        maxRequests: 10,
        windowMinutes: 1,
      });

      expect(insertFn).not.toHaveBeenCalled();
    });

    it('inserts violation record when blocked', async () => {
      const violations = Array.from({ length: 10 }, () => ({
        created_at: new Date().toISOString(),
      }));
      const { client, insertFn } = createMockSupabase(violations);

      await checkRateLimit(client, {
        identifier: '192.168.1.1',
        endpoint: 'test-endpoint',
        maxRequests: 10,
        windowMinutes: 1,
      });

      expect(insertFn).toHaveBeenCalledWith(
        expect.objectContaining({
          ip_address: '192.168.1.1',
          endpoint: 'test-endpoint',
          requests_made: 11,
          limit_value: 10,
          window_minutes: 1,
        })
      );
    });
  });

  describe('getClientIP', () => {
    it('extracts Cloudflare IP', () => {
      const headers = new Map([['cf-connecting-ip', '1.2.3.4']]);
      expect(getClientIP(headers)).toBe('1.2.3.4');
    });

    it('extracts X-Forwarded-For IP (first in chain)', () => {
      const headers = new Map([['x-forwarded-for', '1.2.3.4, 5.6.7.8']]);
      expect(getClientIP(headers)).toBe('1.2.3.4');
    });

    it('extracts X-Real-IP', () => {
      const headers = new Map([['x-real-ip', '10.0.0.1']]);
      expect(getClientIP(headers)).toBe('10.0.0.1');
    });

    it('falls back to unknown', () => {
      const headers = new Map<string, string>();
      expect(getClientIP(headers)).toBe('unknown');
    });

    it('prefers Cloudflare over X-Forwarded-For', () => {
      const headers = new Map([
        ['cf-connecting-ip', '1.2.3.4'],
        ['x-forwarded-for', '5.6.7.8'],
      ]);
      expect(getClientIP(headers)).toBe('1.2.3.4');
    });
  });

  describe('rateLimitResponse', () => {
    it('returns 429 status', () => {
      const result: RateLimitResult = {
        allowed: false,
        requestCount: 10,
        retryAfter: 30,
        limit: 10,
      };

      const response = rateLimitResponse(result);
      expect(response.status).toBe(429);
    });

    it('includes Retry-After header value', () => {
      const result: RateLimitResult = {
        allowed: false,
        requestCount: 10,
        retryAfter: 45,
        limit: 10,
      };

      const response = rateLimitResponse(result);
      expect(response.retryAfter).toBe('45');
    });

    it('includes error message in body', () => {
      const result: RateLimitResult = {
        allowed: false,
        requestCount: 10,
        retryAfter: 30,
        limit: 10,
      };

      const response = rateLimitResponse(result);
      expect(response.body.error).toBe('Rate limit exceeded');
    });
  });
});
