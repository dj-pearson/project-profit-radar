import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  initTrustedTypes,
  createSafeHtml,
  createSafeScriptUrl,
  isTrustedTypesSupported,
  ALLOWED_SCRIPT_ORIGINS,
  _resetPolicyForTesting,
} from '../trustedTypes';

/**
 * Helper: install a mock `window.trustedTypes` and return the mock so tests
 * can inspect calls and configure return values.
 */
function installTrustedTypesMock() {
  const mockPolicy = {
    createHTML: vi.fn((input: string) => `trusted:${input}`),
    createScriptURL: vi.fn((input: string) => `trusted-url:${input}`),
  };

  const createPolicy = vi.fn(() => mockPolicy);

  // Attach to window — Happy DOM does not ship trustedTypes by default
  Object.defineProperty(window, 'trustedTypes', {
    value: { createPolicy },
    writable: true,
    configurable: true,
  });

  return { createPolicy, mockPolicy };
}

function removeTrustedTypesMock() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (window as any).trustedTypes;
}

describe('Security / Trusted Types (US-008)', () => {
  beforeEach(() => {
    _resetPolicyForTesting();
  });

  afterEach(() => {
    removeTrustedTypesMock();
    _resetPolicyForTesting();
  });

  // ---------- isTrustedTypesSupported ----------

  describe('isTrustedTypesSupported()', () => {
    it('returns false when trustedTypes is not on window', () => {
      removeTrustedTypesMock();
      expect(isTrustedTypesSupported()).toBe(false);
    });

    it('returns true when trustedTypes is available', () => {
      installTrustedTypesMock();
      expect(isTrustedTypesSupported()).toBe(true);
    });
  });

  // ---------- ALLOWED_SCRIPT_ORIGINS ----------

  describe('ALLOWED_SCRIPT_ORIGINS', () => {
    it('is a non-empty array of https origins', () => {
      expect(ALLOWED_SCRIPT_ORIGINS.length).toBeGreaterThan(0);
      for (const origin of ALLOWED_SCRIPT_ORIGINS) {
        expect(origin).toMatch(/^https:\/\//);
      }
    });
  });

  // ---------- initTrustedTypes ----------

  describe('initTrustedTypes()', () => {
    it('returns null when Trusted Types are not supported', () => {
      removeTrustedTypesMock();
      expect(initTrustedTypes()).toBeNull();
    });

    it('creates a policy named "brikly" when supported', () => {
      const { createPolicy } = installTrustedTypesMock();
      const result = initTrustedTypes();

      expect(result).not.toBeNull();
      expect(createPolicy).toHaveBeenCalledTimes(1);
      expect(createPolicy).toHaveBeenCalledWith(
        'brikly',
        expect.objectContaining({
          createHTML: expect.any(Function),
          createScriptURL: expect.any(Function),
        })
      );
    });

    it('only creates the policy once on repeated calls', () => {
      const { createPolicy } = installTrustedTypesMock();

      initTrustedTypes();
      initTrustedTypes();
      initTrustedTypes();

      expect(createPolicy).toHaveBeenCalledTimes(1);
    });

    it('createHTML handler sanitizes via DOMPurify', () => {
      const { createPolicy } = installTrustedTypesMock();
      initTrustedTypes();

      // Grab the actual handler that was passed to createPolicy
      const policyHandlers = createPolicy.mock.calls[0][1];
      const result = policyHandlers.createHTML(
        '<p>Safe</p><script>alert("xss")</script>'
      );

      // DOMPurify should strip the script tag
      expect(result).toContain('<p>Safe</p>');
      expect(result).not.toContain('<script>');
    });

    it('createScriptURL handler allows permitted origins', () => {
      const { createPolicy } = installTrustedTypesMock();
      initTrustedTypes();

      const policyHandlers = createPolicy.mock.calls[0][1];

      // Should not throw for an allowed origin
      const url = 'https://js.stripe.com/v3/stripe.js';
      expect(policyHandlers.createScriptURL(url)).toBe(url);
    });

    it('createScriptURL handler rejects disallowed origins', () => {
      const { createPolicy } = installTrustedTypesMock();
      initTrustedTypes();

      const policyHandlers = createPolicy.mock.calls[0][1];

      expect(() =>
        policyHandlers.createScriptURL('https://evil.example.com/hack.js')
      ).toThrow(/disallowed origin/i);
    });

    it('createScriptURL handler rejects invalid URLs', () => {
      const { createPolicy } = installTrustedTypesMock();
      initTrustedTypes();

      const policyHandlers = createPolicy.mock.calls[0][1];

      expect(() =>
        policyHandlers.createScriptURL('not-a-url')
      ).toThrow(/disallowed origin/i);
    });
  });

  // ---------- createSafeHtml ----------

  describe('createSafeHtml()', () => {
    it('delegates to the policy when Trusted Types are supported', () => {
      const { mockPolicy } = installTrustedTypesMock();
      initTrustedTypes();

      const result = createSafeHtml('<b>Hello</b>');

      expect(mockPolicy.createHTML).toHaveBeenCalledWith('<b>Hello</b>');
      expect(result).toBe('trusted:<b>Hello</b>');
    });

    it('falls back to DOMPurify string when Trusted Types are unsupported', () => {
      removeTrustedTypesMock();

      const result = createSafeHtml(
        '<p>Safe</p><script>alert("xss")</script>'
      );

      expect(typeof result).toBe('string');
      expect(result).toContain('Safe');
      expect(String(result)).not.toContain('<script>');
    });

    it('handles empty string input', () => {
      removeTrustedTypesMock();
      const result = createSafeHtml('');
      expect(String(result)).toBe('');
    });
  });

  // ---------- createSafeScriptUrl ----------

  describe('createSafeScriptUrl()', () => {
    it('delegates to the policy for allowed URLs', () => {
      const { mockPolicy } = installTrustedTypesMock();
      initTrustedTypes();

      const url = 'https://js.stripe.com/v3/stripe.js';
      const result = createSafeScriptUrl(url);

      expect(mockPolicy.createScriptURL).toHaveBeenCalledWith(url);
      expect(result).toBe(`trusted-url:${url}`);
    });

    it('throws for disallowed origins even with Trusted Types', () => {
      installTrustedTypesMock();
      initTrustedTypes();

      expect(() =>
        createSafeScriptUrl('https://evil.example.com/hack.js')
      ).toThrow(/disallowed origin/i);
    });

    it('throws for disallowed origins without Trusted Types', () => {
      removeTrustedTypesMock();

      expect(() =>
        createSafeScriptUrl('https://evil.example.com/hack.js')
      ).toThrow(/disallowed origin/i);
    });

    it('returns plain string for allowed URLs without Trusted Types', () => {
      removeTrustedTypesMock();

      const url = 'https://js.stripe.com/v3/stripe.js';
      const result = createSafeScriptUrl(url);

      expect(result).toBe(url);
    });

    it('throws for invalid URL strings', () => {
      removeTrustedTypesMock();

      expect(() => createSafeScriptUrl('not-a-url')).toThrow(
        /disallowed origin/i
      );
    });

    it('validates each ALLOWED_SCRIPT_ORIGINS entry succeeds', () => {
      removeTrustedTypesMock();

      for (const origin of ALLOWED_SCRIPT_ORIGINS) {
        const url = `${origin}/some-script.js`;
        expect(() => createSafeScriptUrl(url)).not.toThrow();
      }
    });
  });
});
