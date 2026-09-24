import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  blocklistFilter,
  clearIpDecisionCache,
  decideIpAccess,
  formatIp,
  guardAnonymousRequest,
  ipInCidr,
  lookupIpDecision,
  parseIp,
  rejectBlockedIp,
  type IpAccessEntry,
} from './ip-guard.ts';
import { RATE_LIMITS } from './rate-limiter.ts';

/**
 * US-205. ip_access_control is what the admin Rate Limiting dashboard writes,
 * and until this module nothing read it. These drive the real decision logic
 * and the real guard against a fake client, including the throttled path the
 * story asks to see demonstrated: requests past the ceiling get 429, and a
 * blacklisted address gets 403 before the limiter is even asked.
 */

const NOW = Date.parse('2026-09-24T12:00:00Z');

function entry(over: Partial<IpAccessEntry>): IpAccessEntry {
  return {
    access_type: 'blacklist',
    ip_address: null,
    ip_range: null,
    is_active: true,
    expires_at: null,
    ...over,
  };
}

describe('parseIp', () => {
  it('parses IPv4 and IPv6, and folds IPv4-mapped v6 to v4', () => {
    expect(parseIp('203.0.113.7')).toEqual({ version: 4, value: 0xcb007107n });
    expect(parseIp(' 2001:DB8::1 ')?.version).toBe(6);
    expect(parseIp('::ffff:203.0.113.7')).toEqual(parseIp('203.0.113.7'));
    expect(formatIp(parseIp('2001:db8::1')!)).toBe('2001:db8:0:0:0:0:0:1');
  });

  it('rejects what is not an address', () => {
    for (const bad of ['unknown', '', '1.2.3', '1.2.3.256', '01.2.3.4', '1.2.3.4:80',
      'example.com', '1::2::3', '1:2:3:4:5:6:7:8:9', '1:2:3:4:5:6:7::8', null, undefined]) {
      expect(parseIp(bad as string), String(bad)).toBeNull();
    }
  });
});

describe('ipInCidr', () => {
  const ip = parseIp('10.1.2.3')!;
  it('matches ranges and exact addresses', () => {
    expect(ipInCidr(ip, '10.0.0.0/8')).toBe(true);
    expect(ipInCidr(ip, '10.1.2.0/24')).toBe(true);
    expect(ipInCidr(ip, '10.1.3.0/24')).toBe(false);
    expect(ipInCidr(ip, '10.1.2.3')).toBe(true);
    expect(ipInCidr(ip, '10.1.2.3/32')).toBe(true);
    expect(ipInCidr(ip, '0.0.0.0/0')).toBe(true);
    expect(ipInCidr(ip, '::ffff:10.1.2.0/120')).toBe(true);
  });

  it('never matches across families or on garbage', () => {
    expect(ipInCidr(ip, '::/0')).toBe(false);
    expect(ipInCidr(parseIp('2001:db8::5')!, '2001:db8::/32')).toBe(true);
    expect(ipInCidr(parseIp('2001:db9::5')!, '2001:db8::/32')).toBe(false);
    for (const bad of ['10.0.0.0/33', '10.0.0.0/x', '10.0.0.0/8/8', 'nope', '', null]) {
      expect(ipInCidr(ip, bad), String(bad)).toBe(false);
    }
  });
});

describe('decideIpAccess', () => {
  it('blocks an exact blacklist hit and a range hit', () => {
    expect(decideIpAccess('203.0.113.7', [entry({ ip_address: '203.0.113.7' })], NOW).action).toBe('block');
    expect(decideIpAccess('203.0.113.7', [entry({ ip_address: '203.0.113.0', ip_range: '203.0.113.0/24' })], NOW).action).toBe('block');
  });

  it('ignores inactive and expired rows', () => {
    expect(decideIpAccess('203.0.113.7', [entry({ ip_address: '203.0.113.7', is_active: false })], NOW).action).toBe('allow');
    expect(decideIpAccess('203.0.113.7', [entry({ ip_address: '203.0.113.7', expires_at: '2026-09-24T11:59:59Z' })], NOW).action).toBe('allow');
    expect(decideIpAccess('203.0.113.7', [entry({ ip_address: '203.0.113.7', expires_at: '2026-09-24T12:00:01Z' })], NOW).action).toBe('block');
  });

  it('lets a whitelist row carve an address out of a blocked range', () => {
    const rows = [
      entry({ ip_address: '203.0.113.0', ip_range: '203.0.113.0/24' }),
      entry({ access_type: 'whitelist', ip_address: '203.0.113.7' }),
    ];
    expect(decideIpAccess('203.0.113.7', rows, NOW)).toEqual({ action: 'allow', reason: 'whitelisted' });
    expect(decideIpAccess('203.0.113.8', rows, NOW).action).toBe('block');
  });

  it('allows an address it cannot parse (the limiter still counts it)', () => {
    expect(decideIpAccess('unknown', [entry({ ip_range: '0.0.0.0/0' })], NOW).reason).toBe('unparseable-ip');
  });
});

describe('blocklistFilter', () => {
  it('only ever interpolates a canonical address', () => {
    expect(blocklistFilter(parseIp('::ffff:1.2.3.4')!)).toBe('ip_address.eq.1.2.3.4,ip_range.not.is.null');
    expect(blocklistFilter(parseIp('2001:db8::1')!)).toMatch(/^ip_address\.eq\.[0-9a-f:]+,ip_range\.not\.is\.null$/);
  });
});

/** A client with an ip_access_control table and a consume_rate_limit rpc. */
function fakeClient(rows: IpAccessEntry[], opts: { lookupError?: boolean } = {}) {
  const counts = new Map<string, number>();
  const lookups: string[] = [];
  const client = {
    from(table: string) {
      expect(table).toBe('ip_access_control');
      const q = {
        select: () => q,
        eq: () => q,
        or: (f: string) => { lookups.push(f); return q; },
        limit: () => Promise.resolve(opts.lookupError
          ? { data: null, error: { message: 'boom' } }
          : { data: rows, error: null }),
      };
      return q;
    },
    rpc(fn: string, args: Record<string, unknown>) {
      expect(fn).toBe('consume_rate_limit');
      const key = `${args.p_identifier}:${args.p_endpoint}`;
      const n = (counts.get(key) ?? 0) + 1;
      counts.set(key, n);
      const allowed = n <= (args.p_max_requests as number);
      return Promise.resolve({ data: [{ allowed, request_count: n, retry_after: allowed ? 0 : 42 }], error: null });
    },
  };
  return { client, counts, lookups };
}

const req = (ip: string) => new Request('https://functions.brikly.net/x', { headers: { 'cf-connecting-ip': ip } });

describe('guardAnonymousRequest', () => {
  beforeEach(() => {
    clearIpDecisionCache();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('throttles past the ceiling with a 429 in the API envelope', async () => {
    const { client } = fakeClient([]);
    const statuses: number[] = [];
    for (let i = 0; i < 12; i += 1) {
      const res = await guardAnonymousRequest(client, req('198.51.100.9'), { endpoint: 'capture-lead', limit: RATE_LIMITS.AUTH });
      statuses.push(res ? res.status : 200);
    }
    expect(statuses).toEqual([...Array(10).fill(200), 429, 429]);
    const res = await guardAnonymousRequest(client, req('198.51.100.9'), { endpoint: 'capture-lead', limit: RATE_LIMITS.AUTH });
    const body = await res!.json();
    expect(body).toMatchObject({ success: false, error: 'Rate limit exceeded' });
    expect(typeof body.timestamp).toBe('string');
    expect(res!.headers.get('Retry-After')).toBe('42');
  });

  it('does not let one caller spend another caller\'s quota', async () => {
    const { client } = fakeClient([]);
    for (let i = 0; i < 20; i += 1) {
      await guardAnonymousRequest(client, req('198.51.100.9'), { endpoint: 'capture-lead', limit: RATE_LIMITS.AUTH });
    }
    expect(await guardAnonymousRequest(client, req('198.51.100.10'), { endpoint: 'capture-lead', limit: RATE_LIMITS.AUTH })).toBeNull();
  });

  it('403s a blacklisted address before the limiter is consulted', async () => {
    const { client, counts } = fakeClient([entry({ ip_address: '203.0.113.0', ip_range: '203.0.113.0/24' })]);
    const res = await guardAnonymousRequest(client, req('203.0.113.7'), { endpoint: 'capture-lead', limit: RATE_LIMITS.AUTH });
    expect(res!.status).toBe(403);
    expect(await res!.json()).toMatchObject({ success: false, error: 'Access denied' });
    expect(counts.size).toBe(0);
  });

  it('with no limit, applies the blocklist only', async () => {
    const { client, counts } = fakeClient([]);
    for (let i = 0; i < 50; i += 1) {
      expect(await guardAnonymousRequest(client, req('198.51.100.9'), { endpoint: 'sso-saml-callback' })).toBeNull();
    }
    expect(counts.size).toBe(0);
  });

  it('fails open when the blocklist cannot be read', async () => {
    const { client } = fakeClient([], { lookupError: true });
    expect(await rejectBlockedIp(client, req('203.0.113.7'), 'capture-lead')).toBeNull();
  });

  it('caches a decision per address so a flood costs one lookup', async () => {
    const { client, lookups } = fakeClient([entry({ ip_address: '203.0.113.7' })]);
    for (let i = 0; i < 25; i += 1) {
      expect((await rejectBlockedIp(client, req('203.0.113.7'), 'capture-lead'))!.status).toBe(403);
    }
    expect(lookups).toHaveLength(1);
  });

  it('re-reads the table once the cache entry is 30s old', async () => {
    const { client, lookups } = fakeClient([]);
    await lookupIpDecision(client, '203.0.113.7', NOW);
    await lookupIpDecision(client, '203.0.113.7', NOW + 29_000);
    await lookupIpDecision(client, '203.0.113.7', NOW + 31_000);
    expect(lookups).toHaveLength(2);
  });
});
