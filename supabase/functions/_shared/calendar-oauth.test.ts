import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  tokenNeedsRefresh, buildRefreshRequest, interpretRefreshResponse, refreshCalendarToken,
  withFreshToken, readCalendarTokens, calendarTokenColumnsForWrite, needsEncryptionBackfill,
  signOAuthState, verifyOAuthState, getCalendarTokenKey, OUTLOOK_SCOPES, OAUTH_STATE_TTL_MS,
  type RefreshOutcome,
} from './calendar-oauth';
import { encryptSecret, decryptSecret } from './quickbooks-token-crypto';

// US-395: calendar sync had no refresh path and stopped an hour after connecting.
const KEY = 'c'.repeat(16) + 'Hq8#vN2!pX5@wL7z'; // 32 chars
const OTHER_KEY = 'y'.repeat(32);
const NOW = Date.parse('2026-09-23T12:00:00Z');
const CREDS = { clientId: 'client-id', clientSecret: 'client-secret' };

afterEach(() => {
  delete (globalThis as { Deno?: unknown }).Deno;
});

describe('tokenNeedsRefresh', () => {
  it('refreshes inside the five-minute skew and after expiry', () => {
    expect(tokenNeedsRefresh('2026-09-23T12:04:00Z', NOW)).toBe(true);
    expect(tokenNeedsRefresh('2026-09-23T11:00:00Z', NOW)).toBe(true);
    expect(tokenNeedsRefresh('2026-09-23T12:30:00Z', NOW)).toBe(false);
  });

  it('does not refresh up front when the expiry is unknown, but does when it is garbage', () => {
    expect(tokenNeedsRefresh(null, NOW)).toBe(false);
    expect(tokenNeedsRefresh(undefined, NOW)).toBe(false);
    expect(tokenNeedsRefresh('not a date', NOW)).toBe(true);
  });
});

describe('buildRefreshRequest', () => {
  it('posts a refresh_token grant to Google', () => {
    const { url, body } = buildRefreshRequest('google', 'rt', CREDS);
    expect(url).toBe('https://oauth2.googleapis.com/token');
    expect(body.get('grant_type')).toBe('refresh_token');
    expect(body.get('refresh_token')).toBe('rt');
    expect(body.get('client_id')).toBe('client-id');
    expect(body.get('scope')).toBeNull();
  });

  it('sends the offline_access scope to Microsoft', () => {
    const { url, body } = buildRefreshRequest('outlook', 'rt', CREDS);
    expect(url).toBe('https://login.microsoftonline.com/common/oauth2/v2.0/token');
    expect(body.get('scope')).toBe(OUTLOOK_SCOPES);
    expect(OUTLOOK_SCOPES).toContain('offline_access');
  });
});

describe('interpretRefreshResponse', () => {
  it('keeps the old refresh token when Google omits a new one', () => {
    const r = interpretRefreshResponse(200, { access_token: 'at2', expires_in: 3599 }, 'rt1', NOW);
    expect(r).toEqual({
      kind: 'refreshed', accessToken: 'at2', refreshToken: 'rt1',
      expiresAt: new Date(NOW + 3599_000).toISOString(), rotated: false,
    });
  });

  it('takes the rotated refresh token Microsoft returns', () => {
    const r = interpretRefreshResponse(200, { access_token: 'at2', refresh_token: 'rt2', expires_in: 4000 }, 'rt1', NOW);
    expect(r.kind).toBe('refreshed');
    if (r.kind === 'refreshed') {
      expect(r.refreshToken).toBe('rt2');
      expect(r.rotated).toBe(true);
    }
  });

  it('defaults a missing expires_in to an hour', () => {
    const r = interpretRefreshResponse(200, { access_token: 'at2' }, 'rt1', NOW);
    expect(r.kind === 'refreshed' && r.expiresAt).toBe(new Date(NOW + 3600_000).toISOString());
  });

  it('maps invalid_grant and Microsoft interaction errors to reauth_required', () => {
    expect(interpretRefreshResponse(400, { error: 'invalid_grant' }, 'rt', NOW).kind).toBe('reauth_required');
    expect(interpretRefreshResponse(400, { error: 'interaction_required' }, 'rt', NOW).kind).toBe('reauth_required');
    expect(interpretRefreshResponse(400, { error: 'consent_required' }, 'rt', NOW).kind).toBe('reauth_required');
  });

  it('treats a server or config error as a failure, not a reconnect', () => {
    expect(interpretRefreshResponse(500, null, 'rt', NOW)).toEqual({ kind: 'failed', reason: 'Token refresh failed: HTTP 500' });
    expect(interpretRefreshResponse(401, { error: 'invalid_client' }, 'rt', NOW)).toEqual({
      kind: 'failed', reason: 'Token refresh failed: HTTP 401 (invalid_client)',
    });
    // 200 without an access token is not a success.
    expect(interpretRefreshResponse(200, {}, 'rt', NOW).kind).toBe('failed');
  });
});

describe('refreshCalendarToken', () => {
  it('asks for a reconnect without calling the provider when no refresh token is stored', async () => {
    const f = vi.fn();
    const r = await refreshCalendarToken('google', null, CREDS, f as unknown as typeof fetch);
    expect(r.kind).toBe('reauth_required');
    expect(f).not.toHaveBeenCalled();
  });

  it('posts the refresh grant and interprets the answer', async () => {
    const f = vi.fn(async () => new Response(JSON.stringify({ access_token: 'new', expires_in: 60 }), { status: 200 }));
    const r = await refreshCalendarToken('outlook', 'rt', CREDS, f as unknown as typeof fetch, () => NOW);
    expect(r).toMatchObject({ kind: 'refreshed', accessToken: 'new', refreshToken: 'rt' });
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain('login.microsoftonline.com');
    expect(init.method).toBe('POST');
    expect((init.body as URLSearchParams).get('grant_type')).toBe('refresh_token');
  });

  it('reports a network error as failed', async () => {
    const f = vi.fn(async () => { throw new Error('dns'); });
    const r = await refreshCalendarToken('google', 'rt', CREDS, f as unknown as typeof fetch);
    expect(r).toEqual({ kind: 'failed', reason: 'Token refresh request failed: dns' });
  });

  it('reports invalid_grant from the wire as reauth_required', async () => {
    const f = vi.fn(async () => new Response(JSON.stringify({ error: 'invalid_grant' }), { status: 400 }));
    expect((await refreshCalendarToken('google', 'rt', CREDS, f as unknown as typeof fetch)).kind).toBe('reauth_required');
  });
});

describe('withFreshToken', () => {
  const refreshed = (token = 'fresh'): RefreshOutcome => ({
    kind: 'refreshed', accessToken: token, refreshToken: 'rt2', expiresAt: '2026-09-23T13:00:00Z', rotated: true,
  });

  it('does not refresh a token that is still valid', async () => {
    const refresh = vi.fn();
    const call = vi.fn(async (t: string) => ({ unauthorized: false as const, value: t }));
    const r = await withFreshToken({
      accessToken: 'old', refreshToken: 'rt', expiresAt: '2026-09-23T13:00:00Z', now: NOW, refresh, call,
    });
    expect(r).toEqual({ kind: 'ok', value: 'old', refreshed: null });
    expect(refresh).not.toHaveBeenCalled();
  });

  it('refreshes before the call when the token is about to expire', async () => {
    const refresh = vi.fn(async () => refreshed());
    const call = vi.fn(async (t: string) => ({ unauthorized: false as const, value: t }));
    const r = await withFreshToken({
      accessToken: 'old', refreshToken: 'rt', expiresAt: '2026-09-23T12:01:00Z', now: NOW, refresh, call,
    });
    expect(r.kind).toBe('ok');
    expect(r.kind === 'ok' && r.value).toBe('fresh');
    expect(r.refreshed?.refreshToken).toBe('rt2');
    expect(call).toHaveBeenCalledTimes(1);
  });

  it('refreshes and retries once on a provider 401', async () => {
    const refresh = vi.fn(async () => refreshed());
    const call = vi.fn(async (t: string) =>
      t === 'old' ? { unauthorized: true as const } : { unauthorized: false as const, value: t });
    const r = await withFreshToken({ accessToken: 'old', refreshToken: 'rt', expiresAt: null, now: NOW, refresh, call });
    expect(r.kind === 'ok' && r.value).toBe('fresh');
    expect(call).toHaveBeenCalledTimes(2);
  });

  it('asks for a reconnect when the refresh is refused', async () => {
    const refresh = vi.fn(async (): Promise<RefreshOutcome> => ({ kind: 'reauth_required', reason: 'invalid_grant' }));
    const call = vi.fn();
    const r = await withFreshToken({
      accessToken: 'old', refreshToken: 'rt', expiresAt: '2026-09-23T11:00:00Z', now: NOW, refresh, call,
    });
    expect(r).toEqual({ kind: 'reauth_required', reason: 'invalid_grant', refreshed: null });
    expect(call).not.toHaveBeenCalled();
  });

  it('asks for a reconnect when a freshly refreshed token still gets 401', async () => {
    const refresh = vi.fn(async () => refreshed());
    const call = vi.fn(async () => ({ unauthorized: true as const }));
    const r = await withFreshToken({ accessToken: 'old', refreshToken: 'rt', expiresAt: null, now: NOW, refresh, call });
    expect(r.kind).toBe('reauth_required');
    // The refreshed tokens are still handed back so the caller persists them.
    expect(r.refreshed?.accessToken).toBe('fresh');
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('passes a refresh failure through without calling the provider', async () => {
    const refresh = vi.fn(async (): Promise<RefreshOutcome> => ({ kind: 'failed', reason: 'HTTP 500' }));
    const call = vi.fn();
    const r = await withFreshToken({ accessToken: null, refreshToken: 'rt', expiresAt: null, now: NOW, refresh, call });
    expect(r).toEqual({ kind: 'failed', reason: 'HTTP 500', refreshed: null });
    expect(call).not.toHaveBeenCalled();
  });
});

describe('token encryption at rest', () => {
  it('round-trips and dual-writes plaintext in release N', async () => {
    const cols = await calendarTokenColumnsForWrite({ accessToken: 'at', refreshToken: 'rt', expiresAt: 'x' }, KEY);
    expect(cols.access_token).toBe('at');
    expect(cols.refresh_token).toBe('rt');
    expect(cols.token_expires_at).toBe('x');
    expect(cols.access_token_encrypted).not.toContain('at');
    expect(await decryptSecret(cols.access_token_encrypted as string, KEY)).toBe('at');
    expect(await readCalendarTokens(cols, KEY)).toEqual({ accessToken: 'at', refreshToken: 'rt' });
  });

  it('leaves the stored refresh token alone when none is supplied', async () => {
    const cols = await calendarTokenColumnsForWrite({ accessToken: 'at', refreshToken: null }, KEY);
    expect('refresh_token' in cols).toBe(false);
    expect('refresh_token_encrypted' in cols).toBe(false);
    expect('token_expires_at' in cols).toBe(false);
  });

  it('prefers ciphertext, falls back to plaintext, and throws on a wrong key', async () => {
    const enc = await encryptSecret('secret-at', KEY);
    expect(await readCalendarTokens({ access_token: 'stale', access_token_encrypted: enc, refresh_token: 'rt' }, KEY))
      .toEqual({ accessToken: 'secret-at', refreshToken: 'rt' });
    await expect(readCalendarTokens({ access_token_encrypted: enc }, OTHER_KEY)).rejects.toThrow();
  });

  it('flags rows that still need their ciphertext written', () => {
    expect(needsEncryptionBackfill({ access_token: 'a' })).toBe(true);
    expect(needsEncryptionBackfill({ access_token: 'a', access_token_encrypted: 'e', refresh_token: 'r' })).toBe(true);
    expect(needsEncryptionBackfill({ access_token: 'a', access_token_encrypted: 'e' })).toBe(false);
  });

  it('reads the key from the environment and fails closed', () => {
    (globalThis as { Deno?: unknown }).Deno = { env: { get: () => undefined } };
    expect(() => getCalendarTokenKey()).toThrow(/CALENDAR_TOKEN_ENCRYPTION_KEY/);
    (globalThis as { Deno?: unknown }).Deno = { env: { get: () => 'short' } };
    expect(() => getCalendarTokenKey()).toThrow();
    (globalThis as { Deno?: unknown }).Deno = { env: { get: () => KEY } };
    expect(getCalendarTokenKey()).toBe(KEY);
  });
});

describe('signed OAuth state', () => {
  const input = { company_id: 'co-1', user_id: 'user-1', provider: 'google' as const };

  it('verifies a state it signed', async () => {
    const state = await signOAuthState(input, KEY, NOW);
    const v = await verifyOAuthState(state, KEY, 'google', NOW + 1000);
    expect(v).toMatchObject(input);
  });

  it('rejects the old unsigned base64 JSON state', async () => {
    const legacy = btoa(JSON.stringify({ company_id: 'victim-co' }));
    expect(await verifyOAuthState(legacy, KEY, 'google', NOW)).toBeNull();
  });

  it('rejects a payload swapped under a valid signature', async () => {
    const state = await signOAuthState(input, KEY, NOW);
    const [, sig] = state.split('.');
    const forged = btoa(JSON.stringify({ ...input, company_id: 'victim-co', exp: NOW + 1e6, n: 'x' }))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    expect(await verifyOAuthState(`${forged}.${sig}`, KEY, 'google', NOW)).toBeNull();
  });

  it('rejects a wrong key, the other provider, and an expired state', async () => {
    const state = await signOAuthState(input, KEY, NOW);
    expect(await verifyOAuthState(state, OTHER_KEY, 'google', NOW)).toBeNull();
    expect(await verifyOAuthState(state, KEY, 'outlook', NOW)).toBeNull();
    expect(await verifyOAuthState(state, KEY, 'google', NOW + OAUTH_STATE_TTL_MS + 1)).toBeNull();
  });

  it('rejects empty and malformed input', async () => {
    expect(await verifyOAuthState(null, KEY, 'google', NOW)).toBeNull();
    expect(await verifyOAuthState('', KEY, 'google', NOW)).toBeNull();
    expect(await verifyOAuthState('a.b.c', KEY, 'google', NOW)).toBeNull();
    expect(await verifyOAuthState('!!!.???', KEY, 'google', NOW)).toBeNull();
  });
});
