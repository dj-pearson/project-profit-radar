import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  encryptSecret, decryptSecret, readQuickBooksTokens, tokenColumnsForWrite,
  getQuickBooksTokenKey, loadQuickBooksTokens, QB_TOKEN_COLUMNS, CLEARED_TOKEN_COLUMNS,
} from './quickbooks-token-crypto';

// US-345: Intuit tokens were stored in plain text and selected into the browser.
const KEY = 'k'.repeat(16) + 'Q7v!x2#pL9m@r4Tz'; // 32 chars
const OTHER_KEY = 'z'.repeat(32);
const AT = 'eyJlbmMiOiJBMTI4Q0JDLUhTMjU2IiwiYWxnIjoiZGlyIn0..access';
const RT = 'AB11763489218Wz8pXrefresh';

// The inline encryptKey from store-stripe-keys/index.ts, verbatim in behaviour,
// so the shared helper is proven to read what that function writes.
async function stripeStyleEncrypt(plain: string, secret: string): Promise<string> {
  const keyBuffer = new TextEncoder().encode(secret.padEnd(32, '0').slice(0, 32));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const k = await crypto.subtle.importKey('raw', keyBuffer, { name: 'AES-GCM' }, false, ['encrypt']);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, k, new TextEncoder().encode(plain));
  const combined = new Uint8Array(iv.length + ct.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ct), iv.length);
  return btoa(String.fromCharCode(...combined));
}

afterEach(() => {
  delete (globalThis as { Deno?: unknown }).Deno;
});

describe('encryptSecret / decryptSecret', () => {
  it('round-trips and never contains the plaintext', async () => {
    const enc = await encryptSecret(AT, KEY);
    expect(enc).not.toContain('access');
    expect(await decryptSecret(enc, KEY)).toBe(AT);
  });

  it('uses a fresh IV per call', async () => {
    expect(await encryptSecret(RT, KEY)).not.toBe(await encryptSecret(RT, KEY));
  });

  it('decrypts what store-stripe-keys writes (same format)', async () => {
    expect(await decryptSecret(await stripeStyleEncrypt(RT, KEY), KEY)).toBe(RT);
  });

  it('rejects the wrong key and a tampered ciphertext', async () => {
    const enc = await encryptSecret(RT, KEY);
    await expect(decryptSecret(enc, OTHER_KEY)).rejects.toThrow();
    const bytes = atob(enc).split('');
    bytes[20] = String.fromCharCode(bytes[20].charCodeAt(0) ^ 1);
    await expect(decryptSecret(btoa(bytes.join('')), KEY)).rejects.toThrow();
  });

  it('refuses a key shorter than 32 characters instead of zero-padding it', async () => {
    await expect(encryptSecret(RT, 'short')).rejects.toThrow(/at least 32/);
  });
});

describe('readQuickBooksTokens', () => {
  it('prefers the ciphertext over a stale plaintext value', async () => {
    const row = {
      access_token: 'stale-at', refresh_token: 'stale-rt',
      access_token_encrypted: await encryptSecret(AT, KEY),
      refresh_token_encrypted: await encryptSecret(RT, KEY),
    };
    expect(await readQuickBooksTokens(row, KEY)).toEqual({ accessToken: AT, refreshToken: RT });
  });

  it('falls back to plaintext for a row the backfill has not reached', async () => {
    expect(await readQuickBooksTokens({ access_token: AT, refresh_token: RT }, KEY))
      .toEqual({ accessToken: AT, refreshToken: RT });
  });

  it('throws on undecryptable ciphertext rather than quietly using plaintext', async () => {
    const row = { access_token: AT, access_token_encrypted: await encryptSecret(AT, OTHER_KEY) };
    await expect(readQuickBooksTokens(row, KEY)).rejects.toThrow();
  });

  it('returns nulls for a disconnected row', async () => {
    expect(await readQuickBooksTokens({}, KEY)).toEqual({ accessToken: null, refreshToken: null });
  });
});

describe('tokenColumnsForWrite', () => {
  it('writes ciphertext for both tokens and dual-writes plaintext in release N', async () => {
    const cols = await tokenColumnsForWrite({ accessToken: AT, refreshToken: RT }, KEY);
    expect(await decryptSecret(cols.access_token_encrypted!, KEY)).toBe(AT);
    expect(await decryptSecret(cols.refresh_token_encrypted!, KEY)).toBe(RT);
    expect(cols.access_token).toBe(AT);
    expect(cols.refresh_token).toBe(RT);
  });

  it('disconnect clears all four token columns', () => {
    expect(Object.keys(CLEARED_TOKEN_COLUMNS).sort()).toEqual(
      QB_TOKEN_COLUMNS.split(', ').sort(),
    );
    expect(Object.values(CLEARED_TOKEN_COLUMNS).every((v) => v === null)).toBe(true);
  });
});

describe('getQuickBooksTokenKey', () => {
  const setEnv = (v?: string) => {
    (globalThis as { Deno?: unknown }).Deno = { env: { get: () => v } };
  };

  it('fails closed when the secret is missing or short', () => {
    setEnv(undefined);
    expect(() => getQuickBooksTokenKey()).toThrow(/QUICKBOOKS_TOKEN_ENCRYPTION_KEY/);
    setEnv('too-short');
    expect(() => getQuickBooksTokenKey()).toThrow(/QUICKBOOKS_TOKEN_ENCRYPTION_KEY/);
  });

  it('returns a 32+ character secret', () => {
    setEnv(KEY);
    expect(getQuickBooksTokenKey()).toBe(KEY);
  });
});

describe('loadQuickBooksTokens', () => {
  it('reads only the token columns for the already-authorised row id', async () => {
    const single = vi.fn().mockResolvedValue({
      data: { access_token_encrypted: await encryptSecret(AT, KEY), refresh_token_encrypted: await encryptSecret(RT, KEY) },
      error: null,
    });
    const eq = vi.fn(() => ({ single }));
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select }));
    const tokens = await loadQuickBooksTokens({ from }, 'row-1', KEY);
    expect(from).toHaveBeenCalledWith('quickbooks_integrations');
    expect(select).toHaveBeenCalledWith(QB_TOKEN_COLUMNS);
    expect(eq).toHaveBeenCalledWith('id', 'row-1');
    expect(tokens).toEqual({ accessToken: AT, refreshToken: RT });
  });

  it('throws when the row cannot be read', async () => {
    const single = vi.fn().mockResolvedValue({ data: null, error: { message: 'boom' } });
    const client = { from: () => ({ select: () => ({ eq: () => ({ single }) }) }) };
    await expect(loadQuickBooksTokens(client, 'row-1', KEY)).rejects.toThrow(/boom/);
  });
});
