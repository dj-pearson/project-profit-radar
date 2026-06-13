import { describe, it, expect, beforeEach } from 'vitest';
import { supabaseStorage, purgeSupabaseSessionStorage } from '../supabaseStorage';

const SENTINEL = 'brikly.auth.signed_out';

/**
 * US-204: an explicit sign-out must set a persisted sentinel so a stale token
 * is never silently re-hydrated, and a fresh authenticated session write must
 * lift that sentinel. (Tests exercise the web adapter active in this env.)
 */
describe('supabaseStorage sign-out sentinel', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('purge removes auth tokens and sets the signed-out sentinel', async () => {
    localStorage.setItem('sb-api-auth-token', 'session-blob');
    localStorage.setItem('sb-foo-auth-token.0', 'chunk');
    localStorage.setItem('unrelated', 'keep-me');

    await purgeSupabaseSessionStorage();

    expect(localStorage.getItem('sb-api-auth-token')).toBeNull();
    expect(localStorage.getItem('sb-foo-auth-token.0')).toBeNull();
    expect(localStorage.getItem('unrelated')).toBe('keep-me');
    expect(localStorage.getItem(SENTINEL)).toBe('1');
  });

  it('writing a fresh auth-token session lifts the sentinel', () => {
    localStorage.setItem(SENTINEL, '1');
    supabaseStorage.setItem('sb-api-auth-token', 'fresh-session');
    expect(localStorage.getItem(SENTINEL)).toBeNull();
    expect(localStorage.getItem('sb-api-auth-token')).toBe('fresh-session');
  });

  it('writing a non-auth key does not lift the sentinel', () => {
    localStorage.setItem(SENTINEL, '1');
    supabaseStorage.setItem('some-cache-key', 'value');
    expect(localStorage.getItem(SENTINEL)).toBe('1');
  });
});
