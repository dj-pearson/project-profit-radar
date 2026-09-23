/**
 * Custom-domain ownership proof for verify-domain.
 *
 * The old check was an HTTP HEAD to https://<domain>: any domain that answered
 * 200 or a redirect was marked verified, so anyone could claim google.com for
 * their tenant. Ownership is now proved the way every registrar-facing service
 * does it: the company is issued a random token, and the domain is verified
 * only when a TXT record at _brikly-verify.<domain> carries that exact token.
 * Publishing a TXT record needs control of the zone; answering HTTP does not.
 *
 * The token is not a secret (TXT records are public), so what keeps it sound
 * is that only the edge function can write it. A company that could choose its
 * own token could copy another company's value out of public DNS and claim
 * their domain with it.
 *
 * Pure on purpose: no Supabase or Deno import, and fetch is injected, so
 * vitest can load and exercise all of it.
 */

export const VERIFICATION_RECORD_PREFIX = '_brikly-verify';
export const VERIFICATION_TOKEN_PREFIX = 'brikly-verify=';

/** Same shape the request schema accepts: a bare hostname, at least one dot. */
const HOSTNAME = /^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/;

/**
 * Lowercase, strip an http(s):// prefix, a trailing slash and a trailing dot.
 * Returns null when what is left is not a bare hostname, so a stored
 * custom_domain carrying a path or port is refused rather than half-used.
 */
export function normalizeDomain(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const d = input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '')
    .replace(/\.$/, '');
  if (d.length === 0 || d.length > 253 || !HOSTNAME.test(d)) return null;
  if (d.split('.').some((label) => label.length === 0 || label.length > 63)) return null;
  return d;
}

export function verificationRecordName(domain: string): string {
  return `${VERIFICATION_RECORD_PREFIX}.${domain}`;
}

/** 128 random bits from the CSPRNG, hex encoded, with a recognisable prefix. */
export function generateVerificationToken(
  getRandomValues: (a: Uint8Array) => Uint8Array = (a) => crypto.getRandomValues(a),
): string {
  const bytes = getRandomValues(new Uint8Array(16));
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${VERIFICATION_TOKEN_PREFIX}${hex}`;
}

/**
 * One TXT answer's `data` as DNS-over-HTTPS JSON returns it: one or more
 * quoted character-strings, e.g. `"brikly-verify=ab" "cd"` for a value the
 * zone split at 255 bytes. The strings are concatenated, per RFC 7208 3.3.
 * An unquoted value (some resolvers) is returned as is.
 */
export function parseTxtData(data: string): string {
  const s = data.trim();
  if (!s.startsWith('"')) return s;
  let out = '';
  let i = 0;
  while (i < s.length) {
    if (s[i] !== '"') { i++; continue; }
    i++;
    while (i < s.length && s[i] !== '"') {
      if (s[i] === '\\' && i + 1 < s.length) { out += s[i + 1]; i += 2; continue; }
      out += s[i];
      i++;
    }
    i++;
  }
  return out;
}

export type TxtLookup =
  | { ok: true; records: string[] }
  | { ok: false; error: string };

/** DNS rcodes a lookup can finish on. Anything else is a resolver failure. */
const NOERROR = 0;
const NXDOMAIN = 3;
const TXT = 16;

/**
 * Read TXT answers out of a DoH JSON body. NXDOMAIN is a clean "no records";
 * SERVFAIL and the rest are errors, so a resolver outage reads as "try again"
 * rather than as "your record is missing".
 */
export function parseDohTxtResponse(body: unknown): TxtLookup {
  if (!body || typeof body !== 'object') return { ok: false, error: 'malformed DNS response' };
  const { Status, Answer } = body as { Status?: unknown; Answer?: unknown };
  if (Status === NXDOMAIN) return { ok: true, records: [] };
  if (Status !== NOERROR) return { ok: false, error: `DNS status ${String(Status)}` };
  if (!Array.isArray(Answer)) return { ok: true, records: [] };
  const records = Answer
    .filter((a): a is { type: number; data: string } =>
      !!a && typeof a === 'object' && (a as { type?: unknown }).type === TXT &&
      typeof (a as { data?: unknown }).data === 'string')
    .map((a) => parseTxtData(a.data));
  return { ok: true, records };
}

export const DOH_RESOLVERS = [
  'https://cloudflare-dns.com/dns-query',
  'https://dns.google/resolve',
] as const;

/**
 * Resolve TXT records over DNS-over-HTTPS, trying each resolver in turn. The
 * first resolver that gives a definite answer (records or NXDOMAIN) wins.
 */
export async function resolveTxt(
  name: string,
  fetchImpl: typeof fetch,
  resolvers: readonly string[] = DOH_RESOLVERS,
  timeoutMs = 5000,
): Promise<TxtLookup> {
  let lastError = 'no resolver answered';
  for (const base of resolvers) {
    try {
      const url = `${base}?name=${encodeURIComponent(name)}&type=TXT`;
      const res = await fetchImpl(url, {
        headers: { accept: 'application/dns-json' },
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!res.ok) { lastError = `resolver returned HTTP ${res.status}`; continue; }
      const parsed = parseDohTxtResponse(await res.json());
      if (parsed.ok) return parsed;
      lastError = parsed.error;
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }
  }
  return { ok: false, error: lastError };
}

/** True when any TXT record is exactly one of the expected tokens. */
export function txtMatchesToken(records: readonly string[], tokens: readonly string[]): boolean {
  const want = new Set(tokens.map((t) => t.trim()).filter((t) => t.length > 0));
  if (want.size === 0) return false;
  return records.some((r) => want.has(r.trim()));
}
