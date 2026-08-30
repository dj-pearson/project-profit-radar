/**
 * What counts as a URL this platform is willing to fetch (US-241).
 *
 * Deliberately free of imports. audit-url.ts wraps this in a Zod refinement and
 * pulls zod from a deno.land URL, which a Node test runner cannot resolve; the
 * rules themselves are the part worth testing, and a blocklist of regexes with
 * no tests is exactly the kind of thing that silently stops matching.
 */

/**
 * Hosts an audit target may never be. Not a complete SSRF defence - DNS can
 * still resolve a public name to a private address, and no string check sees
 * that - but it covers the literals someone reaches for, cloud metadata first.
 */
export const BLOCKED_HOSTS: RegExp[] = [
  /^localhost$/i,
  /^127\./,
  /^0\.0\.0\.0$/,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^169\.254\./,            // link-local, which is where 169.254.169.254 lives
  /^\[?::1\]?$/,
  /^\[?f[cd][0-9a-f]{2}:/i, // unique-local IPv6
  /\.local$/i,
  /\.internal$/i,
];

/** null when `raw` is an acceptable audit target, otherwise why it is not. */
export function describeAuditUrl(raw: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return 'must be an absolute URL';
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return `scheme ${parsed.protocol} is not fetchable; use http or https`;
  }
  // Credentials in a URL are sent to whatever the host resolves to and end up
  // in logs. No audit target needs them.
  if (parsed.username || parsed.password) {
    return 'must not carry credentials';
  }
  const host = parsed.hostname;
  if (BLOCKED_HOSTS.some((re) => re.test(host))) {
    return `host ${host} is loopback, private or link-local`;
  }
  return null;
}
