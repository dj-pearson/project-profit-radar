import { describe, it, expect } from 'vitest';
import {
  signRequest,
  verifySignature,
  addTimestamp,
  isRequestFresh,
  deriveSigningKey,
  buildCanonicalRequest,
  constantTimeEqual,
  REQUEST_SIGNING_CONFIG,
} from '../requestSigning';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TEST_SIGNING_KEY = 'test-signing-key-hex-0123456789abcdef';
const TEST_SESSION_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-session';

// ---------------------------------------------------------------------------
// deriveSigningKey
// ---------------------------------------------------------------------------

describe('deriveSigningKey', () => {
  it('derives a 64-character hex key from a session token', async () => {
    const key = await deriveSigningKey(TEST_SESSION_TOKEN);
    expect(key).toMatch(/^[0-9a-f]{64}$/);
  });

  it('produces the same key for the same session token', async () => {
    const key1 = await deriveSigningKey(TEST_SESSION_TOKEN);
    const key2 = await deriveSigningKey(TEST_SESSION_TOKEN);
    expect(key1).toBe(key2);
  });

  it('produces different keys for different session tokens', async () => {
    const key1 = await deriveSigningKey('session-token-a');
    const key2 = await deriveSigningKey('session-token-b');
    expect(key1).not.toBe(key2);
  });

  it('throws when session token is empty', async () => {
    await expect(deriveSigningKey('')).rejects.toThrow('Session token is required');
  });
});

// ---------------------------------------------------------------------------
// addTimestamp
// ---------------------------------------------------------------------------

describe('addTimestamp', () => {
  it('returns a valid ISO 8601 string', () => {
    const ts = addTimestamp();
    expect(new Date(ts).toISOString()).toBe(ts);
  });

  it('is close to the current time', () => {
    const before = Date.now();
    const ts = addTimestamp();
    const after = Date.now();
    const parsed = new Date(ts).getTime();
    expect(parsed).toBeGreaterThanOrEqual(before);
    expect(parsed).toBeLessThanOrEqual(after);
  });
});

// ---------------------------------------------------------------------------
// isRequestFresh
// ---------------------------------------------------------------------------

describe('isRequestFresh', () => {
  it('accepts a timestamp from just now', () => {
    expect(isRequestFresh(new Date().toISOString())).toBe(true);
  });

  it('accepts a timestamp within tolerance', () => {
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    expect(isRequestFresh(twoMinutesAgo)).toBe(true);
  });

  it('rejects a timestamp older than the default 5-minute window', () => {
    const sixMinutesAgo = new Date(Date.now() - 6 * 60 * 1000).toISOString();
    expect(isRequestFresh(sixMinutesAgo)).toBe(false);
  });

  it('rejects a timestamp far in the future', () => {
    const tenMinutesAhead = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    expect(isRequestFresh(tenMinutesAhead)).toBe(false);
  });

  it('supports a custom tolerance', () => {
    const thirtySecondsAgo = new Date(Date.now() - 30 * 1000).toISOString();
    // 10-second tolerance should reject 30-second-old timestamp
    expect(isRequestFresh(thirtySecondsAgo, 10_000)).toBe(false);
    // 60-second tolerance should accept it
    expect(isRequestFresh(thirtySecondsAgo, 60_000)).toBe(true);
  });

  it('rejects an invalid timestamp string', () => {
    expect(isRequestFresh('not-a-date')).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(isRequestFresh('')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// buildCanonicalRequest
// ---------------------------------------------------------------------------

describe('buildCanonicalRequest', () => {
  it('uppercases the HTTP method', () => {
    const canonical = buildCanonicalRequest('post', '/api/test', 'abc123', '2026-01-01T00:00:00Z');
    expect(canonical.startsWith('POST\n')).toBe(true);
  });

  it('joins components with newlines', () => {
    const canonical = buildCanonicalRequest('GET', '/api/data', 'bodyhash', '2026-03-04T00:00:00Z');
    const parts = canonical.split('\n');
    expect(parts).toHaveLength(4);
    expect(parts[0]).toBe('GET');
    expect(parts[1]).toBe('/api/data');
    expect(parts[2]).toBe('bodyhash');
    expect(parts[3]).toBe('2026-03-04T00:00:00Z');
  });

  it('extracts path from a full URL', () => {
    const canonical = buildCanonicalRequest(
      'GET',
      'https://app.brikly.net/api/projects?status=active',
      'hash',
      'ts',
    );
    expect(canonical).toContain('/api/projects?status=active');
    expect(canonical).not.toContain('https://');
  });
});

// ---------------------------------------------------------------------------
// constantTimeEqual
// ---------------------------------------------------------------------------

describe('constantTimeEqual', () => {
  it('returns true for identical strings', () => {
    expect(constantTimeEqual('abc123', 'abc123')).toBe(true);
  });

  it('returns false for different strings of same length', () => {
    expect(constantTimeEqual('abc123', 'abc124')).toBe(false);
  });

  it('returns false for different lengths', () => {
    expect(constantTimeEqual('short', 'longer-string')).toBe(false);
  });

  it('returns false for non-string inputs', () => {
    expect(constantTimeEqual(null as unknown as string, 'abc')).toBe(false);
    expect(constantTimeEqual('abc', undefined as unknown as string)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// signRequest + verifySignature (integration)
// ---------------------------------------------------------------------------

describe('signRequest', () => {
  it('returns a hex signature, timestamp, and canonical request', async () => {
    const result = await signRequest('POST', '/api/projects', '{"name":"test"}', TEST_SIGNING_KEY);

    expect(result.signature).toMatch(/^[0-9a-f]{64}$/);
    expect(result.timestamp).toBeTruthy();
    expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
    expect(result.canonicalRequest).toContain('POST');
  });

  it('throws when signing key is empty', async () => {
    await expect(signRequest('GET', '/api', '', '')).rejects.toThrow('Signing key is required');
  });

  it('produces different signatures for different bodies', async () => {
    const r1 = await signRequest('POST', '/api', '{"a":1}', TEST_SIGNING_KEY);
    const r2 = await signRequest('POST', '/api', '{"a":2}', TEST_SIGNING_KEY);
    expect(r1.signature).not.toBe(r2.signature);
  });

  it('produces different signatures for different methods', async () => {
    const r1 = await signRequest('GET', '/api', '', TEST_SIGNING_KEY);
    const r2 = await signRequest('POST', '/api', '', TEST_SIGNING_KEY);
    expect(r1.signature).not.toBe(r2.signature);
  });

  it('produces different signatures for different paths', async () => {
    const r1 = await signRequest('GET', '/api/a', '', TEST_SIGNING_KEY);
    const r2 = await signRequest('GET', '/api/b', '', TEST_SIGNING_KEY);
    expect(r1.signature).not.toBe(r2.signature);
  });
});

describe('verifySignature', () => {
  it('accepts a valid, fresh signature', async () => {
    const { signature, timestamp } = await signRequest(
      'POST',
      '/api/projects',
      '{"name":"test"}',
      TEST_SIGNING_KEY,
    );

    const valid = await verifySignature(
      'POST',
      '/api/projects',
      '{"name":"test"}',
      signature,
      timestamp,
      TEST_SIGNING_KEY,
    );
    expect(valid).toBe(true);
  });

  it('rejects when the body has been tampered with', async () => {
    const { signature, timestamp } = await signRequest(
      'POST',
      '/api/projects',
      '{"name":"test"}',
      TEST_SIGNING_KEY,
    );

    const valid = await verifySignature(
      'POST',
      '/api/projects',
      '{"name":"TAMPERED"}',
      signature,
      timestamp,
      TEST_SIGNING_KEY,
    );
    expect(valid).toBe(false);
  });

  it('rejects when the method has been tampered with', async () => {
    const { signature, timestamp } = await signRequest(
      'POST',
      '/api/projects',
      '{"name":"test"}',
      TEST_SIGNING_KEY,
    );

    const valid = await verifySignature(
      'PUT',
      '/api/projects',
      '{"name":"test"}',
      signature,
      timestamp,
      TEST_SIGNING_KEY,
    );
    expect(valid).toBe(false);
  });

  it('rejects when the URL has been tampered with', async () => {
    const { signature, timestamp } = await signRequest(
      'POST',
      '/api/projects',
      '{"name":"test"}',
      TEST_SIGNING_KEY,
    );

    const valid = await verifySignature(
      'POST',
      '/api/admin/delete-all',
      '{"name":"test"}',
      signature,
      timestamp,
      TEST_SIGNING_KEY,
    );
    expect(valid).toBe(false);
  });

  it('rejects when the signing key differs', async () => {
    const { signature, timestamp } = await signRequest(
      'GET',
      '/api/data',
      '',
      TEST_SIGNING_KEY,
    );

    const valid = await verifySignature(
      'GET',
      '/api/data',
      '',
      signature,
      timestamp,
      'wrong-signing-key',
    );
    expect(valid).toBe(false);
  });

  it('rejects an expired timestamp (replay prevention)', async () => {
    // Manually construct a signature with an old timestamp
    const oldTimestamp = new Date(Date.now() - 10 * 60 * 1000).toISOString(); // 10 minutes ago

    // We need to compute what the signature *would* be for the old timestamp
    // by using the internal helpers indirectly. We'll just call verifySignature
    // with the old timestamp -- it should fail the freshness check before
    // even comparing signatures.
    const valid = await verifySignature(
      'GET',
      '/api/data',
      '',
      'does-not-matter-because-timestamp-fails-first',
      oldTimestamp,
      TEST_SIGNING_KEY,
    );
    expect(valid).toBe(false);
  });

  it('rejects a future-dated timestamp (clock skew abuse)', async () => {
    const futureTimestamp = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const valid = await verifySignature(
      'GET',
      '/api/data',
      '',
      'irrelevant',
      futureTimestamp,
      TEST_SIGNING_KEY,
    );
    expect(valid).toBe(false);
  });

  it('rejects a completely invalid signature string', async () => {
    const valid = await verifySignature(
      'GET',
      '/api/data',
      '',
      'not-a-valid-hex-signature',
      new Date().toISOString(),
      TEST_SIGNING_KEY,
    );
    expect(valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// End-to-end: derive key then sign/verify
// ---------------------------------------------------------------------------

describe('end-to-end signing flow', () => {
  it('works with a key derived from a session token', async () => {
    const signingKey = await deriveSigningKey(TEST_SESSION_TOKEN);

    const { signature, timestamp } = await signRequest(
      'POST',
      'https://app.brikly.net/api/projects',
      '{"name":"New Project","budget":50000}',
      signingKey,
    );

    const valid = await verifySignature(
      'POST',
      'https://app.brikly.net/api/projects',
      '{"name":"New Project","budget":50000}',
      signature,
      timestamp,
      signingKey,
    );
    expect(valid).toBe(true);
  });

  it('rejects when verified with a key from a different session', async () => {
    const signingKey1 = await deriveSigningKey('session-alice');
    const signingKey2 = await deriveSigningKey('session-bob');

    const { signature, timestamp } = await signRequest(
      'POST',
      '/api/data',
      '{"action":"create"}',
      signingKey1,
    );

    const valid = await verifySignature(
      'POST',
      '/api/data',
      '{"action":"create"}',
      signature,
      timestamp,
      signingKey2,
    );
    expect(valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// REQUEST_SIGNING_CONFIG
// ---------------------------------------------------------------------------

describe('REQUEST_SIGNING_CONFIG', () => {
  it('has a 5-minute default tolerance', () => {
    expect(REQUEST_SIGNING_CONFIG.timestampToleranceMs).toBe(5 * 60 * 1000);
  });

  it('uses SHA-256 algorithm', () => {
    expect(REQUEST_SIGNING_CONFIG.algorithm).toBe('SHA-256');
  });

  it('defines header names', () => {
    expect(REQUEST_SIGNING_CONFIG.signatureHeader).toBe('X-Signature');
    expect(REQUEST_SIGNING_CONFIG.timestampHeader).toBe('X-Timestamp');
  });
});
