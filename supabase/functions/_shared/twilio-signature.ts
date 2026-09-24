/**
 * Twilio webhook signature verification (US-395).
 *
 * twilio-calling's recording_callback is posted by Twilio, which sends no
 * Supabase JWT. The function used to require one, so every callback was
 * rejected and no recording was ever attached to a call. The callback now runs
 * with verify_jwt = false, and this check is what stands in for the JWT: a
 * request without a valid X-Twilio-Signature is refused before anything is
 * written.
 *
 * Twilio's documented algorithm (https://www.twilio.com/docs/usage/security):
 *   1. Take the full URL Twilio requested, query string included.
 *   2. For an application/x-www-form-urlencoded POST, sort the POST parameters
 *      by name and append each name immediately followed by its value, with no
 *      delimiters.
 *   3. HMAC-SHA1 that string with the account's auth token as the key.
 *   4. Base64-encode the digest and compare it to X-Twilio-Signature.
 *
 * Twilio's own helper libraries also accept the URL with the default port
 * added or removed, because what Twilio signed depends on how the URL was
 * configured. This does the same.
 *
 * Pure (Web Crypto only), so vitest can load it.
 */
import { constantTimeEqual } from './constant-time.ts';

export const TWILIO_SIGNATURE_HEADER = 'X-Twilio-Signature';

export type TwilioParams = Iterable<[string, string]> | Record<string, string>;

function toEntries(params: TwilioParams): [string, string][] {
  if (Symbol.iterator in Object(params)) {
    return [...(params as Iterable<[string, string]>)].map(([k, v]) => [String(k), String(v)]);
  }
  return Object.entries(params as Record<string, string>).map(([k, v]) => [k, String(v)]);
}

/** The string Twilio signs: URL, then each name+value sorted by name (then value, for repeats). */
export function twilioSigningString(url: string, params: TwilioParams): string {
  const entries = toEntries(params).sort(([ak, av], [bk, bv]) =>
    ak < bk ? -1 : ak > bk ? 1 : av < bv ? -1 : av > bv ? 1 : 0,
  );
  let data = url;
  for (const [k, v] of entries) data += k + v;
  return data;
}

function toBase64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

/** base64(HMAC-SHA1(authToken, signingString)). */
export async function computeTwilioSignature(
  authToken: string,
  url: string,
  params: TwilioParams,
): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(authToken),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  );
  const mac = await crypto.subtle.sign('HMAC', key, enc.encode(twilioSigningString(url, params)));
  return toBase64(new Uint8Array(mac));
}

/** The URL as given, plus the variant with the default port added or removed. */
export function twilioUrlVariants(url: string): string[] {
  const m = /^(https?):\/\/([^/?#:]+)(?::(\d+))?(.*)$/i.exec(url);
  if (!m) return [url];
  const [, scheme, host, port, rest] = m;
  const defaultPort = scheme.toLowerCase() === 'https' ? '443' : '80';
  if (port === undefined) return [url, `${scheme}://${host}:${defaultPort}${rest}`];
  if (port === defaultPort) return [url, `${scheme}://${host}${rest}`];
  return [url];
}

/**
 * True only when `signature` is Twilio's signature for this URL and these form
 * parameters. An empty token or signature is always false: failing open on a
 * missing secret is how an unauthenticated write path gets shipped.
 */
export async function verifyTwilioSignature(
  authToken: string,
  signature: string | null | undefined,
  url: string,
  params: TwilioParams,
): Promise<boolean> {
  if (!authToken || !signature) return false;
  const entries = toEntries(params);
  let ok = false;
  for (const candidate of twilioUrlVariants(url)) {
    const expected = await computeTwilioSignature(authToken, candidate, entries);
    // Evaluate every variant; do not short-circuit on the first match.
    ok = constantTimeEqual(expected, signature) || ok;
  }
  return ok;
}
