import { describe, it, expect, vi } from 'vitest';
import { checkRateLimit, hashIdentifier, RATE_LIMITS } from './rate-limiter';

/**
 * A stand-in for public.consume_rate_limit(): counts attempts per
 * (endpoint, identifier) in a sliding window and records the allowed ones,
 * which is the behaviour the RPC implements in SQL.
 */
function fakeSupabase(opts: { failWith?: unknown } = {}) {
  const attempts: Array<{ key: string; at: number }> = [];
  let now = 0;
  const client = {
    calls: 0,
    advanceMinutes(m: number) { now += m * 60_000; },
    rpc(name: string, args: Record<string, unknown>) {
      client.calls++;
      if (opts.failWith) return Promise.resolve({ data: null, error: opts.failWith });
      expect(name).toBe('consume_rate_limit');
      const key = `${args.p_endpoint}|${args.p_identifier}`;
      const windowMs = (args.p_window_minutes as number) * 60_000;
      const live = attempts.filter((a) => a.key === key && a.at >= now - windowMs);
      const max = args.p_max_requests as number;
      if (live.length >= max) {
        const oldest = Math.min(...live.map((a) => a.at));
        return Promise.resolve({
          data: {
            allowed: false,
            request_count: live.length,
            retry_after: Math.max(1, Math.ceil((oldest + windowMs - now) / 1000)),
            limit: max,
          },
          error: null,
        });
      }
      attempts.push({ key, at: now });
      return Promise.resolve({
        data: { allowed: true, request_count: live.length + 1, retry_after: 0, limit: max },
        error: null,
      });
    },
  };
  return client;
}

const OTP = { endpoint: 'verify-auth-otp:code', ...RATE_LIMITS.OTP_VERIFY };

describe('checkRateLimit (IOS-004)', () => {
  it('blocks the sixth attempt in the window', async () => {
    const db = fakeSupabase();
    const cfg = { identifier: 'a@example.test', ...OTP };
    for (let i = 1; i <= 5; i++) {
      const r = await checkRateLimit(db, cfg);
      expect(r.allowed, `attempt ${i} should be allowed`).toBe(true);
      expect(r.requestCount).toBe(i);
    }
    const sixth = await checkRateLimit(db, cfg);
    expect(sixth.allowed).toBe(false);
    expect(sixth.limit).toBe(5);
    expect(sixth.retryAfter).toBeGreaterThan(0);
  });

  it('counts allowed attempts, not just violations', async () => {
    // The regression this guards: the old implementation only wrote a row once
    // the limit was already exceeded, so the count never left zero and the
    // limiter allowed an unbounded number of requests.
    const db = fakeSupabase();
    const cfg = { identifier: 'b@example.test', ...OTP };
    const results = [];
    for (let i = 0; i < 20; i++) results.push(await checkRateLimit(db, cfg));
    expect(results.filter((r) => r.allowed)).toHaveLength(5);
  });

  it('lets the caller back in once the window has passed', async () => {
    const db = fakeSupabase();
    const cfg = { identifier: 'c@example.test', ...OTP };
    for (let i = 0; i < 5; i++) await checkRateLimit(db, cfg);
    expect((await checkRateLimit(db, cfg)).allowed).toBe(false);
    db.advanceMinutes(16);
    expect((await checkRateLimit(db, cfg)).allowed).toBe(true);
  });

  it('keeps separate budgets per identifier and per endpoint', async () => {
    const db = fakeSupabase();
    for (let i = 0; i < 5; i++) await checkRateLimit(db, { identifier: 'd@example.test', ...OTP });
    expect((await checkRateLimit(db, { identifier: 'd@example.test', ...OTP })).allowed).toBe(false);
    // A different account is unaffected...
    expect((await checkRateLimit(db, { identifier: 'e@example.test', ...OTP })).allowed).toBe(true);
    // ...as is the same account on a different endpoint.
    expect(
      (await checkRateLimit(db, { identifier: 'd@example.test', endpoint: 'other', ...RATE_LIMITS.OTP_VERIFY })).allowed
    ).toBe(true);
  });

  it('denies the request when the database is unreachable and failClosed is set', async () => {
    const db = fakeSupabase({ failWith: new Error('connection refused') });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const r = await checkRateLimit(db, { identifier: 'f@example.test', ...OTP });
    expect(r.allowed).toBe(false);
    expect(r.retryAfter).toBe(15 * 60);
    vi.restoreAllMocks();
  });

  it('still serves the request when the database is unreachable and failClosed is not set', async () => {
    const db = fakeSupabase({ failWith: new Error('connection refused') });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const r = await checkRateLimit(db, {
      identifier: '203.0.113.9', endpoint: 'capture-lead', ...RATE_LIMITS.GENERAL,
    });
    expect(r.allowed).toBe(true);
    vi.restoreAllMocks();
  });

  it('fails closed on the OTP_VERIFY preset by default', () => {
    expect(RATE_LIMITS.OTP_VERIFY).toMatchObject({
      maxRequests: 5, windowMinutes: 15, failClosed: true,
    });
  });
});

describe('hashIdentifier', () => {
  it('is stable, case-insensitive and does not echo the input', async () => {
    const a = await hashIdentifier('Person@Example.test');
    const b = await hashIdentifier('  person@example.test  ');
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).not.toContain('person');
  });

  it('separates different addresses', async () => {
    expect(await hashIdentifier('one@example.test')).not.toBe(await hashIdentifier('two@example.test'));
  });
});
