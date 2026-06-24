/**
 * CSRF Token Protection - React Components & Hooks (US-003)
 *
 * Provides React integration for CSRF protection:
 * - useCsrfToken() hook for managing token lifecycle
 * - CsrfTokenField component for embedding tokens in forms
 */

import { useState, useEffect } from 'react';
import {
  generateCsrfToken,
  getCsrfToken,
  storeCsrfToken,
} from './csrfProtection';

/**
 * React hook that manages a CSRF token in sessionStorage.
 *
 * On mount, checks sessionStorage for an existing token. If none exists
 * (new session), generates a fresh token and stores it.
 *
 * @returns The current CSRF token string
 *
 * @example
 * ```tsx
 * function MyForm() {
 *   const csrfToken = useCsrfToken();
 *   return (
 *     <form>
 *       <CsrfTokenField />
 *       <button type="submit">Submit</button>
 *     </form>
 *   );
 * }
 * ```
 */
export function useCsrfToken(): string {
  const [token, setToken] = useState<string>(() => {
    const existing = getCsrfToken();
    if (existing) {
      return existing;
    }
    const newToken = generateCsrfToken();
    storeCsrfToken(newToken);
    return newToken;
  });

  useEffect(() => {
    // On mount, verify token is in sessionStorage (handles SSR hydration edge case)
    const stored = getCsrfToken();
    if (!stored) {
      const newToken = generateCsrfToken();
      storeCsrfToken(newToken);
      setToken(newToken);
    } else if (stored !== token) {
      setToken(stored);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return token;
}

/**
 * Hidden form field that embeds the current CSRF token.
 *
 * Renders an `<input type="hidden" name="csrf_token" />` element
 * with the session's CSRF token as its value.
 *
 * @example
 * ```tsx
 * <form onSubmit={handleSubmit}>
 *   <CsrfTokenField />
 *   <input name="email" type="email" />
 *   <button type="submit">Submit</button>
 * </form>
 * ```
 */
export function CsrfTokenField(): JSX.Element {
  const token = useCsrfToken();
  return <input type="hidden" name="csrf_token" value={token} />;
}
