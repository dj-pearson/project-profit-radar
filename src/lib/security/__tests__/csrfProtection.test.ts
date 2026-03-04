import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateCsrfToken,
  validateCsrfToken,
  getCsrfToken,
  storeCsrfToken,
  CSRF_STORAGE_KEY,
} from '../csrfProtection';

describe('Security / CSRF Protection', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  describe('generateCsrfToken()', () => {
    it('should return a 64-character hex string (32 bytes)', () => {
      const token = generateCsrfToken();
      expect(token).toHaveLength(64);
      expect(token).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should generate unique tokens on each call', () => {
      const tokens = new Set<string>();
      for (let i = 0; i < 100; i++) {
        tokens.add(generateCsrfToken());
      }
      // All 100 tokens should be unique
      expect(tokens.size).toBe(100);
    });

    it('should only contain lowercase hex characters', () => {
      const token = generateCsrfToken();
      expect(token).toMatch(/^[0-9a-f]+$/);
      expect(token).not.toMatch(/[A-F]/);
    });
  });

  describe('validateCsrfToken()', () => {
    it('should return true for matching tokens', () => {
      const token = generateCsrfToken();
      expect(validateCsrfToken(token, token)).toBe(true);
    });

    it('should return false for different tokens', () => {
      const token1 = generateCsrfToken();
      const token2 = generateCsrfToken();
      expect(validateCsrfToken(token1, token2)).toBe(false);
    });

    it('should return false when tokens differ by one character', () => {
      const token = generateCsrfToken();
      // Flip the last character
      const lastChar = token[token.length - 1];
      const flipped = lastChar === '0' ? '1' : '0';
      const tampered = token.slice(0, -1) + flipped;
      expect(validateCsrfToken(token, tampered)).toBe(false);
    });

    it('should return false for different lengths', () => {
      const token = generateCsrfToken();
      expect(validateCsrfToken(token, token.slice(0, -1))).toBe(false);
      expect(validateCsrfToken(token, token + 'a')).toBe(false);
    });

    it('should return false for empty strings', () => {
      expect(validateCsrfToken('', '')).toBe(false);
      expect(validateCsrfToken('abc', '')).toBe(false);
      expect(validateCsrfToken('', 'abc')).toBe(false);
    });

    it('should return false for non-string inputs', () => {
      // @ts-expect-error testing invalid inputs
      expect(validateCsrfToken(null, 'abc')).toBe(false);
      // @ts-expect-error testing invalid inputs
      expect(validateCsrfToken('abc', undefined)).toBe(false);
      // @ts-expect-error testing invalid inputs
      expect(validateCsrfToken(123, 456)).toBe(false);
    });

    it('should use constant-time comparison (no early exit on mismatch)', () => {
      const token = generateCsrfToken();

      // Create tokens that differ at the first character vs last character.
      // Both should take roughly the same time (we can't precisely measure
      // this in a unit test, but we verify the function still returns
      // correct results for both cases).
      const differAtStart = 'x' + token.slice(1);
      const differAtEnd = token.slice(0, -1) + (token[token.length - 1] === '0' ? '1' : '0');

      expect(validateCsrfToken(token, differAtStart)).toBe(false);
      expect(validateCsrfToken(token, differAtEnd)).toBe(false);

      // Timing-safe verification: run many iterations and check that the
      // ratio of execution times is roughly 1:1 (within reasonable bounds).
      // This is a statistical sanity check, not a precise timing test.
      const iterations = 1000;

      const startEarly = performance.now();
      for (let i = 0; i < iterations; i++) {
        validateCsrfToken(token, differAtStart);
      }
      const timeEarly = performance.now() - startEarly;

      const startLate = performance.now();
      for (let i = 0; i < iterations; i++) {
        validateCsrfToken(token, differAtEnd);
      }
      const timeLate = performance.now() - startLate;

      // The ratio should be close to 1.0. We allow a generous 5x margin
      // because JS timing is imprecise, but a non-constant-time comparison
      // would show a much larger ratio for differAtEnd.
      const ratio = Math.max(timeEarly, timeLate) / Math.min(timeEarly, timeLate);
      expect(ratio).toBeLessThan(5);
    });
  });

  describe('getCsrfToken()', () => {
    it('should return null when no token is stored', () => {
      expect(getCsrfToken()).toBeNull();
    });

    it('should return the stored token', () => {
      const token = generateCsrfToken();
      sessionStorage.setItem(CSRF_STORAGE_KEY, token);
      expect(getCsrfToken()).toBe(token);
    });
  });

  describe('storeCsrfToken()', () => {
    it('should store a token in sessionStorage', () => {
      const token = generateCsrfToken();
      storeCsrfToken(token);
      expect(sessionStorage.getItem(CSRF_STORAGE_KEY)).toBe(token);
    });

    it('should overwrite an existing token', () => {
      const token1 = generateCsrfToken();
      const token2 = generateCsrfToken();
      storeCsrfToken(token1);
      storeCsrfToken(token2);
      expect(sessionStorage.getItem(CSRF_STORAGE_KEY)).toBe(token2);
    });
  });
});
