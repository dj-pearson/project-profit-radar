import DOMPurify from 'dompurify';

/**
 * Trusted Types policy for DOM XSS prevention (US-008)
 *
 * Trusted Types is a browser API that locks down dangerous DOM sink functions
 * (innerHTML, document.write, etc.) so they only accept typed objects instead
 * of raw strings. This module creates a 'builddesk' policy that sanitizes
 * HTML through DOMPurify and validates script URLs against an allowlist.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Trusted_Types_API
 */

/** Origins permitted to load scripts from */
export const ALLOWED_SCRIPT_ORIGINS: readonly string[] = [
  'https://cdn.builddesk.com',
  'https://js.stripe.com',
  'https://www.googletagmanager.com',
  'https://cdn.jsdelivr.net',
  'https://unpkg.com',
] as const;

/** The name used when creating the Trusted Types policy */
const POLICY_NAME = 'builddesk';

/**
 * Cached reference to the created policy so we only create it once.
 * The type is intentionally `any` because the TrustedTypePolicy interface
 * is not available in all TypeScript environments.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let policy: any = null;

/**
 * Detect whether the current environment supports the Trusted Types API.
 */
export function isTrustedTypesSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.trustedTypes !== 'undefined'
  );
}

/**
 * Validate that a script URL belongs to one of the allowed origins.
 * Returns the URL string if valid, throws otherwise.
 */
function validateScriptUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const origin = parsed.origin;

    if (ALLOWED_SCRIPT_ORIGINS.includes(origin)) {
      return url;
    }
  } catch {
    // invalid URL — fall through to throw
  }

  throw new Error(
    `Trusted Types: Blocked script URL from disallowed origin: ${url}`
  );
}

/**
 * Initialise the 'builddesk' Trusted Types policy.
 *
 * - `createHTML` passes input through DOMPurify.
 * - `createScriptURL` validates the URL against ALLOWED_SCRIPT_ORIGINS.
 *
 * Safe to call multiple times — subsequent calls return the cached policy.
 *
 * @returns The TrustedTypePolicy object, or `null` when Trusted Types are
 *          not supported in the current environment.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function initTrustedTypes(): any {
  if (policy) {
    return policy;
  }

  if (!isTrustedTypesSupported()) {
    return null;
  }

  policy = window.trustedTypes!.createPolicy(POLICY_NAME, {
    createHTML: (input: string) => DOMPurify.sanitize(input),
    createScriptURL: (input: string) => validateScriptUrl(input),
  });

  return policy;
}

/**
 * Create a safe HTML value suitable for use with DOM sinks like innerHTML.
 *
 * When Trusted Types are supported the returned value is a TrustedHTML
 * object created via the 'builddesk' policy (which runs DOMPurify).
 * In unsupported environments a plain DOMPurify-sanitized string is returned.
 */
export function createSafeHtml(input: string): TrustedHTML | string {
  const currentPolicy = policy ?? initTrustedTypes();

  if (currentPolicy) {
    return currentPolicy.createHTML(input);
  }

  // Fallback: sanitize with DOMPurify and return a plain string
  return DOMPurify.sanitize(input);
}

/**
 * Create a safe script URL suitable for use with DOM sinks like script.src.
 *
 * The URL is validated against ALLOWED_SCRIPT_ORIGINS. If the origin is not
 * allowed an error is thrown regardless of Trusted Types support.
 *
 * When Trusted Types are supported the returned value is a TrustedScriptURL.
 * Otherwise the validated URL string is returned directly.
 */
export function createSafeScriptUrl(url: string): TrustedScriptURL | string {
  // Always validate, even without Trusted Types support
  validateScriptUrl(url);

  const currentPolicy = policy ?? initTrustedTypes();

  if (currentPolicy) {
    return currentPolicy.createScriptURL(url);
  }

  return url;
}

/**
 * Reset the cached policy (for testing only).
 * @internal
 */
export function _resetPolicyForTesting(): void {
  policy = null;
}
