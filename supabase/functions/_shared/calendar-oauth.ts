/**
 * Google / Outlook calendar OAuth: token refresh, encryption at rest, and a
 * signed OAuth state (US-395).
 *
 * Before this, google-calendar-callback and outlook-calendar-callback stored
 * the provider's access and refresh tokens in plain text and nothing ever used
 * the refresh token. Google access tokens last an hour and Microsoft's 60-90
 * minutes, so sync-calendar worked for the first hour after connecting and
 * then failed with a provider 401 on every run, reported to the user as a
 * generic 500. Outlook never received a refresh token at all: the consent
 * request did not ask for offline_access.
 *
 * What this module gives the edge functions:
 *
 *   - tokenNeedsRefresh / refreshCalendarToken / withFreshToken: refresh
 *     shortly before expiry, and once more if the provider answers 401 anyway.
 *   - A refresh that fails with invalid_grant (revoked, expired, password
 *     change) or a Microsoft interaction/consent error is reported as
 *     'reauth_required', which the caller records on the row
 *     (reauth_required_at) so the settings UI shows "Reconnect" instead of a
 *     sync that fails silently forever.
 *   - Tokens are stored AES-256-GCM encrypted with the same cipher and wire
 *     format as QuickBooks tokens (encryptSecret/decryptSecret from
 *     quickbooks-token-crypto.ts), under a separate key,
 *     CALENDAR_TOKEN_ENCRYPTION_KEY, so one leak or rotation does not take the
 *     other with it.
 *   - signOAuthState / verifyOAuthState: the state parameter used to be
 *     base64(JSON{company_id}) with company_id taken from the request body, so
 *     anyone could mint a state for any company and attach their own calendar
 *     to it. It is now HMAC-signed, carries the caller's user id, provider and
 *     an expiry, and company_id comes from the caller's profile.
 *
 * Release plan (same as US-345): release N dual-writes the plaintext columns
 * (access_token is NOT NULL, and a rollback of the edge functions reads it);
 * readers prefer ciphertext. N+1 stops writing plaintext once every row has
 * ciphertext (sync-calendar backfills a row the first time it syncs it).
 *
 * Pure apart from getCalendarTokenKey (Deno.env), so vitest can load it.
 */
import { encryptSecret, decryptSecret } from './quickbooks-token-crypto.ts';

export type CalendarProvider = 'google' | 'outlook';

export const CALENDAR_TOKEN_KEY_ENV = 'CALENDAR_TOKEN_ENCRYPTION_KEY';

/** Release N: keep writing the plaintext columns so a rollback still works. */
export const DUAL_WRITE_PLAINTEXT = true;

/** Every column holding token material. Read these only with the service-role client. */
export const CALENDAR_TOKEN_COLUMNS =
  'access_token, refresh_token, access_token_encrypted, refresh_token_encrypted, token_expires_at';

/** Refresh this long before the provider's stated expiry. */
export const REFRESH_SKEW_MS = 5 * 60 * 1000;

/** How long a signed OAuth state stays valid. */
export const OAUTH_STATE_TTL_MS = 15 * 60 * 1000;

/**
 * Microsoft only issues a refresh token when offline_access is requested, and
 * the callback's /me lookup needs User.Read.
 */
export const OUTLOOK_SCOPES = 'offline_access User.Read Calendars.Read';
export const GOOGLE_SCOPES =
  'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/userinfo.email';

export const TOKEN_ENDPOINTS: Record<CalendarProvider, string> = {
  google: 'https://oauth2.googleapis.com/token',
  outlook: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
};

/** Provider error codes that mean the grant is dead and only the user can fix it. */
const REAUTH_ERRORS = new Set(['invalid_grant', 'interaction_required', 'consent_required']);

const MIN_KEY_LENGTH = 32;

export function getCalendarTokenKey(): string {
  // A literal name, so scripts/check-edge-secrets.mjs lists it in
  // docs/EDGE_SECRETS.md. The typeof guard lets vitest load this file.
  const key: string | undefined = typeof Deno === 'undefined'
    ? undefined
    : Deno.env.get('CALENDAR_TOKEN_ENCRYPTION_KEY');
  if (!key || key.length < MIN_KEY_LENGTH) {
    throw new Error(
      `${CALENDAR_TOKEN_KEY_ENV} is not set (or shorter than ${MIN_KEY_LENGTH} characters); calendar tokens cannot be stored or read`,
    );
  }
  return key;
}

export function isCalendarProvider(p: unknown): p is CalendarProvider {
  return p === 'google' || p === 'outlook';
}

// ---------------------------------------------------------------------------
// Expiry and refresh

/**
 * True when the token expires within REFRESH_SKEW_MS. An unknown expiry is not
 * refreshed up front; withFreshToken still refreshes on a provider 401.
 */
export function tokenNeedsRefresh(
  expiresAt: string | null | undefined,
  now: number,
  skewMs = REFRESH_SKEW_MS,
): boolean {
  if (!expiresAt) return false;
  const t = Date.parse(expiresAt);
  if (Number.isNaN(t)) return true;
  return t - skewMs <= now;
}

export interface OAuthClientCreds {
  clientId: string;
  clientSecret: string;
}

export function buildRefreshRequest(
  provider: CalendarProvider,
  refreshToken: string,
  creds: OAuthClientCreds,
): { url: string; body: URLSearchParams } {
  const body = new URLSearchParams({
    client_id: creds.clientId,
    client_secret: creds.clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });
  // Microsoft requires the scope on a refresh; Google rejects nothing but does not need it.
  if (provider === 'outlook') body.set('scope', OUTLOOK_SCOPES);
  return { url: TOKEN_ENDPOINTS[provider], body };
}

export type RefreshOutcome =
  | { kind: 'refreshed'; accessToken: string; refreshToken: string; expiresAt: string; rotated: boolean }
  | { kind: 'reauth_required'; reason: string }
  | { kind: 'failed'; reason: string };

/**
 * Interpret a token-endpoint response. Google keeps the old refresh token
 * (it omits refresh_token); Microsoft rotates it and the new one must be
 * persisted or the next refresh fails with invalid_grant.
 */
export function interpretRefreshResponse(
  status: number,
  // deno-lint-ignore no-explicit-any
  body: any,
  previousRefreshToken: string,
  now: number,
): RefreshOutcome {
  const code = typeof body?.error === 'string' ? body.error : null;
  if (status >= 200 && status < 300 && typeof body?.access_token === 'string' && body.access_token) {
    const expiresIn = Number(body.expires_in);
    const seconds = Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn : 3600;
    const next = typeof body.refresh_token === 'string' && body.refresh_token ? body.refresh_token : null;
    return {
      kind: 'refreshed',
      accessToken: body.access_token,
      refreshToken: next ?? previousRefreshToken,
      expiresAt: new Date(now + seconds * 1000).toISOString(),
      rotated: next !== null && next !== previousRefreshToken,
    };
  }
  if (code && REAUTH_ERRORS.has(code)) {
    return { kind: 'reauth_required', reason: `Provider rejected the refresh token (${code})` };
  }
  return {
    kind: 'failed',
    reason: `Token refresh failed: HTTP ${status}${code ? ` (${code})` : ''}`,
  };
}

export async function refreshCalendarToken(
  provider: CalendarProvider,
  refreshToken: string | null | undefined,
  creds: OAuthClientCreds,
  fetchImpl: typeof fetch = fetch,
  now: () => number = Date.now,
): Promise<RefreshOutcome> {
  if (!refreshToken) {
    return { kind: 'reauth_required', reason: 'No refresh token stored for this connection' };
  }
  const { url, body } = buildRefreshRequest(provider, refreshToken, creds);
  let res: Response;
  try {
    res = await fetchImpl(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
  } catch (err) {
    return { kind: 'failed', reason: `Token refresh request failed: ${err instanceof Error ? err.message : String(err)}` };
  }
  // deno-lint-ignore no-explicit-any
  let json: any = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return interpretRefreshResponse(res.status, json, refreshToken, now());
}

export type ProviderCall<T> = { unauthorized: true } | { unauthorized: false; value: T };

export type FreshTokenResult<T> =
  | { kind: 'ok'; value: T; refreshed: Extract<RefreshOutcome, { kind: 'refreshed' }> | null }
  | { kind: 'reauth_required'; reason: string; refreshed: Extract<RefreshOutcome, { kind: 'refreshed' }> | null }
  | { kind: 'failed'; reason: string; refreshed: Extract<RefreshOutcome, { kind: 'refreshed' }> | null };

/**
 * Run `call` with a token that is not about to expire. Refreshes first when
 * the stored expiry is within the skew, and once more if the provider answers
 * 401 anyway (clock skew, early revocation of the access token). A second 401
 * after a successful refresh means the grant no longer covers the call, which
 * is also a reconnect. `refreshed` carries the new tokens for the caller to
 * persist, whatever the final outcome.
 */
export async function withFreshToken<T>(opts: {
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: string | null | undefined;
  now: number;
  refresh: (refreshToken: string | null) => Promise<RefreshOutcome>;
  call: (accessToken: string) => Promise<ProviderCall<T>>;
}): Promise<FreshTokenResult<T>> {
  let access = opts.accessToken;
  let refreshTok = opts.refreshToken;
  let refreshed: Extract<RefreshOutcome, { kind: 'refreshed' }> | null = null;

  const doRefresh = async (): Promise<FreshTokenResult<T> | null> => {
    const r = await opts.refresh(refreshTok);
    if (r.kind !== 'refreshed') return { ...r, refreshed };
    refreshed = r;
    access = r.accessToken;
    refreshTok = r.refreshToken;
    return null;
  };

  if (!access || tokenNeedsRefresh(opts.expiresAt, opts.now)) {
    const stop = await doRefresh();
    if (stop) return stop;
  }

  let res = await opts.call(access as string);
  if (res.unauthorized) {
    if (refreshed) {
      return { kind: 'reauth_required', reason: 'Provider rejected a freshly refreshed token', refreshed };
    }
    const stop = await doRefresh();
    if (stop) return stop;
    res = await opts.call(access as string);
    if (res.unauthorized) {
      return { kind: 'reauth_required', reason: 'Provider rejected a freshly refreshed token', refreshed };
    }
  }
  return { kind: 'ok', value: res.value, refreshed };
}

// ---------------------------------------------------------------------------
// Encryption at rest

export interface StoredCalendarTokenRow {
  access_token?: string | null;
  refresh_token?: string | null;
  access_token_encrypted?: string | null;
  refresh_token_encrypted?: string | null;
  token_expires_at?: string | null;
}

export interface CalendarTokens {
  accessToken: string | null;
  refreshToken: string | null;
}

/** Prefer ciphertext; fall back to plaintext only for a row not yet encrypted. */
export async function readCalendarTokens(row: StoredCalendarTokenRow, secret: string): Promise<CalendarTokens> {
  const pick = async (enc?: string | null, plain?: string | null) =>
    enc ? await decryptSecret(enc, secret) : (plain ?? null);
  return {
    accessToken: await pick(row.access_token_encrypted, row.access_token),
    refreshToken: await pick(row.refresh_token_encrypted, row.refresh_token),
  };
}

/** True when the row still carries plaintext token material with no ciphertext beside it. */
export function needsEncryptionBackfill(row: StoredCalendarTokenRow): boolean {
  return (!!row.access_token && !row.access_token_encrypted) ||
    (!!row.refresh_token && !row.refresh_token_encrypted);
}

/**
 * Column values for a token set. A null refresh token leaves the stored one
 * alone (Google omits it on a re-consent it has already granted).
 */
export async function calendarTokenColumnsForWrite(
  tokens: { accessToken: string; refreshToken: string | null; expiresAt?: string | null },
  secret: string,
): Promise<Record<string, string | null>> {
  const cols: Record<string, string | null> = {
    access_token_encrypted: await encryptSecret(tokens.accessToken, secret),
  };
  if (DUAL_WRITE_PLAINTEXT) cols.access_token = tokens.accessToken;
  if (tokens.refreshToken) {
    cols.refresh_token_encrypted = await encryptSecret(tokens.refreshToken, secret);
    if (DUAL_WRITE_PLAINTEXT) cols.refresh_token = tokens.refreshToken;
  }
  if (tokens.expiresAt !== undefined) cols.token_expires_at = tokens.expiresAt;
  return cols;
}

// ---------------------------------------------------------------------------
// Signed OAuth state

export interface CalendarOAuthState {
  company_id: string;
  user_id: string;
  provider: CalendarProvider;
  /** Expiry, epoch milliseconds. */
  exp: number;
  /** Random, so two states for the same user are not identical. */
  n: string;
}

const STATE_CONTEXT = 'brikly-calendar-oauth-state:v1:';

function b64url(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64url(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmac(secret: string, data: string): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(STATE_CONTEXT + data)));
}

export async function signOAuthState(
  input: { company_id: string; user_id: string; provider: CalendarProvider },
  secret: string,
  now: number = Date.now(),
): Promise<string> {
  const payload: CalendarOAuthState = {
    ...input,
    exp: now + OAUTH_STATE_TTL_MS,
    n: b64url(crypto.getRandomValues(new Uint8Array(12))),
  };
  const body = b64url(new TextEncoder().encode(JSON.stringify(payload)));
  return `${body}.${b64url(await hmac(secret, body))}`;
}

/** The verified payload, or null for a forged, expired, malformed or wrong-provider state. */
export async function verifyOAuthState(
  state: string | null | undefined,
  secret: string,
  provider: CalendarProvider,
  now: number = Date.now(),
): Promise<CalendarOAuthState | null> {
  if (!state || !secret) return null;
  const dot = state.indexOf('.');
  if (dot <= 0 || dot !== state.lastIndexOf('.')) return null;
  const body = state.slice(0, dot);
  const sig = state.slice(dot + 1);
  let given: Uint8Array;
  try {
    given = fromB64url(sig);
  } catch {
    return null;
  }
  const expected = await hmac(secret, body);
  if (given.length !== expected.length) return null;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected[i] ^ given[i];
  if (diff !== 0) return null;

  let payload: CalendarOAuthState;
  try {
    payload = JSON.parse(new TextDecoder().decode(fromB64url(body)));
  } catch {
    return null;
  }
  if (!payload || typeof payload !== 'object') return null;
  if (payload.provider !== provider) return null;
  if (typeof payload.company_id !== 'string' || typeof payload.user_id !== 'string') return null;
  if (typeof payload.exp !== 'number' || payload.exp < now) return null;
  return payload;
}
