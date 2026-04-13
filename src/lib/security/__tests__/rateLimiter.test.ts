/**
 * Tests for Client-Side Rate Limiter (US-004)
 *
 * Covers: token consumption, token refill, bucket exhaustion,
 * retry-after calculation, concurrent requests, localStorage persistence.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  RateLimiter,
  createEndpointLimiter,
  DEFAULT_RATE_LIMITS,
} from '../rateLimiter';

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

/** Create a limiter with a small bucket for easier testing. */
function createTestLimiter(
  key = 'test',
  maxTokens = 3,
  refillRate = 1,
  refillInterval = 1000,
) {
  return new RateLimiter(key, { maxTokens, refillRate, refillInterval });
}

// ---------------------------------------------------------------------------
// SETUP
// ---------------------------------------------------------------------------

describe('RateLimiter', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // =========================================================================
  // TOKEN CONSUMPTION
  // =========================================================================

  describe('token consumption', () => {
    it('allows requests when tokens are available', () => {
      const limiter = createTestLimiter('consume-1', 3);
      const result = limiter.checkRateLimit();

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(2);
      expect(result.retryAfter).toBe(0);
    });

    it('decrements remaining tokens on each call', () => {
      const limiter = createTestLimiter('consume-2', 3);

      const r1 = limiter.checkRateLimit();
      expect(r1.remaining).toBe(2);

      const r2 = limiter.checkRateLimit();
      expect(r2.remaining).toBe(1);

      const r3 = limiter.checkRateLimit();
      expect(r3.remaining).toBe(0);
    });

    it('peek does not consume tokens', () => {
      const limiter = createTestLimiter('consume-peek', 3);

      const peek1 = limiter.peek();
      expect(peek1.remaining).toBe(3);
      expect(peek1.allowed).toBe(true);

      const peek2 = limiter.peek();
      expect(peek2.remaining).toBe(3);
    });
  });

  // =========================================================================
  // TOKEN REFILL
  // =========================================================================

  describe('token refill', () => {
    it('refills tokens after the refill interval elapses', () => {
      const limiter = createTestLimiter('refill-1', 3, 1, 1000);

      // Consume all tokens
      limiter.checkRateLimit();
      limiter.checkRateLimit();
      limiter.checkRateLimit();

      expect(limiter.checkRateLimit().allowed).toBe(false);

      // Advance time by one refill interval
      vi.advanceTimersByTime(1000);

      const result = limiter.checkRateLimit();
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(0); // 1 refilled, then consumed = 0
    });

    it('refills multiple tokens when multiple intervals have passed', () => {
      const limiter = createTestLimiter('refill-2', 5, 1, 1000);

      // Consume all 5
      for (let i = 0; i < 5; i++) {
        limiter.checkRateLimit();
      }
      expect(limiter.checkRateLimit().allowed).toBe(false);

      // Advance by 3 intervals -- should refill 3 tokens
      vi.advanceTimersByTime(3000);

      const result = limiter.peek();
      expect(result.remaining).toBe(3);
      expect(result.allowed).toBe(true);
    });

    it('does not exceed maxTokens when refilling', () => {
      const limiter = createTestLimiter('refill-cap', 3, 1, 1000);

      // Consume one token
      limiter.checkRateLimit(); // remaining = 2

      // Wait a very long time
      vi.advanceTimersByTime(60_000);

      const result = limiter.peek();
      expect(result.remaining).toBe(3); // capped at maxTokens
    });

    it('supports refillRate > 1', () => {
      const limiter = createTestLimiter('refill-rate', 10, 2, 1000);

      // Consume all 10
      for (let i = 0; i < 10; i++) {
        limiter.checkRateLimit();
      }

      // Advance 1 interval => should add 2 tokens
      vi.advanceTimersByTime(1000);

      const result = limiter.peek();
      expect(result.remaining).toBe(2);
    });
  });

  // =========================================================================
  // BUCKET EXHAUSTION
  // =========================================================================

  describe('bucket exhaustion', () => {
    it('denies requests when bucket is empty', () => {
      const limiter = createTestLimiter('exhaust-1', 2);

      limiter.checkRateLimit(); // remaining = 1
      limiter.checkRateLimit(); // remaining = 0

      const result = limiter.checkRateLimit();
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('recovers after refill interval passes', () => {
      const limiter = createTestLimiter('exhaust-2', 1, 1, 500);

      limiter.checkRateLimit(); // exhaust
      expect(limiter.checkRateLimit().allowed).toBe(false);

      vi.advanceTimersByTime(500);

      expect(limiter.checkRateLimit().allowed).toBe(true);
    });

    it('denies many consecutive requests after exhaustion', () => {
      const limiter = createTestLimiter('exhaust-3', 1);
      limiter.checkRateLimit(); // exhaust

      for (let i = 0; i < 10; i++) {
        expect(limiter.checkRateLimit().allowed).toBe(false);
      }
    });
  });

  // =========================================================================
  // RETRY-AFTER CALCULATION
  // =========================================================================

  describe('retry-after calculation', () => {
    it('returns 0 when request is allowed', () => {
      const limiter = createTestLimiter('retry-0', 5);
      const result = limiter.checkRateLimit();

      expect(result.retryAfter).toBe(0);
    });

    it('returns positive retry-after when denied', () => {
      const limiter = createTestLimiter('retry-pos', 1, 1, 5000);
      limiter.checkRateLimit(); // exhaust

      const result = limiter.checkRateLimit();
      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeGreaterThan(0);
      expect(result.retryAfter).toBeLessThanOrEqual(5); // 5 seconds max for 5000ms interval
    });

    it('decreases retry-after as time passes', () => {
      const limiter = createTestLimiter('retry-dec', 1, 1, 10_000);
      limiter.checkRateLimit(); // exhaust

      const r1 = limiter.checkRateLimit();

      // Advance 3 seconds
      vi.advanceTimersByTime(3000);

      const r2 = limiter.checkRateLimit();
      expect(r2.retryAfter).toBeLessThan(r1.retryAfter);
    });

    it('returns retry-after in seconds (not milliseconds)', () => {
      const limiter = createTestLimiter('retry-unit', 1, 1, 30_000);
      limiter.checkRateLimit(); // exhaust

      const result = limiter.checkRateLimit();
      // Should be in seconds, so <= 30 for a 30s interval
      expect(result.retryAfter).toBeLessThanOrEqual(30);
      expect(result.retryAfter).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // CONCURRENT REQUESTS (rapid sequential calls)
  // =========================================================================

  describe('concurrent requests', () => {
    it('correctly tracks tokens across rapid sequential calls', () => {
      const limiter = createTestLimiter('concurrent-1', 5);
      const results = [];

      for (let i = 0; i < 7; i++) {
        results.push(limiter.checkRateLimit());
      }

      // First 5 allowed, last 2 denied
      expect(results.filter((r) => r.allowed).length).toBe(5);
      expect(results.filter((r) => !r.allowed).length).toBe(2);
    });

    it('handles burst followed by refill correctly', () => {
      const limiter = createTestLimiter('concurrent-2', 3, 1, 1000);

      // Burst: consume all 3
      limiter.checkRateLimit();
      limiter.checkRateLimit();
      limiter.checkRateLimit();

      // Denied
      expect(limiter.checkRateLimit().allowed).toBe(false);

      // Wait for 2 refills
      vi.advanceTimersByTime(2000);

      // 2 more allowed
      expect(limiter.checkRateLimit().allowed).toBe(true);
      expect(limiter.checkRateLimit().allowed).toBe(true);
      expect(limiter.checkRateLimit().allowed).toBe(false);
    });

    it('multiple independent limiters do not interfere with each other', () => {
      const limiterA = createTestLimiter('independent-a', 2);
      const limiterB = createTestLimiter('independent-b', 2);

      // Exhaust A
      limiterA.checkRateLimit();
      limiterA.checkRateLimit();
      expect(limiterA.checkRateLimit().allowed).toBe(false);

      // B should still be available
      expect(limiterB.checkRateLimit().allowed).toBe(true);
      expect(limiterB.checkRateLimit().allowed).toBe(true);
      expect(limiterB.checkRateLimit().allowed).toBe(false);
    });
  });

  // =========================================================================
  // LOCALSTORAGE PERSISTENCE
  // =========================================================================

  describe('localStorage persistence', () => {
    it('persists state across instances', () => {
      const limiter1 = createTestLimiter('persist-1', 5);
      limiter1.checkRateLimit(); // 4 remaining
      limiter1.checkRateLimit(); // 3 remaining

      // Create new instance with same key -- should load persisted state
      const limiter2 = createTestLimiter('persist-1', 5);
      const result = limiter2.peek();
      expect(result.remaining).toBe(3);
    });

    it('handles corrupted localStorage gracefully', () => {
      localStorage.setItem('brikly_ratelimit_corrupt', 'not json');

      const limiter = createTestLimiter('corrupt', 5);
      const result = limiter.peek();
      // Should start fresh
      expect(result.remaining).toBe(5);
      expect(result.allowed).toBe(true);
    });

    it('handles invalid state values gracefully', () => {
      localStorage.setItem(
        'brikly_ratelimit_invalid',
        JSON.stringify({ tokens: -5, lastRefill: 0 }),
      );

      const limiter = createTestLimiter('invalid', 5);
      const result = limiter.peek();
      // Should start fresh since tokens < 0 is rejected
      expect(result.remaining).toBe(5);
    });

    it('reset restores full bucket', () => {
      const limiter = createTestLimiter('reset-1', 3);
      limiter.checkRateLimit();
      limiter.checkRateLimit();
      limiter.checkRateLimit();

      expect(limiter.checkRateLimit().allowed).toBe(false);

      limiter.reset();

      expect(limiter.peek().remaining).toBe(3);
      expect(limiter.checkRateLimit().allowed).toBe(true);
    });
  });

  // =========================================================================
  // DEFAULT_RATE_LIMITS
  // =========================================================================

  describe('DEFAULT_RATE_LIMITS', () => {
    it('defines auth tier at 5 tokens max', () => {
      expect(DEFAULT_RATE_LIMITS.auth.maxTokens).toBe(5);
    });

    it('defines search tier at 30 tokens max', () => {
      expect(DEFAULT_RATE_LIMITS.search.maxTokens).toBe(30);
    });

    it('defines mutation tier at 60 tokens max', () => {
      expect(DEFAULT_RATE_LIMITS.mutation.maxTokens).toBe(60);
    });

    it('defines read tier at 120 tokens max', () => {
      expect(DEFAULT_RATE_LIMITS.read.maxTokens).toBe(120);
    });

    it('auth refill rate yields ~5 per minute', () => {
      const { refillRate, refillInterval } = DEFAULT_RATE_LIMITS.auth;
      const tokensPerMinute = (60_000 / refillInterval) * refillRate;
      expect(tokensPerMinute).toBe(5);
    });

    it('search refill rate yields ~30 per minute', () => {
      const { refillRate, refillInterval } = DEFAULT_RATE_LIMITS.search;
      const tokensPerMinute = (60_000 / refillInterval) * refillRate;
      expect(tokensPerMinute).toBe(30);
    });

    it('mutation refill rate yields ~60 per minute', () => {
      const { refillRate, refillInterval } = DEFAULT_RATE_LIMITS.mutation;
      const tokensPerMinute = (60_000 / refillInterval) * refillRate;
      expect(tokensPerMinute).toBe(60);
    });

    it('read refill rate yields ~120 per minute', () => {
      const { refillRate, refillInterval } = DEFAULT_RATE_LIMITS.read;
      const tokensPerMinute = (60_000 / refillInterval) * refillRate;
      expect(tokensPerMinute).toBe(120);
    });
  });

  // =========================================================================
  // createEndpointLimiter FACTORY
  // =========================================================================

  describe('createEndpointLimiter', () => {
    it('creates a limiter for a known tier', () => {
      const limiter = createEndpointLimiter('/api/auth/login', 'auth');
      const result = limiter.peek();

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(5); // auth maxTokens
    });

    it('throws for an unknown tier', () => {
      expect(() => createEndpointLimiter('/api/test', 'nonexistent')).toThrow(
        /Unknown tier "nonexistent"/,
      );
    });

    it('creates independent limiters for different URL patterns', () => {
      const loginLimiter = createEndpointLimiter('/api/auth/login', 'auth');
      const signupLimiter = createEndpointLimiter('/api/auth/signup', 'auth');

      // Exhaust login limiter
      for (let i = 0; i < 5; i++) {
        loginLimiter.checkRateLimit();
      }
      expect(loginLimiter.checkRateLimit().allowed).toBe(false);

      // Signup limiter should still have tokens
      expect(signupLimiter.checkRateLimit().allowed).toBe(true);
    });

    it('normalizes URL patterns for safe localStorage keys', () => {
      // Should not throw for URLs with special characters
      const limiter = createEndpointLimiter('/api/v2/projects/*?q=test', 'read');
      expect(limiter.peek().allowed).toBe(true);
    });
  });
});
