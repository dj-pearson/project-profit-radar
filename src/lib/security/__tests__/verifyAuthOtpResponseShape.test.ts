/**
 * US-131: verify-auth-otp must never return raw access/refresh tokens
 *
 * Auth tokens in an edge-function JSON body can be captured by HTTP access logs
 * or misconfigured proxies. The magic_link flow must instead return only a
 * short-lived, single-use token hash; the client completes sign-in via
 * supabase.auth.verifyOtp({ token_hash, type: 'magiclink' }) so the bearer
 * tokens never transit our response. This test is a regression guard on the
 * edge-function source.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const EDGE_FN_PATH = resolve(
  process.cwd(),
  'supabase/functions/verify-auth-otp/index.ts'
);

describe('verify-auth-otp response shape (US-131)', () => {
  const source = readFileSync(EDGE_FN_PATH, 'utf8');

  it('does not place accessToken in any response body', () => {
    // Guards against `accessToken: ...` being added to an actionResult/response.
    expect(source).not.toMatch(/accessToken\s*:/);
  });

  it('does not place refreshToken in any response body', () => {
    expect(source).not.toMatch(/refreshToken\s*:/);
  });

  it('does not read raw access/refresh tokens off generateLink properties', () => {
    expect(source).not.toMatch(/properties\?\.\s*access_token/);
    expect(source).not.toMatch(/properties\?\.\s*refresh_token/);
  });

  it('returns the single-use magic-link token hash for the magic_link flow', () => {
    expect(source).toMatch(/tokenHash\s*:\s*linkData\.properties\?\.\s*hashed_token/);
  });
});
