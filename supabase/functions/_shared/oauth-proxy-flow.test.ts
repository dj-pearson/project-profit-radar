import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  checkPendingState, decideLink, emailVerified, readCookie, safeReturnPath, sha256Hex, signState, verifyState,
} from '../oauth-proxy/flow.ts';

const SECRET = 'test-secret';
const future = () => new Date(Date.now() + 5 * 60_000).toISOString();

describe('oauth-proxy state (US-349)', () => {
  it('accepts a state it signed and returns the id', async () => {
    expect(await verifyState(await signState('abc123', SECRET), SECRET)).toBe('abc123');
  });

  it('rejects a forged or re-signed state, and the old base64 JSON shape', async () => {
    expect(await verifyState(await signState('abc123', 'other-secret'), SECRET)).toBeNull();
    expect(await verifyState('abc123.not-a-mac', SECRET)).toBeNull();
    const legacy = btoa(JSON.stringify({ verifier: 'v', redirectTo: '/dashboard', provider: 'google' }));
    expect(await verifyState(legacy, SECRET)).toBeNull();
  });

  it('rejects a state replayed from another session (a different browser cookie)', async () => {
    const row = { expires_at: future(), browser_binding: await sha256Hex('nonce-of-browser-A'), provider: 'google' };
    expect(await checkPendingState(row, 'nonce-of-browser-B')).toEqual({ ok: false, reason: 'other-browser' });
    expect(await checkPendingState(row, null)).toEqual({ ok: false, reason: 'other-browser' });
    expect(await checkPendingState(row, 'nonce-of-browser-A')).toEqual({ ok: true });
  });

  it('rejects a used (deleted) or expired state', async () => {
    expect(await checkPendingState(null, 'n')).toEqual({ ok: false, reason: 'unknown-state' });
    const old = { expires_at: new Date(Date.now() - 1000).toISOString(), browser_binding: await sha256Hex('n'), provider: 'google' };
    expect(await checkPendingState(old, 'n')).toEqual({ ok: false, reason: 'expired' });
  });

  it('reads the binding cookie out of a Cookie header', () => {
    expect(readCookie('a=1; __Host-brikly_oauth=xyz; b=2', '__Host-brikly_oauth')).toBe('xyz');
    expect(readCookie(null, '__Host-brikly_oauth')).toBeNull();
  });

  it('only lets same-site paths be the post-login destination', () => {
    expect(safeReturnPath('/projects/1')).toBe('/projects/1');
    expect(safeReturnPath('//evil.example')).toBe('/dashboard');
    expect(safeReturnPath('https://evil.example')).toBe('/dashboard');
    expect(safeReturnPath('/\\evil.example')).toBe('/dashboard');
  });
});

describe('oauth-proxy identity (US-349)', () => {
  it('requires the provider to have verified the email', () => {
    expect(emailVerified({ email_verified: true })).toBe(true);
    expect(emailVerified({ email_verified: 'true' })).toBe(true);
    expect(emailVerified({ email_verified: false })).toBe(false);
    expect(emailVerified({})).toBe(false);
  });

  it('a (provider, subject) match signs that user in, even without a verified email', () => {
    expect(decideLink([{ user_id: 'u1', matched_by: 'subject', stored_subject: 'g-1' }], 'g-1', false))
      .toEqual({ action: 'sign-in', userId: 'u1' });
  });

  it('falls back to email only when verified, and binds the subject', () => {
    const byEmail = [{ user_id: 'u2', matched_by: 'email' as const, stored_subject: null }];
    expect(decideLink(byEmail, 'g-2', true)).toEqual({ action: 'link-then-sign-in', userId: 'u2' });
    expect(decideLink(byEmail, 'g-2', false)).toMatchObject({ action: 'refuse' });
  });

  it('refuses when the email belongs to a user bound to a different subject', () => {
    expect(decideLink([{ user_id: 'u3', matched_by: 'email', stored_subject: 'g-original' }], 'g-attacker', true))
      .toMatchObject({ action: 'refuse' });
  });

  it('creates a user only for a verified email nobody has', () => {
    expect(decideLink([], 'g-4', true)).toEqual({ action: 'create' });
    expect(decideLink([], 'g-4', false)).toMatchObject({ action: 'refuse' });
    expect(decideLink([], null, true)).toMatchObject({ action: 'refuse' });
  });

  it('the handler no longer lists users or trusts a decoded state', () => {
    const src = readFileSync('supabase/functions/oauth-proxy/index.ts', 'utf8');
    expect(src).not.toContain('listUsers(');
    expect(src).not.toContain('JSON.parse(atob(state))');
    expect(src).toContain("rpc('find_oauth_user'");
    expect(src).toContain('checkPendingState(');
  });
});
