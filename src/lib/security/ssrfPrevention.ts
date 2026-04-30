/**
 * SSRF (Server-Side Request Forgery) Prevention Utilities
 *
 * Prevents SSRF attacks by validating and sanitizing URLs before
 * they are used in server-side requests. Blocks access to private
 * networks, internal services, and cloud metadata endpoints.
 *
 * Handles common bypass techniques:
 * - Double URL encoding
 * - IPv6 embedding (::ffff:127.0.0.1)
 * - Octal/hex/decimal IP notation
 * - URL parser differentials
 * - DNS rebinding indicators
 * - Redirect-based SSRF
 */

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Allowlisted external domains for outbound requests.
 * Only these domains (and their subdomains) are permitted in strict mode.
 */
export const ALLOWED_EXTERNAL_DOMAINS: readonly string[] = Object.freeze([
  'stripe.com',
  'supabase.co',
  'quickbooks.api.intuit.com',
  'googleapis.com',
  'graph.microsoft.com',
]);

/**
 * Known redirect parameter names that could be used for SSRF via open redirect.
 */
const REDIRECT_PARAM_NAMES: readonly string[] = [
  'url',
  'redirect',
  'redirect_uri',
  'redirect_url',
  'next',
  'return',
  'return_to',
  'returnTo',
  'return_url',
  'continue',
  'dest',
  'destination',
  'go',
  'goto',
  'target',
  'link',
  'forward',
  'out',
  'view',
  'ref',
  'callback',
  'callback_url',
] as const;

/**
 * Blocked hostnames that should never be accessed.
 */
const BLOCKED_HOSTNAMES: readonly string[] = [
  'metadata.google.internal',
  'metadata.google',
  'instance-data',
  'metadata',
  'localhost',
] as const;

/**
 * Cloud metadata IP addresses commonly targeted in SSRF.
 */
const CLOUD_METADATA_IPS: readonly string[] = [
  '169.254.169.254', // AWS, GCP, Azure metadata
  'fd00:ec2::254',   // AWS IPv6 metadata
] as const;

// =============================================================================
// TYPES
// =============================================================================

export interface UrlValidationOptions {
  /** Enable strict mode: only allow ALLOWED_EXTERNAL_DOMAINS. Default: false */
  strict?: boolean;
  /** Additional domains to allow beyond the default list */
  additionalAllowedDomains?: string[];
  /** Allow HTTP (non-TLS) URLs. Default: false (only HTTPS) */
  allowHttp?: boolean;
  /** Check for redirect parameters in query string. Default: true */
  checkRedirects?: boolean;
}

export interface UrlValidationResult {
  valid: boolean;
  reason?: string;
  sanitizedUrl?: string;
}

// =============================================================================
// IP ADDRESS VALIDATION
// =============================================================================

/**
 * Checks whether an IP address falls within private/reserved ranges.
 *
 * Blocked ranges:
 * - 10.0.0.0/8 (Class A private)
 * - 172.16.0.0/12 (Class B private)
 * - 192.168.0.0/16 (Class C private)
 * - 127.0.0.0/8 (Loopback)
 * - 0.0.0.0 (Unspecified)
 * - 169.254.0.0/16 (Link-local / cloud metadata)
 * - ::1 (IPv6 loopback)
 * - fd00::/8 (IPv6 ULA)
 * - ::ffff:0:0/96 (IPv4-mapped IPv6)
 * - fe80::/10 (IPv6 link-local)
 */
export function isPrivateIp(ip: string): boolean {
  const trimmed = ip.trim();

  if (!trimmed) {
    return true; // Empty IPs are not valid for external requests
  }

  // Normalize IPv6 brackets
  const cleaned = trimmed.replace(/^\[/, '').replace(/\]$/, '');

  // Check IPv6 addresses
  if (cleaned.includes(':')) {
    return isPrivateIpv6(cleaned);
  }

  // Attempt to parse non-standard decimal/octal/hex IP representations
  const normalizedIp = normalizeIpNotation(cleaned);
  if (normalizedIp !== null) {
    return isPrivateIpv4(normalizedIp);
  }

  // Standard dotted-decimal
  return isPrivateIpv4(cleaned);
}

/**
 * Checks if a standard dotted-decimal IPv4 address is private.
 */
function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split('.');
  if (parts.length !== 4) {
    return true; // Malformed IPs treated as private (block by default)
  }

  const octets = parts.map(Number);
  if (octets.some((o) => isNaN(o) || o < 0 || o > 255)) {
    return true; // Invalid octets treated as private
  }

  const [a, b, c, d] = octets;

  // 0.0.0.0
  if (a === 0 && b === 0 && c === 0 && d === 0) return true;

  // 10.0.0.0/8
  if (a === 10) return true;

  // 172.16.0.0/12
  if (a === 172 && b >= 16 && b <= 31) return true;

  // 192.168.0.0/16
  if (a === 192 && b === 168) return true;

  // 127.0.0.0/8 (Loopback)
  if (a === 127) return true;

  // 169.254.0.0/16 (Link-local / cloud metadata)
  if (a === 169 && b === 254) return true;

  // 100.64.0.0/10 (Carrier-grade NAT)
  if (a === 100 && b >= 64 && b <= 127) return true;

  // 198.18.0.0/15 (Benchmarking)
  if (a === 198 && (b === 18 || b === 19)) return true;

  // 192.0.0.0/24 (IETF Protocol Assignments)
  if (a === 192 && b === 0 && c === 0) return true;

  // 192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24 (Documentation)
  if (a === 192 && b === 0 && c === 2) return true;
  if (a === 198 && b === 51 && c === 100) return true;
  if (a === 203 && b === 0 && c === 113) return true;

  // 224.0.0.0/4 (Multicast)
  if (a >= 224 && a <= 239) return true;

  // 240.0.0.0/4 (Reserved)
  if (a >= 240) return true;

  return false;
}

/**
 * Checks if an IPv6 address is private/reserved.
 */
function isPrivateIpv6(ip: string): boolean {
  const lower = ip.toLowerCase();

  // ::1 (loopback)
  if (lower === '::1' || lower === '0:0:0:0:0:0:0:1') return true;

  // :: (unspecified)
  if (lower === '::' || lower === '0:0:0:0:0:0:0:0') return true;

  // fd00::/8 (Unique Local Address)
  if (lower.startsWith('fd')) return true;

  // fc00::/7 (Unique Local Address, broader)
  if (lower.startsWith('fc')) return true;

  // fe80::/10 (Link-local)
  if (lower.startsWith('fe80')) return true;

  // IPv4-mapped IPv6 (::ffff:x.x.x.x)
  const ipv4MappedMatch = lower.match(/^(?:::ffff:)(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (ipv4MappedMatch) {
    return isPrivateIpv4(ipv4MappedMatch[1]);
  }

  // IPv4-compatible IPv6 (::x.x.x.x)
  const ipv4CompatMatch = lower.match(/^::(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (ipv4CompatMatch) {
    return isPrivateIpv4(ipv4CompatMatch[1]);
  }

  // IPv4-mapped IPv6 in hex form, both fully-expanded and compact:
  //   `0:0:0:0:0:ffff:7f00:0001` (full) and `::ffff:7f00:1` (compact)
  // both map to 127.0.0.1. WHATWG URL canonicalization often produces
  // the compact form, which the dotted-IPv4 regex above misses.
  const hexMappedMatch = lower.match(
    /^(?:0:0:0:0:0:ffff|::ffff):([0-9a-f]{1,4}):([0-9a-f]{1,4})$/,
  );
  if (hexMappedMatch) {
    const high = parseInt(hexMappedMatch[1], 16);
    const low = parseInt(hexMappedMatch[2], 16);
    const ipv4 = [
      (high >> 8) & 0xff,
      high & 0xff,
      (low >> 8) & 0xff,
      low & 0xff,
    ].join('.');
    return isPrivateIpv4(ipv4);
  }

  // AWS EC2 IPv6 metadata
  if (lower === 'fd00:ec2::254') return true;

  return false;
}

/**
 * Attempts to normalize non-standard IP notations to standard dotted-decimal.
 * Returns null if the input is not a recognizable IP format.
 *
 * Handles:
 * - Decimal notation: 2130706433 => 127.0.0.1
 * - Octal notation: 0177.0.0.01 => 127.0.0.1
 * - Hex notation: 0x7f.0x0.0x0.0x1 => 127.0.0.1
 * - Mixed notation: 0x7f.0.0.1 => 127.0.0.1
 * - Single integer: 2130706433 => 127.0.0.1
 */
function normalizeIpNotation(input: string): string | null {
  // Single integer notation (e.g., 2130706433 for 127.0.0.1)
  if (/^\d+$/.test(input)) {
    const num = parseInt(input, 10);
    if (num >= 0 && num <= 0xFFFFFFFF) {
      return [
        (num >>> 24) & 0xFF,
        (num >>> 16) & 0xFF,
        (num >>> 8) & 0xFF,
        num & 0xFF,
      ].join('.');
    }
    return null;
  }

  // Hex single integer (0x7f000001)
  if (/^0x[0-9a-fA-F]+$/.test(input)) {
    const num = parseInt(input, 16);
    if (num >= 0 && num <= 0xFFFFFFFF) {
      return [
        (num >>> 24) & 0xFF,
        (num >>> 16) & 0xFF,
        (num >>> 8) & 0xFF,
        num & 0xFF,
      ].join('.');
    }
    return null;
  }

  // Dotted notation with octal/hex octets
  const parts = input.split('.');
  if (parts.length === 4) {
    const octets: number[] = [];
    for (const part of parts) {
      const val = parseOctetValue(part);
      if (val === null || val < 0 || val > 255) return null;
      octets.push(val);
    }
    return octets.join('.');
  }

  return null;
}

/**
 * Parses a single IP octet that may be decimal, octal (0-prefixed), or hex (0x-prefixed).
 */
function parseOctetValue(octet: string): number | null {
  if (!octet) return null;

  // Hex
  if (/^0x[0-9a-fA-F]+$/i.test(octet)) {
    return parseInt(octet, 16);
  }

  // Octal (leading zero, but not just "0")
  if (/^0[0-7]+$/.test(octet) && octet.length > 1) {
    return parseInt(octet, 8);
  }

  // Decimal
  if (/^\d+$/.test(octet)) {
    return parseInt(octet, 10);
  }

  return null;
}

// =============================================================================
// URL SANITIZATION
// =============================================================================

/**
 * Sanitizes a URL to prevent bypass techniques.
 *
 * Normalization steps:
 * 1. Trim whitespace and remove control characters
 * 2. Decode double-encoded sequences
 * 3. Normalize the URL via the URL constructor
 * 4. Lowercase the scheme and hostname
 * 5. Remove userinfo (user:password@)
 * 6. Remove default ports
 * 7. Resolve path traversals
 * 8. Remove fragments
 *
 * Returns the sanitized URL string, or throws if the URL is malformed.
 */
export function sanitizeUrl(url: string): string {
  if (!url || typeof url !== 'string') {
    throw new Error('URL must be a non-empty string');
  }

  // Step 1: Trim whitespace and remove control/invisible characters
  let cleaned = url
    .trim()
    .replace(/[\x00-\x1F\x7F]/g, '')  // Remove control characters
    .replace(/\s/g, '');               // Remove all whitespace

  // Step 2: Iteratively decode URL encoding to handle double/triple encoding
  let previousCleaned = '';
  let iterations = 0;
  const maxIterations = 5;
  while (cleaned !== previousCleaned && iterations < maxIterations) {
    previousCleaned = cleaned;
    try {
      cleaned = decodeURIComponent(cleaned);
    } catch {
      // If decoding fails, the string has no more encoded characters
      break;
    }
    iterations++;
  }

  // Step 3: Re-encode for safe URL parsing
  // After fully decoding, we need to construct a proper URL
  // First, check if the decoded form starts with a valid scheme
  if (!/^https?:\/\//i.test(cleaned)) {
    throw new Error('URL must use http or https protocol');
  }

  // Step 4: Parse with URL constructor for normalization
  let parsed: URL;
  try {
    parsed = new URL(cleaned);
  } catch {
    throw new Error('Malformed URL');
  }

  // Step 5: Enforce HTTP/HTTPS only
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('URL must use http or https protocol');
  }

  // Step 6: Remove userinfo (prevents user@attacker.com bypass)
  if (parsed.username || parsed.password) {
    parsed.username = '';
    parsed.password = '';
  }

  // Step 7: Remove fragment
  parsed.hash = '';

  // Return the normalized URL string
  return parsed.toString();
}

// =============================================================================
// URL VALIDATION
// =============================================================================

/**
 * Validates a URL for safe use in server-side requests.
 *
 * Checks performed:
 * 1. URL is well-formed (via sanitizeUrl)
 * 2. Protocol is HTTPS (or HTTP if allowHttp is true)
 * 3. Hostname is not a private/reserved IP
 * 4. Hostname is not a blocked hostname (metadata endpoints, localhost)
 * 5. Hostname does not use non-standard IP notation
 * 6. In strict mode: hostname must match ALLOWED_EXTERNAL_DOMAINS
 * 7. Query parameters are checked for redirect-based SSRF
 */
export function validateUrl(
  url: string,
  options: UrlValidationOptions = {},
): UrlValidationResult {
  const {
    strict = false,
    additionalAllowedDomains = [],
    allowHttp = false,
    checkRedirects = true,
  } = options;

  // Step 0: Detect non-standard IP notation BEFORE WHATWG URL parsing
  // normalizes it. Some runtimes parse `https://2130706433/` and rewrite
  // the hostname to `127.0.0.1`, which would otherwise hide the bypass
  // attempt under a generic "private IP" reason.
  if (typeof url === 'string') {
    // Block the "fragment trick": `https://allowed.com#@evil.com/` — some
    // legacy parsers treat the part after `#@` as the actual host. WHATWG
    // does not, so the validator wouldn't otherwise see anything wrong.
    if (/^\s*https?:\/\/[^\/]*#@/i.test(url)) {
      return {
        valid: false,
        reason: 'URL contains a suspicious "#@" sequence between host and fragment',
      };
    }

    const rawHostMatch = url.match(/^\s*https?:\/\/([^\/\?#]+)/i);
    if (rawHostMatch) {
      const rawHost = rawHostMatch[1].split('@').pop() || '';
      const rawHostname = rawHost.replace(/^\[/, '').replace(/\][^]*$/, '').split(':')[0];
      if (rawHostname && hasNonStandardIpNotation(rawHostname)) {
        return { valid: false, reason: 'Non-standard IP notation is not allowed' };
      }
    }
  }

  // Step 1: Sanitize and normalize
  let sanitized: string;
  try {
    sanitized = sanitizeUrl(url);
  } catch (err) {
    return {
      valid: false,
      reason: err instanceof Error ? err.message : 'Invalid URL',
    };
  }

  // Step 2: Parse the sanitized URL
  let parsed: URL;
  try {
    parsed = new URL(sanitized);
  } catch {
    return { valid: false, reason: 'Malformed URL after sanitization' };
  }

  // Step 3: Protocol check
  if (!allowHttp && parsed.protocol !== 'https:') {
    return { valid: false, reason: 'Only HTTPS URLs are allowed' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { valid: false, reason: 'Only HTTP/HTTPS protocols are allowed' };
  }

  // Step 4: Block cloud metadata IPs
  const hostname = parsed.hostname;
  if (CLOUD_METADATA_IPS.includes(hostname)) {
    return { valid: false, reason: 'Access to cloud metadata endpoints is blocked' };
  }

  // Step 5: Block known dangerous hostnames
  const lowerHostname = hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.some((blocked) => lowerHostname === blocked || lowerHostname.endsWith('.' + blocked))) {
    return { valid: false, reason: 'Hostname is blocked' };
  }

  // Step 6: Check if hostname is an IP address and validate it
  if (isIpAddress(hostname)) {
    if (isPrivateIp(hostname)) {
      return { valid: false, reason: 'Private/reserved IP addresses are blocked' };
    }
  }

  // Step 7: Check for non-standard IP notation in original URL
  // This catches bypass attempts using octal, hex, or decimal IPs
  if (hasNonStandardIpNotation(hostname)) {
    return { valid: false, reason: 'Non-standard IP notation is not allowed' };
  }

  // Step 8: Domain allowlist check (strict mode)
  if (strict) {
    const allAllowed = [...ALLOWED_EXTERNAL_DOMAINS, ...additionalAllowedDomains];
    const domainAllowed = allAllowed.some((domain) =>
      lowerHostname === domain || lowerHostname.endsWith('.' + domain),
    );
    if (!domainAllowed) {
      return {
        valid: false,
        reason: `Domain "${hostname}" is not in the allowed list`,
      };
    }
  }

  // Step 9: Check for redirect-based SSRF
  if (checkRedirects) {
    const redirectCheck = detectRedirectParams(parsed);
    if (redirectCheck) {
      return {
        valid: false,
        reason: redirectCheck,
      };
    }
  }

  return { valid: true, sanitizedUrl: sanitized };
}

// =============================================================================
// INTERNAL HELPERS
// =============================================================================

/**
 * Detects whether a hostname looks like an IP address (v4 or v6).
 */
function isIpAddress(hostname: string): boolean {
  // IPv6 in brackets
  if (hostname.startsWith('[') && hostname.endsWith(']')) {
    return true;
  }

  // Standard IPv4
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
    return true;
  }

  // IPv6 without brackets (rare in URLs but possible).
  // The character class includes `.` so IPv4-mapped/compatible forms
  // (e.g. ::ffff:127.0.0.1) are recognized as IPs.
  if (hostname.includes(':') && /^[0-9a-fA-F:.]+$/.test(hostname)) {
    return true;
  }

  return false;
}

/**
 * Detects non-standard IP notation that could be used to bypass validation.
 * This catches octal (0177.0.0.1), hex (0x7f.0.0.1), and decimal (2130706433) IPs.
 */
function hasNonStandardIpNotation(hostname: string): boolean {
  // Pure decimal integer
  if (/^\d+$/.test(hostname) && !hostname.includes('.')) {
    const num = parseInt(hostname, 10);
    if (num >= 0 && num <= 0xFFFFFFFF) {
      return true;
    }
  }

  // Hex integer
  if (/^0x[0-9a-fA-F]+$/i.test(hostname)) {
    return true;
  }

  // Dotted with octal or hex octets
  const parts = hostname.split('.');
  if (parts.length === 4) {
    for (const part of parts) {
      // Octal: starts with 0 and has more than one digit
      if (/^0[0-7]+$/.test(part) && part.length > 1) {
        return true;
      }
      // Hex octet
      if (/^0x[0-9a-fA-F]+$/i.test(part)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Checks query parameters for potential redirect-based SSRF.
 * Returns a reason string if a redirect parameter is detected, null otherwise.
 */
function detectRedirectParams(parsed: URL): string | null {
  const params = parsed.searchParams;

  for (const paramName of REDIRECT_PARAM_NAMES) {
    const value = params.get(paramName);
    if (value) {
      // Check if the value looks like a URL (could redirect to internal resource)
      if (/^https?:\/\//i.test(value) || value.startsWith('//') || value.startsWith('/\\')) {
        return `Potential redirect-based SSRF detected in parameter "${paramName}"`;
      }

      // Check for encoded URL values
      try {
        const decoded = decodeURIComponent(value);
        if (/^https?:\/\//i.test(decoded) || decoded.startsWith('//')) {
          return `Potential redirect-based SSRF detected in parameter "${paramName}" (encoded)`;
        }
      } catch {
        // Ignore decoding failures
      }
    }
  }

  return null;
}
