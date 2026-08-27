import { describe, it, expect, vi } from 'vitest';
import {
  checkRateLimit,
  enforceRateLimit,
  getClientIP,
  rateLimitResponse,
  RATE_LIMITS,
} from './rate-limiter.ts';

/**
 * This exercises the real _shared/rate-limiter.ts against a store that starts
 * empty, which is what production does.
 *
 * It exists because src/lib/__tests__/rateLimiter.test.ts RE-IMPLEMENTS the
 * limiter rather than importing it, and hands the copy a mock pre-seeded with
 * rows. It proved the arithmetic and never asked how a row got into the table.
 * The answer was that none ever did: checkRateLimit counted rows in
 * rate_limit_violations to decide `allowed` and wrote one only when the
 * request was already over the limit, so from an empty table the count stayed
 * at 0 and every request passed. Twenty-odd passing cases could not have
 * caught it (US-307).
 *
 * So: drive the real module, from empty, and count what comes back.
 */

/** A client whose consume_rate_limit behaves like the SQL function. */
function createStore() {
  const windows = new Map<string, { count: number; start: number }>();
  const calls: string[] = [];
  const client = {
    rpc(fn: string, args: Record<string, unknown>) {
      calls.push(fn);
      if (fn !== 'consume_rate_limit') throw new Error(`unexpected rpc ${fn}`);
      const key = `${args.p_identifier}:${args.p_endpoint}`;
      const max = args.p_max_requests as number;
      const lenMs = (args.p_window_minutes as number) * 60_000;
      const now = Date.now();
      let w = windows.get(key);
      if (!w || now - w.start >= lenMs) {
        w = { count: 0, start: now };
        windows.set(key, w);
      }
      w.count += 1;
      const allowed = w.count <= max;
      return Promise.resolve({
        data: [{
          allowed,
          request_count: w.count,
          retry_after: allowed ? 0 : Math.max(1, Math.ceil((w.start + lenMs - now) / 1000)),
        }],
        error: null,
      });
    },
  };
  return { client, calls, windows };
}

const CONFIG = {
  identifier: '203.0.113.7',
  endpoint: 'signup-with-otp',
  maxRequests: 3,
  windowMinutes: 1,
};

describe('checkRateLimit against a store that starts empty', () => {
  it('allows exactly the configured number of requests, then blocks', async () => {
    const { client } = createStore();
    const verdicts: boolean[] = [];
    for (let i = 0; i < 6; i += 1) {
      verdicts.push((await checkRateLimit(client, CONFIG)).allowed);
    }
    expect(verdicts).toEqual([true, true, true, false, false, false]);
  });

  it('blocks the 47 requests beyond a limit of 3', async () => {
    const { client } = createStore();
    let blocked = 0;
    for (let i = 0; i < 50; i += 1) {
      if (!(await checkRateLimit(client, CONFIG)).allowed) blocked += 1;
    }
    expect(blocked).toBe(47);
  });

  it('counts the request being decided, so requestCount reaches the limit', async () => {
    const { client } = createStore();
    const counts: number[] = [];
    for (let i = 0; i < 3; i += 1) {
      counts.push((await checkRateLimit(client, CONFIG)).requestCount);
    }
    expect(counts).toEqual([1, 2, 3]);
  });

  it('reports a positive retryAfter once blocked', async () => {
    const { client } = createStore();
    let last;
    for (let i = 0; i < 4; i += 1) last = await checkRateLimit(client, CONFIG);
    expect(last?.allowed).toBe(false);
    expect(last?.retryAfter).toBeGreaterThan(0);
  });

  it('keeps separate counters per identifier and per endpoint', async () => {
    const { client } = createStore();
    for (let i = 0; i < 4; i += 1) await checkRateLimit(client, CONFIG);
    const other = await checkRateLimit(client, { ...CONFIG, identifier: '198.51.100.2' });
    const otherEndpoint = await checkRateLimit(client, { ...CONFIG, endpoint: 'capture-lead' });
    expect(other.allowed).toBe(true);
    expect(otherEndpoint.allowed).toBe(true);
  });

  it('goes through the RPC, not a table read', async () => {
    // The old implementation selected from rate_limit_violations. A client with
    // no .from() would have thrown; this asserts the new path positively.
    const { client, calls } = createStore();
    await checkRateLimit(client, CONFIG);
    expect(calls).toEqual(['consume_rate_limit']);
  });
});

describe('checkRateLimit when the database is unreachable', () => {
  it('fails open, and says so, rather than taking the endpoint down', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const client = { rpc: () => Promise.resolve({ data: null, error: { message: 'boom' } }) };
    const r = await checkRateLimit(client, CONFIG);
    expect(r.allowed).toBe(true);
    // Failing open silently is what let US-307 sit unnoticed.
    expect(err).toHaveBeenCalled();
    err.mockRestore();
  });

  it('fails open when the function returns no row', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const client = { rpc: () => Promise.resolve({ data: [], error: null }) };
    const r = await checkRateLimit(client, CONFIG);
    expect(r.allowed).toBe(true);
    expect(err).toHaveBeenCalled();
    err.mockRestore();
  });

  it('fails open when the client throws outright', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const client = { rpc: () => { throw new Error('network'); } };
    const r = await checkRateLimit(client, CONFIG);
    expect(r.allowed).toBe(true);
    expect(err).toHaveBeenCalled();
    err.mockRestore();
  });
});

/**
 * These cases moved here from src/lib/__tests__/rateLimiter.test.ts, which
 * re-implemented every one of these functions rather than importing them. A
 * test that reconstructs its subject tests the reconstruction: the copy stayed
 * green while the original never blocked a request.
 */
describe('RATE_LIMITS presets', () => {
  it.each([
    ['AUTH', 10],
    ['AI', 20],
    ['GENERAL', 100],
    ['WEBHOOK', 200],
  ] as const)('%s allows %i per minute', (key, max) => {
    expect(RATE_LIMITS[key].maxRequests).toBe(max);
    expect(RATE_LIMITS[key].windowMinutes).toBe(1);
  });
});

describe('getClientIP', () => {
  const req = (headers: Record<string, string>) =>
    new Request('https://api.brikly.net/x', { headers });

  it('prefers the Cloudflare header', () => {
    expect(getClientIP(req({
      'cf-connecting-ip': '203.0.113.1',
      'x-forwarded-for': '198.51.100.1',
    }))).toBe('203.0.113.1');
  });

  it('takes the first hop of x-forwarded-for', () => {
    expect(getClientIP(req({ 'x-forwarded-for': '203.0.113.2, 10.0.0.1, 10.0.0.2' })))
      .toBe('203.0.113.2');
  });

  it('falls back to x-real-ip', () => {
    expect(getClientIP(req({ 'x-real-ip': '203.0.113.3' }))).toBe('203.0.113.3');
  });

  it('returns unknown when no header identifies the caller', () => {
    expect(getClientIP(req({}))).toBe('unknown');
  });
});

describe('rateLimitResponse', () => {
  const result = { allowed: false, requestCount: 11, retryAfter: 42, limit: 10 };

  it('is a 429 carrying Retry-After', () => {
    const res = rateLimitResponse(result);
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('42');
  });

  it('uses the CLAUDE.md envelope without dropping the older fields', async () => {
    const body = await rateLimitResponse(result).json();
    expect(body.success).toBe(false);
    expect(typeof body.timestamp).toBe('string');
    expect(body.error).toBeTruthy();
    expect(body.retryAfter).toBe(42);
  });

  it('merges CORS headers in', () => {
    const res = rateLimitResponse(result, { 'Access-Control-Allow-Origin': 'https://brikly.net' });
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://brikly.net');
  });
});

describe('enforceRateLimit', () => {
  it('returns null while under the limit and a 429 once over it', async () => {
    const { client } = createStore();
    const preset = { maxRequests: 2, windowMinutes: 1 };
    expect(await enforceRateLimit(client, 'u1', 'ai-estimating', preset)).toBeNull();
    expect(await enforceRateLimit(client, 'u1', 'ai-estimating', preset)).toBeNull();
    const blocked = await enforceRateLimit(client, 'u1', 'ai-estimating', preset);
    expect(blocked).not.toBeNull();
    expect(blocked?.status).toBe(429);
  });
});
