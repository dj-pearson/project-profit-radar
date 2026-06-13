import { logger } from '@/lib/logger';
/**
 * CSRF Token Protection Utilities (US-003)
 *
 * Provides Cross-Site Request Forgery protection through:
 * - Cryptographically secure token generation
 * - Constant-time token comparison (prevents timing attacks)
 * - Session-scoped token storage
 *
 * SECURITY NOTES:
 * - Tokens are 32-byte (64-character hex) random values
 * - Validation uses constant-time comparison to prevent timing side-channels
 * - Tokens are stored in sessionStorage (cleared when tab/browser closes)
 * - Each browser session gets a unique token
 */

const CSRF_STORAGE_KEY = 'csrf-token';
const TOKEN_BYTE_LENGTH = 32;

/**
 * Generate a cryptographically secure CSRF token.
 * Produces a 32-byte (64-character) random hex string using the Web Crypto API.
 */
export function generateCsrfToken(): string {
  const bytes = new Uint8Array(TOKEN_BYTE_LENGTH);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Validate a CSRF token using constant-time comparison.
 *
 * This prevents timing attacks where an attacker could measure response times
 * to deduce the correct token character-by-character.
 *
 * @param expected - The server/session-stored token
 * @param actual - The token submitted with the request
 * @returns true if tokens match, false otherwise
 */
export function validateCsrfToken(expected: string, actual: string): boolean {
  if (typeof expected !== 'string' || typeof actual !== 'string') {
    return false;
  }

  if (expected.length === 0 || actual.length === 0) {
    return false;
  }

  // Constant-time comparison: always compare the full length to avoid
  // leaking information about which character position differs.
  // We compare against the expected token length to avoid leaking its length
  // through early termination, but we still reject length mismatches.
  if (expected.length !== actual.length) {
    return false;
  }

  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ actual.charCodeAt(i);
  }

  return mismatch === 0;
}

/**
 * Retrieve the current CSRF token from sessionStorage.
 * Returns null if no token is stored (e.g., session not yet initialized).
 */
export function getCsrfToken(): string | null {
  try {
    return sessionStorage.getItem(CSRF_STORAGE_KEY);
  } catch {
    // sessionStorage may be unavailable (e.g., SSR, privacy mode in some browsers)
    logger.warn('[SECURITY] Unable to access sessionStorage for CSRF token');
    return null;
  }
}

/**
 * Store a CSRF token in sessionStorage.
 * @internal Used by the useCsrfToken hook; prefer the hook in React components.
 */
export function storeCsrfToken(token: string): void {
  try {
    sessionStorage.setItem(CSRF_STORAGE_KEY, token);
  } catch {
    logger.warn('[SECURITY] Unable to store CSRF token in sessionStorage');
  }
}

/**
 * The sessionStorage key used for CSRF tokens.
 * Exported for testing and advanced use cases.
 */
export { CSRF_STORAGE_KEY };
