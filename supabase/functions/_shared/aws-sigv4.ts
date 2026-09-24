/**
 * AWS Signature Version 4 for one request, with WebCrypto only.
 *
 * Used by the SES v2 HTTPS transport in ses-email-service.ts. An SDK import
 * would cost cold-start time on every function that sends mail; the signing
 * algorithm is short, stable and documented at
 * https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_sigv-create-signed-request.html
 *
 * No remote imports and no Deno globals, so aws-sigv4.test.ts checks it
 * against AWS's published test vectors under vitest.
 */

export interface AwsCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
}

export interface SignableRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: string;
}

const enc = new TextEncoder();

function hex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function sha256Hex(data: string): Promise<string> {
  return hex(await crypto.subtle.digest('SHA-256', enc.encode(data)));
}

async function hmac(key: ArrayBuffer | Uint8Array, data: string): Promise<ArrayBuffer> {
  const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return crypto.subtle.sign('HMAC', k, enc.encode(data));
}

/** kSigning = HMAC(HMAC(HMAC(HMAC("AWS4" + secret, date), region), service), "aws4_request") */
export async function deriveSigningKey(secret: string, date: string, region: string, service: string): Promise<ArrayBuffer> {
  const kDate = await hmac(enc.encode(`AWS4${secret}`), date);
  const kRegion = await hmac(kDate, region);
  const kService = await hmac(kRegion, service);
  return hmac(kService, 'aws4_request');
}

export async function deriveSigningKeyHex(secret: string, date: string, region: string, service: string): Promise<string> {
  return hex(await deriveSigningKey(secret, date, region, service));
}

/** RFC 3986 encoding as SigV4 wants it: everything but unreserved characters. */
function uriEncode(s: string, keepSlash: boolean): string {
  return [...enc.encode(s)]
    .map((b) => {
      const c = String.fromCharCode(b);
      if (/[A-Za-z0-9\-._~]/.test(c) || (keepSlash && c === '/')) return c;
      return `%${b.toString(16).toUpperCase().padStart(2, '0')}`;
    })
    .join('');
}

function canonicalQuery(search: URLSearchParams): string {
  return [...search.entries()]
    .map(([k, v]) => [uriEncode(k, false), uriEncode(v, false)] as const)
    .sort(([a, av], [b, bv]) => (a < b ? -1 : a > b ? 1 : av < bv ? -1 : av > bv ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
}

/** 20150830T123600Z */
export function amzDate(d: Date): string {
  return d.toISOString().replace(/[:-]|\.\d{3}/g, '');
}

/**
 * Returns the headers to send: the caller's, plus host, x-amz-date, an
 * optional x-amz-security-token and Authorization. Every header passed in is
 * signed.
 */
export async function signRequest(
  req: SignableRequest,
  creds: AwsCredentials,
  region: string,
  service: string,
  now: Date = new Date(),
): Promise<Record<string, string>> {
  const url = new URL(req.url);
  const stamp = amzDate(now);
  const date = stamp.slice(0, 8);

  const headers: Record<string, string> = {};
  for (const [k, v] of Object.entries(req.headers)) headers[k.toLowerCase()] = v;
  headers['host'] = url.host;
  headers['x-amz-date'] = stamp;
  if (creds.sessionToken) headers['x-amz-security-token'] = creds.sessionToken;

  const names = Object.keys(headers).sort();
  const canonicalHeaders = names.map((n) => `${n}:${headers[n].trim().replace(/\s+/g, ' ')}\n`).join('');
  const signedHeaders = names.join(';');
  const path = url.pathname === '' ? '/' : url.pathname.split('/').map((seg) => uriEncode(decodeURIComponent(seg), false)).join('/');

  const canonicalRequest = [
    req.method.toUpperCase(),
    path,
    canonicalQuery(url.searchParams),
    canonicalHeaders,
    signedHeaders,
    await sha256Hex(req.body),
  ].join('\n');

  const scope = `${date}/${region}/${service}/aws4_request`;
  const stringToSign = ['AWS4-HMAC-SHA256', stamp, scope, await sha256Hex(canonicalRequest)].join('\n');
  const signature = hex(await hmac(await deriveSigningKey(creds.secretAccessKey, date, region, service), stringToSign));

  return {
    ...headers,
    authorization: `AWS4-HMAC-SHA256 Credential=${creds.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
  };
}
