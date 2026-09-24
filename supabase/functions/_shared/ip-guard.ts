/**
 * The front door for anonymous edge functions (US-205).
 *
 * Two controls, applied in this order by guardAnonymousRequest():
 *
 *   1. The IP blocklist. ip_access_control is what the admin Rate Limiting
 *      dashboard (src/pages/RateLimitingDashboard.tsx) writes when someone
 *      blacklists an address or a CIDR range. Until US-205 nothing read it, so
 *      a block an admin added did nothing. A blacklisted caller now gets 403
 *      before the handler touches anything else. A whitelist entry beats a
 *      blacklist entry for the same address, so an admin can carve an office
 *      out of a blocked range; it does NOT lift the rate limit.
 *
 *   2. The per-IP ceiling, via the shared consume_rate_limit limiter in
 *      rate-limiter.ts, which also records every refusal in
 *      rate_limit_violations. Optional: the OAuth and SAML callbacks take the
 *      blocklist but not a ceiling (see check-anonymous-writes.mjs for why).
 *
 * This replaced the dos-protection edge function, which nothing called, and
 * whose helpers referenced a corsHeaders that was out of scope, so every action
 * but a validation failure would have thrown.
 *
 * The blocklist lookup fails OPEN: a database hiccup must not turn every
 * anonymous endpoint into a 403. The rate limiter is the fail-closed layer for
 * writers that need one (pass failClosed).
 *
 * Everything above the "I/O" line is pure and tested in ip-guard.test.ts.
 */
import { checkRateLimit, getClientIP, rateLimitResponse } from './rate-limiter.ts';

// ---------------------------------------------------------------- pure logic

export type IpVersion = 4 | 6;
export interface ParsedIp {
  version: IpVersion;
  /** 32 bits for v4, 128 bits for v6. */
  value: bigint;
}

/** Parse a dotted-quad IPv4 address. Rejects leading zeros and out-of-range octets. */
function parseIPv4(s: string): bigint | null {
  const parts = s.split('.');
  if (parts.length !== 4) return null;
  let v = 0n;
  for (const p of parts) {
    if (!/^(0|[1-9][0-9]{0,2})$/.test(p)) return null;
    const n = Number(p);
    if (n > 255) return null;
    v = (v << 8n) | BigInt(n);
  }
  return v;
}

/** Parse an IPv6 address, including :: compression and a trailing dotted quad. */
function parseIPv6(input: string): bigint | null {
  let s = input;
  const zone = s.indexOf('%');
  if (zone !== -1) s = s.slice(0, zone);
  if (!/^[0-9a-f:.]+$/.test(s)) return null;

  let tailV4: bigint | null = null;
  const lastColon = s.lastIndexOf(':');
  if (s.includes('.')) {
    tailV4 = parseIPv4(s.slice(lastColon + 1));
    if (tailV4 === null) return null;
    s = s.slice(0, lastColon + 1) + '0:0';
  }

  const halves = s.split('::');
  if (halves.length > 2) return null;
  const toGroups = (h: string) => (h === '' ? [] : h.split(':'));
  const head = toGroups(halves[0]);
  const tail = halves.length === 2 ? toGroups(halves[1]) : [];
  // '::' stands for at least one zero group, so at most 7 may be written out.
  if (halves.length === 2 && head.length + tail.length > 7) return null;
  const groups = halves.length === 2
    ? [...head, ...Array(8 - head.length - tail.length).fill('0'), ...tail]
    : head;
  if (groups.length !== 8) return null;

  let v = 0n;
  for (const g of groups) {
    if (!/^[0-9a-f]{1,4}$/.test(g)) return null;
    v = (v << 16n) | BigInt(parseInt(g, 16));
  }
  if (tailV4 !== null) v = (v & ~0xffffffffn) | tailV4;
  return v;
}

const V4_MAPPED_PREFIX = 0xffffn << 32n;

/**
 * Parse an IP address. IPv4-mapped IPv6 (::ffff:1.2.3.4) is folded to IPv4, so
 * a block on 1.2.3.4 also catches a caller the proxy reports in mapped form.
 * Returns null for anything that is not an address - 'unknown', a hostname, an
 * address with a port.
 */
export function parseIp(raw: string | null | undefined): ParsedIp | null {
  if (typeof raw !== 'string') return null;
  const s = raw.trim().toLowerCase();
  if (s === '' || s.length > 64) return null;
  if (!s.includes(':')) {
    const v4 = parseIPv4(s);
    return v4 === null ? null : { version: 4, value: v4 };
  }
  const v6 = parseIPv6(s);
  if (v6 === null) return null;
  if (v6 >> 32n === 0xffffn) return { version: 4, value: v6 & 0xffffffffn };
  return { version: 6, value: v6 };
}

/** Canonical text form, used as the Postgres filter value. */
export function formatIp(ip: ParsedIp): string {
  if (ip.version === 4) {
    const v = ip.value;
    return [24n, 16n, 8n, 0n].map((s) => String((v >> s) & 0xffn)).join('.');
  }
  const groups: string[] = [];
  for (let i = 7; i >= 0; i--) groups.push(((ip.value >> BigInt(i * 16)) & 0xffffn).toString(16));
  return groups.join(':');
}

/**
 * Does `ip` fall inside `cidr`? Accepts '10.0.0.0/8', '2001:db8::/32', or a bare
 * address (an exact match). Postgres returns cidr/inet columns in this text
 * form. Anything unparseable matches nothing.
 */
export function ipInCidr(ip: ParsedIp, cidr: string | null | undefined): boolean {
  if (typeof cidr !== 'string') return false;
  const [addr, bitsRaw, extra] = cidr.trim().split('/');
  if (extra !== undefined) return false;
  const net = parseIp(addr);
  if (!net || net.version !== ip.version) {
    // A v4 network written in mapped v6 form parses as v4 above; anything else
    // across families cannot match.
    return false;
  }
  const width = ip.version === 4 ? 32 : 128;
  let bits = width;
  if (bitsRaw !== undefined) {
    if (!/^[0-9]{1,3}$/.test(bitsRaw)) return false;
    bits = Number(bitsRaw);
    // A v4 network written as ::ffff:a.b.c.d/120 carries a v6 prefix length.
    if (net.version === 4 && addr.includes(':')) bits -= 96;
    if (bits < 0 || bits > width) return false;
  }
  if (bits === 0) return true;
  const shift = BigInt(width - bits);
  return (ip.value >> shift) === (net.value >> shift);
}

export interface IpAccessEntry {
  access_type: string | null;
  ip_address: string | null;
  ip_range: string | null;
  is_active: boolean | null;
  expires_at: string | null;
}

export type IpDecision =
  | { action: 'allow'; reason: 'no-entry' | 'whitelisted' | 'unparseable-ip' }
  | { action: 'block'; reason: 'blacklisted'; entry: IpAccessEntry };

function entryMatches(ip: ParsedIp, e: IpAccessEntry, nowMs: number): boolean {
  if (e.is_active === false) return false;
  if (e.expires_at) {
    const exp = Date.parse(e.expires_at);
    if (!Number.isNaN(exp) && exp <= nowMs) return false;
  }
  return ipInCidr(ip, e.ip_address) || ipInCidr(ip, e.ip_range);
}

/**
 * Decide from the ip_access_control rows whether this caller is let in. Inactive
 * and expired rows are ignored; a matching whitelist row wins over a matching
 * blacklist row. A caller whose IP cannot be parsed is allowed here - the rate
 * limiter still counts them, under the 'unknown' bucket they all share.
 */
export function decideIpAccess(
  rawIp: string | null | undefined,
  entries: readonly IpAccessEntry[],
  nowMs: number = Date.now(),
): IpDecision {
  const ip = parseIp(rawIp);
  if (!ip) return { action: 'allow', reason: 'unparseable-ip' };
  const live = entries.filter((e) => entryMatches(ip, e, nowMs));
  if (live.some((e) => e.access_type === 'whitelist')) return { action: 'allow', reason: 'whitelisted' };
  const block = live.find((e) => e.access_type === 'blacklist');
  if (block) return { action: 'block', reason: 'blacklisted', entry: block };
  return { action: 'allow', reason: 'no-entry' };
}

/**
 * PostgREST `or` filter selecting the rows that can possibly match this IP: an
 * exact ip_address match, or any row with a range (ranges are checked in
 * decideIpAccess, since PostgREST has no containment operator for cidr). The
 * value is our own canonical formatting of a parsed address, so it contains
 * only hex digits, dots and colons and needs no quoting.
 */
export function blocklistFilter(ip: ParsedIp): string {
  return `ip_address.eq.${formatIp(ip)},ip_range.not.is.null`;
}

export function blockedResponse(corsHeaders: Record<string, string> = {}): Response {
  return new Response(
    JSON.stringify({ success: false, error: 'Access denied', timestamp: new Date().toISOString() }),
    { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
}

// ---------------------------------------------------------------------- I/O

const CACHE_TTL_MS = 30_000;
const CACHE_MAX = 5_000;
const cache = new Map<string, { at: number; decision: IpDecision }>();

/** Test hook. */
export function clearIpDecisionCache(): void {
  cache.clear();
}

/**
 * Look the caller's IP up in ip_access_control and decide. Cached per isolate
 * for 30 seconds so a flood from one address costs one query, not one per
 * request; a new block therefore takes up to 30s to bite. Pass a SERVICE-ROLE
 * client - the table is not readable by anon.
 */
export async function lookupIpDecision(
  // deno-lint-ignore no-explicit-any
  serviceClient: any,
  rawIp: string,
  nowMs: number = Date.now(),
): Promise<IpDecision> {
  const ip = parseIp(rawIp);
  if (!ip) return { action: 'allow', reason: 'unparseable-ip' };
  const key = formatIp(ip);
  const hit = cache.get(key);
  if (hit && nowMs - hit.at < CACHE_TTL_MS) return hit.decision;

  let decision: IpDecision;
  try {
    const { data, error } = await serviceClient
      .from('ip_access_control')
      .select('access_type, ip_address, ip_range, is_active, expires_at')
      .eq('is_active', true)
      .or(blocklistFilter(ip))
      .limit(500);
    if (error) {
      console.error('[IpGuard] ip_access_control lookup failed, allowing request:', error.message ?? error);
      return { action: 'allow', reason: 'no-entry' };
    }
    decision = decideIpAccess(rawIp, (data ?? []) as IpAccessEntry[], nowMs);
  } catch (err) {
    console.error('[IpGuard] ip_access_control lookup threw, allowing request:', err);
    return { action: 'allow', reason: 'no-entry' };
  }

  if (cache.size >= CACHE_MAX) cache.clear();
  cache.set(key, { at: nowMs, decision });
  return decision;
}

/**
 * Return a 403 if the caller's IP is blacklisted in ip_access_control, else null.
 *
 *   const blocked = await rejectBlockedIp(serviceClient, req, 'capture-lead', corsHeaders);
 *   if (blocked) return blocked;
 */
export async function rejectBlockedIp(
  // deno-lint-ignore no-explicit-any
  serviceClient: any,
  req: Request,
  endpoint: string,
  corsHeaders: Record<string, string> = {},
): Promise<Response | null> {
  const ip = getClientIP(req);
  const decision = await lookupIpDecision(serviceClient, ip);
  if (decision.action !== 'block') return null;
  console.warn(`[IpGuard] Blocked ${ip} on ${endpoint}: ${decision.entry.ip_range ?? decision.entry.ip_address}`);
  return blockedResponse(corsHeaders);
}

export interface AnonymousGuardOptions {
  /** Endpoint name, the rate_limit_state / rate_limit_violations key. */
  endpoint: string;
  /** Per-IP ceiling. Omit for blocklist-only (the OAuth/SAML callbacks). */
  limit?: { maxRequests: number; windowMinutes: number };
  /** Deny when the limiter cannot answer. Use for anonymous writers. */
  failClosed?: boolean;
  corsHeaders?: Record<string, string>;
}

/**
 * Blocklist, then the per-IP ceiling. Returns the 403/429 to send, or null to
 * carry on. Pass a SERVICE-ROLE client.
 *
 *   const denied = await guardAnonymousRequest(serviceClient, req, {
 *     endpoint: 'webhook-verify', limit: RATE_LIMITS.GENERAL, corsHeaders,
 *   });
 *   if (denied) return denied;
 */
export async function guardAnonymousRequest(
  // deno-lint-ignore no-explicit-any
  serviceClient: any,
  req: Request,
  opts: AnonymousGuardOptions,
): Promise<Response | null> {
  const cors = opts.corsHeaders ?? {};
  const blocked = await rejectBlockedIp(serviceClient, req, opts.endpoint, cors);
  if (blocked) return blocked;
  if (!opts.limit) return null;
  const result = await checkRateLimit(serviceClient, {
    identifier: getClientIP(req),
    endpoint: opts.endpoint,
    ...opts.limit,
    failClosed: opts.failClosed,
  });
  return result.allowed ? null : rateLimitResponse(result, cors);
}
