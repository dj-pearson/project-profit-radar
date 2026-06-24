/**
 * Client-Side Rate Limiter (US-004)
 *
 * Implements Token Bucket algorithm for client-side rate limiting.
 * Persists state across page navigations via localStorage.
 *
 * This is a defense-in-depth measure complementing server-side rate limiting.
 * It reduces unnecessary network requests and provides immediate user feedback
 * when limits are approached.
 *
 * IMPORTANT: Client-side rate limiting is NOT a security boundary.
 * Server-side enforcement (supabase/functions/_shared/rate-limiter.ts) is authoritative.
 */

// =============================================================================
// TYPES
// =============================================================================

export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Seconds until the next token is available (0 if allowed) */
  retryAfter: number;
  /** Number of tokens remaining in the bucket */
  remaining: number;
}

export interface RateLimiterConfig {
  /** Maximum number of tokens in the bucket */
  maxTokens: number;
  /** Number of tokens to add per refill */
  refillRate: number;
  /** Interval between refills in milliseconds */
  refillInterval: number;
}

interface PersistedState {
  tokens: number;
  lastRefill: number;
}

// =============================================================================
// STORAGE KEY PREFIX
// =============================================================================

const STORAGE_KEY_PREFIX = 'brikly_ratelimit_';

// =============================================================================
// RATE LIMITER CLASS
// =============================================================================

export class RateLimiter {
  private readonly config: RateLimiterConfig;
  private readonly storageKey: string;
  private tokens: number;
  private lastRefill: number;

  constructor(key: string, config: RateLimiterConfig) {
    this.config = config;
    this.storageKey = `${STORAGE_KEY_PREFIX}${key}`;
    this.tokens = config.maxTokens;
    this.lastRefill = Date.now();

    this.loadState();
  }

  /**
   * Check if a request is allowed and consume a token if so.
   * Does NOT throw -- always returns a result object.
   */
  checkRateLimit(): RateLimitResult {
    this.refill();

    if (this.tokens < 1) {
      const retryAfter = this.calculateRetryAfter();
      this.saveState();
      return {
        allowed: false,
        retryAfter,
        remaining: 0,
      };
    }

    this.tokens -= 1;
    this.saveState();

    return {
      allowed: true,
      retryAfter: 0,
      remaining: Math.floor(this.tokens),
    };
  }

  /**
   * Peek at the current state without consuming a token.
   */
  peek(): RateLimitResult {
    this.refill();

    if (this.tokens < 1) {
      return {
        allowed: false,
        retryAfter: this.calculateRetryAfter(),
        remaining: 0,
      };
    }

    return {
      allowed: true,
      retryAfter: 0,
      remaining: Math.floor(this.tokens),
    };
  }

  /**
   * Reset the rate limiter to its initial state.
   */
  reset(): void {
    this.tokens = this.config.maxTokens;
    this.lastRefill = Date.now();
    this.saveState();
  }

  // ---------------------------------------------------------------------------
  // PRIVATE METHODS
  // ---------------------------------------------------------------------------

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;

    if (elapsed <= 0) {
      return;
    }

    const refillCount = Math.floor(elapsed / this.config.refillInterval);

    if (refillCount > 0) {
      this.tokens = Math.min(
        this.config.maxTokens,
        this.tokens + refillCount * this.config.refillRate,
      );
      this.lastRefill = this.lastRefill + refillCount * this.config.refillInterval;
    }
  }

  private calculateRetryAfter(): number {
    // Time until the next token is added, in seconds
    const now = Date.now();
    const timeSinceLastRefill = now - this.lastRefill;
    const timeUntilNextRefill = this.config.refillInterval - timeSinceLastRefill;
    return Math.max(0, Math.ceil(timeUntilNextRefill / 1000));
  }

  private loadState(): void {
    try {
      if (typeof localStorage === 'undefined') {
        return;
      }
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) {
        return;
      }
      const state: PersistedState = JSON.parse(raw);
      if (
        typeof state.tokens === 'number' &&
        typeof state.lastRefill === 'number' &&
        state.tokens >= 0 &&
        state.tokens <= this.config.maxTokens &&
        state.lastRefill > 0
      ) {
        this.tokens = state.tokens;
        this.lastRefill = state.lastRefill;
      }
    } catch {
      // Corrupted state -- start fresh
      this.tokens = this.config.maxTokens;
      this.lastRefill = Date.now();
    }
  }

  private saveState(): void {
    try {
      if (typeof localStorage === 'undefined') {
        return;
      }
      const state: PersistedState = {
        tokens: this.tokens,
        lastRefill: this.lastRefill,
      };
      localStorage.setItem(this.storageKey, JSON.stringify(state));
    } catch {
      // localStorage may be full or disabled -- silently ignore
    }
  }
}

// =============================================================================
// DEFAULT RATE LIMIT TIERS
// =============================================================================

/**
 * Default rate limit configurations by tier.
 *
 * - auth:     5 requests per minute  (login, signup, password reset)
 * - search:   30 requests per minute (search, autocomplete)
 * - mutation:  60 requests per minute (create, update, delete)
 * - read:     120 requests per minute (list, get, fetch)
 */
export const DEFAULT_RATE_LIMITS: Record<string, RateLimiterConfig> = {
  auth: {
    maxTokens: 5,
    refillRate: 1,
    refillInterval: 12_000, // 1 token every 12s = 5/min
  },
  search: {
    maxTokens: 30,
    refillRate: 1,
    refillInterval: 2_000, // 1 token every 2s = 30/min
  },
  mutation: {
    maxTokens: 60,
    refillRate: 1,
    refillInterval: 1_000, // 1 token every 1s = 60/min
  },
  read: {
    maxTokens: 120,
    refillRate: 2,
    refillInterval: 1_000, // 2 tokens every 1s = 120/min
  },
} as const;

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Create a rate limiter configured for a specific endpoint and tier.
 *
 * @param urlPattern - URL pattern or endpoint identifier (e.g. "/api/auth/*")
 * @param tier - Rate limit tier key from DEFAULT_RATE_LIMITS (auth, search, mutation, read)
 * @returns Configured RateLimiter instance
 *
 * @example
 * ```ts
 * const authLimiter = createEndpointLimiter('/api/auth/login', 'auth');
 * const result = authLimiter.checkRateLimit();
 * if (!result.allowed) {
 *   toast.error(`Too many requests. Retry in ${result.retryAfter}s.`);
 * }
 * ```
 */
export function createEndpointLimiter(urlPattern: string, tier: string): RateLimiter {
  const config = DEFAULT_RATE_LIMITS[tier];
  if (!config) {
    throw new Error(
      `[RateLimiter] Unknown tier "${tier}". Valid tiers: ${Object.keys(DEFAULT_RATE_LIMITS).join(', ')}`,
    );
  }

  // Normalize the URL pattern into a safe localStorage key segment
  const safeKey = urlPattern.replace(/[^a-zA-Z0-9_-]/g, '_');
  const key = `${tier}_${safeKey}`;

  return new RateLimiter(key, config);
}
