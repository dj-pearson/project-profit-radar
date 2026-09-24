/**
 * API versioning for edge functions (US-273).
 *
 * The API at api.brikly.net / functions.brikly.net is unversioned, and the
 * iOS app decodes whatever shape a function returns. This module gives the
 * contract a number and gives a function a way to know who is calling:
 *
 *   - API_VERSION is stamped into every envelope as `api_version` and sent as
 *     the X-API-Version header. It goes up by one when a response shape that
 *     some client reads changes in a way that client would notice.
 *   - X-Min-Supported-Client names the oldest client builds the server still
 *     answers in a shape they understand (MIN_SUPPORTED_IOS_VERSION /
 *     MIN_SUPPORTED_WEB_VERSION). A client below it knows it is on borrowed
 *     time; that is the hook a force-update gate will read.
 *   - parseClientHeader / getClientInfo read which client sent a request, so
 *     a function can return a new shape to clients that asked for it and the
 *     old shape to everyone else.
 *
 * A request with no client header, or one this parser does not recognise, is
 * LEGACY and must get exactly the shape it got before this module existed.
 * Every build of the iOS app shipped before US-273 is legacy.
 *
 * Policy: docs/API_VERSIONING.md. No Deno globals and no imports here, so the
 * module runs under vitest as well as the edge runtime.
 */

/** Current response-contract version. Integer; bump per docs/API_VERSIONING.md. */
export const API_VERSION = 1;

/**
 * Oldest iOS build the server still answers in a shape it can decode. 1.0.0 is
 * the only build shipped so far, and it predates the client header, so it
 * arrives as legacy. Raise only by the procedure in docs/API_VERSIONING.md.
 */
export const MIN_SUPPORTED_IOS_VERSION = '1.0.0';

/**
 * The web app is redeployed with the server, so its floor is whatever a
 * browser has cached (~24h after a deploy). 0.0.0 = every web build.
 */
export const MIN_SUPPORTED_WEB_VERSION = '0.0.0';

/**
 * Oldest API_VERSION a supported client decodes. Stays at 1 until a shape a
 * client reads is retired (docs/API_VERSIONING.md, step 3).
 */
export const MIN_SUPPORTED_API_VERSION = 1;

export const CLIENT_HEADER = 'X-Brikly-Client';
/** Web fallback: already in every Access-Control-Allow-Headers list. */
export const CLIENT_INFO_HEADER = 'x-client-info';
export const API_VERSION_HEADER = 'X-API-Version';
export const MIN_SUPPORTED_CLIENT_HEADER = 'X-Min-Supported-Client';

export type ClientPlatform = 'ios' | 'web' | 'android';

export interface ClientVersion {
  major: number;
  minor: number;
  patch: number;
}

export type ClientInfo =
  | { legacy: true; platform: null; version: null; raw: string | null }
  | { legacy: false; platform: ClientPlatform; version: ClientVersion; raw: string };

const PLATFORMS: readonly ClientPlatform[] = ['ios', 'web', 'android'];

// "ios/1.2.3", "brikly-ios/1.2", "web/2026.9.24 (build 88)". The version is
// taken from the start of what follows the slash; anything after it (build
// numbers, OS names) is ignored rather than rejected.
const CLIENT_PATTERN = /^(?:brikly-)?([a-z]+)\/(\d{1,6})(?:\.(\d{1,6}))?(?:\.(\d{1,6}))?(?=$|[^\d.])/i;

function legacy(raw: string | null): ClientInfo {
  return { legacy: true, platform: null, version: null, raw };
}

/** Parse "1.2.3" / "1.2" / "1". Returns null for anything else. */
export function parseVersion(value: string): ClientVersion | null {
  const m = /^(\d{1,6})(?:\.(\d{1,6}))?(?:\.(\d{1,6}))?$/.exec(value.trim());
  if (!m) return null;
  return { major: Number(m[1]), minor: Number(m[2] ?? 0), patch: Number(m[3] ?? 0) };
}

export function compareVersions(a: ClientVersion, b: ClientVersion): number {
  return a.major - b.major || a.minor - b.minor || a.patch - b.patch;
}

/**
 * Parse one client-identification header value. Anything unrecognised is
 * legacy: an unknown platform, a missing or malformed version, or the
 * supabase-js default "supabase-js-web/2.50.3".
 */
export function parseClientHeader(value: string | null | undefined): ClientInfo {
  if (value == null) return legacy(null);
  const raw = value.trim();
  if (raw === '' || raw.length > 200) return legacy(value);

  const m = CLIENT_PATTERN.exec(raw);
  if (!m) return legacy(raw);

  const platform = m[1].toLowerCase() as ClientPlatform;
  if (!PLATFORMS.includes(platform)) return legacy(raw);

  return {
    legacy: false,
    platform,
    version: { major: Number(m[2]), minor: Number(m[3] ?? 0), patch: Number(m[4] ?? 0) },
    raw,
  };
}

/**
 * Who sent this request. X-Brikly-Client wins (iOS sends it); x-client-info
 * is read only when it carries a "brikly-<platform>/<version>" value, which is
 * what the web client sends because a new request header would fail CORS
 * preflight on functions that hand-roll their Allow-Headers list.
 */
export function getClientInfo(req: { headers: { get(name: string): string | null } }): ClientInfo {
  const explicit = parseClientHeader(req.headers.get(CLIENT_HEADER));
  if (!explicit.legacy) return explicit;

  const info = req.headers.get(CLIENT_INFO_HEADER);
  if (info && /^\s*brikly-/i.test(info)) {
    const parsed = parseClientHeader(info);
    if (!parsed.legacy) return parsed;
  }
  return explicit.raw !== null ? explicit : legacy(info);
}

/**
 * True when the caller is on `platform` at or above `minVersion`. Legacy
 * callers are never "at least" anything, so the old shape is the default:
 *
 *   const client = getClientInfo(req);
 *   const body = clientAtLeast(client, 'ios', '1.3.0') ? newShape : oldShape;
 *
 * Pass a map to set a floor per platform; a platform missing from the map is
 * not opted in.
 */
export function clientAtLeast(
  client: ClientInfo,
  platform: ClientPlatform | Partial<Record<ClientPlatform, string>>,
  minVersion?: string,
): boolean {
  if (client.legacy) return false;
  const floor = typeof platform === 'string'
    ? (platform === client.platform ? minVersion : undefined)
    : platform[client.platform];
  if (floor === undefined) return false;
  const parsed = parseVersion(floor);
  if (!parsed) throw new Error(`clientAtLeast: bad version "${floor}"`);
  return compareVersions(client.version, parsed) >= 0;
}

/** "ios=1.0.0, web=0.0.0" - the X-Min-Supported-Client value. */
export function minSupportedClientValue(): string {
  return `ios=${MIN_SUPPORTED_IOS_VERSION}, web=${MIN_SUPPORTED_WEB_VERSION}`;
}

/**
 * Response headers every versioned response carries. Expose-Headers lets the
 * web client read them cross-origin; iOS reads them regardless.
 */
export function apiVersionHeaders(): Record<string, string> {
  return {
    [API_VERSION_HEADER]: String(API_VERSION),
    [MIN_SUPPORTED_CLIENT_HEADER]: minSupportedClientValue(),
    'Access-Control-Expose-Headers': `${API_VERSION_HEADER}, ${MIN_SUPPORTED_CLIENT_HEADER}`,
  };
}

/**
 * Add `api_version` to an envelope object. Additive only: an existing
 * `api_version` key is left alone, and non-objects are returned unchanged.
 */
export function stampEnvelope<T>(body: T): T {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return body;
  if (Object.prototype.hasOwnProperty.call(body, 'api_version')) return body;
  return { ...(body as Record<string, unknown>), api_version: API_VERSION } as T;
}

/**
 * Stamp a Response a function already built: version headers always, and
 * `api_version` in the body when it is a JSON object. Bodies that are not
 * JSON objects (204s, 'ok', arrays, redirects, streams of another type) keep
 * their bytes. Use via withApiVersion for hand-rolled functions; functions on
 * successResponse/errorResponse are stamped already.
 */
export async function stampResponse(res: Response): Promise<Response> {
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(apiVersionHeaders())) {
    if (!headers.has(k)) headers.set(k, v);
  }

  const type = headers.get('content-type') ?? '';
  if (!res.body || !type.toLowerCase().includes('application/json')) {
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
  }

  const text = await res.text();
  let body = text;
  try {
    const parsed = JSON.parse(text);
    const stamped = stampEnvelope(parsed);
    if (stamped !== parsed) body = JSON.stringify(stamped);
  } catch {
    // Not JSON after all; send the original bytes.
  }
  headers.delete('content-length');
  return new Response(body, { status: res.status, statusText: res.statusText, headers });
}

/** Wrap a serve() handler so every response it returns is stamped. */
export function withApiVersion<R extends Request>(
  handler: (req: R) => Response | Promise<Response>,
): (req: R) => Promise<Response> {
  return async (req: R) => stampResponse(await handler(req));
}
