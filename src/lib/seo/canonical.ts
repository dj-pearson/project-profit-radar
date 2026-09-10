/**
 * One canonical URL shape for every page (US-399).
 *
 * Pages pass their canonical in three different forms - "/pricing",
 * "https://brikly.net/commercial-contractors", and nothing at all - and both
 * SEO components passed the value straight into `<link rel="canonical">`. A
 * relative canonical resolves against the current URL, so it does not break
 * outright, but `og:url` built the same way ships relative to Facebook and
 * LinkedIn, which do not resolve it. Worse, whatever the page declares has to
 * match the sitemap byte for byte or Google treats the two as different URLs:
 * the sitemap writes the homepage with a trailing slash and every other page
 * without one.
 *
 * These helpers put every form into that same shape.
 */

export const SITE_URL = 'https://brikly.net';

/**
 * Absolute, sitemap-shaped URL from whatever a page supplied.
 *
 * @param value    the page's canonicalUrl prop: absolute, root-relative, or absent
 * @param pathname the route's pathname, used when the page supplied nothing
 */
export function absoluteUrl(value: string | null | undefined, pathname: string): string {
  const raw = value && value.trim().length > 0 ? value.trim() : pathname || '/';

  if (/^https?:\/\//i.test(raw)) {
    try {
      return normalize(new URL(raw));
    } catch {
      // Not parseable as a URL despite the scheme; fall through to the site root.
      return `${SITE_URL}/`;
    }
  }

  return normalize(new URL(raw.startsWith('/') ? raw : `/${raw}`, `${SITE_URL}/`));
}

/**
 * Trailing slash on the root, none anywhere else - the shape
 * scripts/generate-sitemap.js writes. Query and hash are dropped: a canonical
 * that carries ?utm_source= splits the page's signals across every campaign
 * that ever linked to it.
 */
function normalize(url: URL): string {
  const path = url.pathname.replace(/\/+$/, '');
  return `${url.origin}${path === '' ? '/' : path}`;
}
