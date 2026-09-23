/**
 * Canonical URL helpers (US-381).
 *
 * Google treats a relative <link rel="canonical"> as a hint at best, and the
 * prerendered HTML used to carry href="/pricing" verbatim. Every SEO component
 * routes its canonical through toCanonicalUrl so the emitted value is always
 * an absolute https://brikly.net URL, whatever the call site passes.
 */

import { SITE_URL } from '@/config/seoConfig';

/** The one canonical origin; defined in src/config/seoConfig.ts. */
export const SITE_ORIGIN = SITE_URL;

const ABSOLUTE_URL = /^[a-z][a-z0-9+.-]*:\/\//i;

/**
 * Resolve a canonical value against SITE_ORIGIN.
 *
 * - "/pricing" or "pricing" -> "https://brikly.net/pricing"
 * - "//brikly.net/x"        -> "https://brikly.net/x"
 * - "https://..."           -> returned unchanged
 * - empty/undefined         -> SITE_ORIGIN + fallbackPath (or the origin root)
 */
export function toCanonicalUrl(value?: string | null, fallbackPath?: string): string {
  const raw = (value ?? '').trim();
  if (!raw) {
    return fallbackPath !== undefined ? toCanonicalUrl(fallbackPath) : `${SITE_ORIGIN}/`;
  }
  if (ABSOLUTE_URL.test(raw)) return raw;
  if (raw.startsWith('//')) return `https:${raw}`;
  return `${SITE_ORIGIN}${raw.startsWith('/') ? raw : `/${raw}`}`;
}
