/**
 * API Request Signing Utilities (US-007)
 *
 * Provides HMAC-SHA256 request signing for API integrity and authenticity:
 * - Canonical request signing (method + path + body hash + timestamp)
 * - Constant-time signature verification (prevents timing attacks)
 * - Timestamp freshness checks (prevents replay attacks)
 * - Signing key derived from session token (never hardcoded)
 *
 * SECURITY NOTES:
 * - Uses Web Crypto API (SubtleCrypto) for HMAC-SHA256
 * - Signing keys are derived from session tokens via HKDF-style HMAC
 * - Timestamps enforce a configurable freshness window (default: 5 minutes)
 * - Signature comparison uses constant-time algorithm to prevent timing side-channels
 * - Canonical request format prevents parameter reordering attacks
 */

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/**
 * Configuration for request signing behavior.
 */
export const REQUEST_SIGNING_CONFIG = {
  /** Maximum age of a signed request in milliseconds (default: 5 minutes). */
  timestampToleranceMs: 5 * 60 * 1000,

  /** HMAC algorithm used for signing. */
  algorithm: 'SHA-256' as const,

  /** Header name for the request signature. */
  signatureHeader: 'X-Signature',

  /** Header name for the request timestamp. */
  timestampHeader: 'X-Timestamp',
} as const;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const textEncoder = new TextEncoder();

/**
 * Convert an ArrayBuffer to a lowercase hex string.
 */
function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

/**
 * Compute a SHA-256 hash of the given string and return hex-encoded digest.
 */
async function sha256Hex(data: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', textEncoder.encode(data));
  return bufferToHex(digest);
}

/**
 * Import a string key for HMAC-SHA256 usage via the Web Crypto API.
 */
async function importHmacKey(key: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    textEncoder.encode(key),
    { name: 'HMAC', hash: { name: REQUEST_SIGNING_CONFIG.algorithm } },
    false,
    ['sign', 'verify'],
  );
}

/**
 * Compute HMAC-SHA256 of the given data with the provided key string.
 * Returns the hex-encoded MAC.
 */
async function hmacSha256Hex(key: string, data: string): Promise<string> {
  const cryptoKey = await importHmacKey(key);
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, textEncoder.encode(data));
  return bufferToHex(signature);
}

/**
 * Extract the pathname (+ search) from a URL string.
 * Falls back to the raw value when URL parsing fails (e.g. relative paths).
 */
function extractPath(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.pathname + parsed.search;
  } catch {
    // Relative URL or path-only string -- use as-is
    return url;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Derive a per-session signing key from the user's session token.
 *
 * This ensures the signing key is never hardcoded and is unique per session.
 * Uses HMAC-SHA256 with a fixed context string as a lightweight KDF.
 *
 * @param sessionToken - The current session/access token
 * @returns Hex-encoded derived signing key
 */
export async function deriveSigningKey(sessionToken: string): Promise<string> {
  if (!sessionToken) {
    throw new Error('[RequestSigning] Session token is required to derive signing key');
  }
  return hmacSha256Hex(sessionToken, 'builddesk:request-signing:v1');
}

/**
 * Build the canonical request string that will be signed.
 *
 * Format:  `METHOD\nPATH\nBODY_HASH\nTIMESTAMP`
 *
 * Using a canonical form prevents attacks that reorder or substitute parts
 * of the request while reusing a valid signature.
 *
 * @param method    - HTTP method (uppercased internally)
 * @param url       - Full URL or path
 * @param bodyHash  - Hex-encoded SHA-256 hash of the request body
 * @param timestamp - ISO 8601 timestamp string
 */
export function buildCanonicalRequest(
  method: string,
  url: string,
  bodyHash: string,
  timestamp: string,
): string {
  return [method.toUpperCase(), extractPath(url), bodyHash, timestamp].join('\n');
}

/**
 * Generate an ISO 8601 UTC timestamp for the current instant.
 *
 * @returns ISO timestamp string (e.g. `"2026-03-04T12:00:00.000Z"`)
 */
export function addTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Check whether a timestamp is within the acceptable freshness window.
 *
 * Rejects requests whose timestamp is too far in the past **or** future,
 * which mitigates both replay attacks and clock-skew abuse.
 *
 * @param timestamp    - ISO 8601 timestamp to validate
 * @param toleranceMs  - Maximum allowed age in ms (defaults to config value)
 * @returns `true` if the timestamp is fresh, `false` otherwise
 */
export function isRequestFresh(
  timestamp: string,
  toleranceMs: number = REQUEST_SIGNING_CONFIG.timestampToleranceMs,
): boolean {
  const requestTime = new Date(timestamp).getTime();

  if (Number.isNaN(requestTime)) {
    return false;
  }

  const now = Date.now();
  const drift = Math.abs(now - requestTime);
  return drift <= toleranceMs;
}

/**
 * Sign an outgoing API request.
 *
 * Computes an HMAC-SHA256 signature over the canonical request string
 * composed of: HTTP method, URL path, SHA-256 body hash, and timestamp.
 *
 * @param method     - HTTP method (GET, POST, etc.)
 * @param url        - Full request URL or path
 * @param body       - Request body string (use `""` for bodyless requests)
 * @param signingKey - Hex-encoded signing key (from `deriveSigningKey`)
 * @returns Object containing `signature` (hex), `timestamp` (ISO string),
 *          and `canonicalRequest` (for debugging -- do not expose in production)
 */
export async function signRequest(
  method: string,
  url: string,
  body: string,
  signingKey: string,
): Promise<{ signature: string; timestamp: string; canonicalRequest: string }> {
  if (!signingKey) {
    throw new Error('[RequestSigning] Signing key is required');
  }

  const timestamp = addTimestamp();
  const bodyHash = await sha256Hex(body);
  const canonical = buildCanonicalRequest(method, url, bodyHash, timestamp);
  const signature = await hmacSha256Hex(signingKey, canonical);

  return { signature, timestamp, canonicalRequest: canonical };
}

/**
 * Verify the HMAC-SHA256 signature of an incoming request.
 *
 * Performs two checks:
 * 1. Timestamp freshness (replay prevention)
 * 2. Constant-time signature comparison (timing-attack prevention)
 *
 * @param method     - HTTP method
 * @param url        - Request URL or path
 * @param body       - Request body string
 * @param signature  - Hex-encoded HMAC signature to verify
 * @param timestamp  - ISO 8601 timestamp from the request
 * @param signingKey - Hex-encoded signing key
 * @returns `true` if signature is valid and request is fresh
 */
export async function verifySignature(
  method: string,
  url: string,
  body: string,
  signature: string,
  timestamp: string,
  signingKey: string,
): Promise<boolean> {
  // 1. Reject stale / future-dated requests
  if (!isRequestFresh(timestamp)) {
    return false;
  }

  // 2. Recompute expected signature
  const bodyHash = await sha256Hex(body);
  const canonical = buildCanonicalRequest(method, url, bodyHash, timestamp);
  const expected = await hmacSha256Hex(signingKey, canonical);

  // 3. Constant-time comparison
  return constantTimeEqual(expected, signature);
}

/**
 * Constant-time string comparison.
 *
 * Prevents timing side-channel attacks by always comparing every character
 * regardless of where the first mismatch occurs.
 *
 * @param a - First string
 * @param b - Second string
 * @returns `true` if strings are identical
 */
export function constantTimeEqual(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }

  if (a.length !== b.length) {
    return false;
  }

  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return mismatch === 0;
}
