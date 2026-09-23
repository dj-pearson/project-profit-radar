/**
 * QuickBooks OAuth token encryption (US-345).
 *
 * Intuit access and refresh tokens used to sit in quickbooks_integrations as
 * plain text, and both integration components selected '*', so every admin's
 * browser received them. They are now stored AES-256-GCM encrypted in
 * access_token_encrypted / refresh_token_encrypted, and the authenticated role
 * cannot SELECT any of the four token columns
 * (20260923180000_quickbooks_token_encryption.sql). Only edge functions read
 * them, through the service-role client, after RLS has confirmed the caller is
 * an admin of the company.
 *
 * The cipher and wire format are the ones store-stripe-keys uses for Stripe
 * keys: a random 12-byte IV, AES-GCM, and base64(iv || ciphertext+tag), with
 * the key taken from the UTF-8 bytes of the secret. encryptSecret/decryptSecret
 * are deliberately generic so store-stripe-keys can import them instead of its
 * inline copy. One difference: a key shorter than 32 characters is rejected
 * here rather than zero-padded, because padding a short secret is how a weak
 * key ends up looking like a 256-bit one.
 *
 * The key is QUICKBOOKS_TOKEN_ENCRYPTION_KEY (Supabase edge-function secret),
 * separate from STRIPE_ENCRYPTION_KEY so one leak or rotation does not take
 * the other with it.
 *
 * Release plan (see the migration header for the SQL side):
 *   N   (this change) writers dual-write plaintext + ciphertext; readers
 *       prefer ciphertext and fall back to plaintext for rows the backfill
 *       has not reached. DUAL_WRITE_PLAINTEXT = true keeps a rollback of the
 *       edge functions to the previous version working.
 *   N+1 set DUAL_WRITE_PLAINTEXT = false, delete the plaintext fallback, and
 *       NULL the plaintext columns once the backfill count is zero.
 *   N+2 drop access_token / refresh_token.
 */

export const QB_TOKEN_KEY_ENV = 'QUICKBOOKS_TOKEN_ENCRYPTION_KEY';

/** Release N: keep writing the plaintext columns so a rollback still works. */
export const DUAL_WRITE_PLAINTEXT = true;

/** Every column that holds token material. Never select these with a user-JWT client. */
export const QB_TOKEN_COLUMNS =
  'access_token, refresh_token, access_token_encrypted, refresh_token_encrypted';

const IV_BYTES = 12;
const MIN_KEY_LENGTH = 32;

function toBase64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

function fromBase64(b64: string): Uint8Array {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

async function importKey(secret: string, usage: KeyUsage): Promise<CryptoKey> {
  if (!secret || secret.length < MIN_KEY_LENGTH) {
    throw new Error(`encryption key must be at least ${MIN_KEY_LENGTH} characters`);
  }
  // Same derivation as store-stripe-keys (padEnd is a no-op at >= 32 chars).
  const raw = new TextEncoder().encode(secret.padEnd(32, '0').slice(0, 32));
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, [usage]);
}

/** AES-256-GCM, returned as base64(iv || ciphertext). */
export async function encryptSecret(plaintext: string, secret: string): Promise<string> {
  const key = await importKey(secret, 'encrypt');
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plaintext)),
  );
  const combined = new Uint8Array(iv.length + ct.length);
  combined.set(iv);
  combined.set(ct, iv.length);
  return toBase64(combined);
}

/** Inverse of encryptSecret. Throws on a wrong key or a tampered value. */
export async function decryptSecret(encoded: string, secret: string): Promise<string> {
  const key = await importKey(secret, 'decrypt');
  const combined = fromBase64(encoded);
  if (combined.length <= IV_BYTES) throw new Error('ciphertext too short');
  const pt = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: combined.slice(0, IV_BYTES) },
    key,
    combined.slice(IV_BYTES),
  );
  return new TextDecoder().decode(pt);
}

/** Reads the key from the edge-function environment; fails closed when it is missing or short. */
export function getQuickBooksTokenKey(): string {
  // deno-lint-ignore no-explicit-any
  const env = (globalThis as any).Deno?.env;
  const key: string | undefined = env?.get(QB_TOKEN_KEY_ENV);
  if (!key || key.length < MIN_KEY_LENGTH) {
    throw new Error(
      `${QB_TOKEN_KEY_ENV} is not set (or shorter than ${MIN_KEY_LENGTH} characters); QuickBooks tokens cannot be stored or read`,
    );
  }
  return key;
}

export interface StoredTokenRow {
  access_token?: string | null;
  refresh_token?: string | null;
  access_token_encrypted?: string | null;
  refresh_token_encrypted?: string | null;
}

export interface QuickBooksTokens {
  accessToken: string | null;
  refreshToken: string | null;
}

/**
 * Prefer the ciphertext; fall back to plaintext only when no ciphertext exists
 * (a row the backfill has not reached yet). A ciphertext that fails to decrypt
 * throws: silently using the plaintext would hide a wrong key until release
 * N+1 removes the fallback and every integration breaks at once.
 */
export async function readQuickBooksTokens(row: StoredTokenRow, secret: string): Promise<QuickBooksTokens> {
  const pick = async (enc?: string | null, plain?: string | null) =>
    enc ? await decryptSecret(enc, secret) : (plain ?? null);
  return {
    accessToken: await pick(row.access_token_encrypted, row.access_token),
    refreshToken: await pick(row.refresh_token_encrypted, row.refresh_token),
  };
}

/** The column values to write for a fresh token pair (dual-write in release N). */
export async function tokenColumnsForWrite(
  tokens: { accessToken: string; refreshToken: string },
  secret: string,
): Promise<Record<string, string | null>> {
  const cols: Record<string, string | null> = {
    access_token_encrypted: await encryptSecret(tokens.accessToken, secret),
    refresh_token_encrypted: await encryptSecret(tokens.refreshToken, secret),
  };
  if (DUAL_WRITE_PLAINTEXT) {
    cols.access_token = tokens.accessToken;
    cols.refresh_token = tokens.refreshToken;
  }
  return cols;
}

/** Clears every token column (disconnect). */
export const CLEARED_TOKEN_COLUMNS = {
  access_token: null,
  refresh_token: null,
  access_token_encrypted: null,
  refresh_token_encrypted: null,
} as const;

/**
 * Load and decrypt the tokens for an integration row the caller has ALREADY
 * been authorised for (the row id came back from a user-JWT, RLS-scoped read).
 * Uses the service-role client because authenticated cannot SELECT the token
 * columns.
 */
export async function loadQuickBooksTokens(
  // deno-lint-ignore no-explicit-any
  serviceClient: any,
  integrationId: string,
  secret: string,
): Promise<QuickBooksTokens> {
  const { data, error } = await serviceClient
    .from('quickbooks_integrations')
    .select(QB_TOKEN_COLUMNS)
    .eq('id', integrationId)
    .single();
  if (error || !data) {
    throw new Error(`QuickBooks tokens could not be loaded: ${error?.message ?? 'row not found'}`);
  }
  return readQuickBooksTokens(data as StoredTokenRow, secret);
}
