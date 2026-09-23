/**
 * Pure helpers for scripts/prerender.mjs and scripts/prerender-check.mjs
 * (US-222). No browser, no filesystem: everything here takes strings and
 * returns data, so src/lib/seo/__tests__/prerender.test.ts can pin the rules
 * that decide what gets written to dist/ and what counts as a valid page.
 */

export const SITE_ORIGIN = 'https://brikly.net';

/** Written right after the doctype of every prerendered file. */
export const PRERENDER_MARKER_PREFIX = '<!-- prerendered:';

/** Routes whose built HTML must pass validateRenderedHtml() after a prerender. */
export const REQUIRED_ROUTES = ['/', '/pricing'];

/**
 * Path prefixes that must never be prerendered even if they leak into the
 * sitemap. These are the authenticated app surfaces and auth flows; a baked
 * copy would show a signed-out render (or a redirect target) to everyone.
 */
export const NEVER_PRERENDER_PREFIXES = [
  '/auth', '/login', '/signup', '/setup', '/onboarding', '/dashboard', '/admin',
  '/settings', '/projects', '/project', '/app', '/portal', '/client-portal',
  '/my-', '/account', '/billing', '/reports', '/team', '/crm', '/api',
  '/knowledge-base', '/support',
];

export function isPrerenderable(route) {
  if (typeof route !== 'string' || !route.startsWith('/')) return false;
  if (route.includes(':') || route.includes('*') || route.includes('..')) return false;
  return !NEVER_PRERENDER_PREFIXES.some((p) =>
    p.endsWith('-') ? route.startsWith(p) : route === p || route.startsWith(p + '/'));
}

/** Pathnames from a sitemap.xml body, normalised without a trailing slash. */
export function routesFromSitemap(xml) {
  const out = new Set();
  for (const m of String(xml).matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)) {
    let p;
    try {
      p = new URL(m[1]).pathname;
    } catch {
      p = m[1];
    }
    p = p.replace(/\/+$/, '') || '/';
    out.add(p);
  }
  return [...out];
}

/**
 * dist-relative output file for a route. `/pricing` -> `pricing.html`, not
 * `pricing/index.html`: Cloudflare Pages serves `/pricing` straight from
 * `pricing.html`, whereas a `pricing/index.html` makes it 308-redirect
 * `/pricing` to `/pricing/`, which then disagrees with the canonical URL
 * (`https://brikly.net/pricing`, no slash) that every page declares.
 */
export function outputFileFor(route) {
  if (route === '/') return 'index.html';
  return route.replace(/^\/+/, '').replace(/\/+$/, '') + '.html';
}

function attr(tag, name) {
  const m = tag.match(new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i'));
  return m ? (m[2] ?? m[3]) : null;
}

function decodeEntities(s) {
  return s
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}

/** Pull the SEO-relevant bits out of an HTML document with plain regexes. */
export function inspectHtml(html) {
  const head = String(html);
  const tags = (re) => [...head.matchAll(re)].map((m) => m[0]);
  const metas = tags(/<meta\b[^>]*>/gi);
  const links = tags(/<link\b[^>]*>/gi);
  const metaBy = (key, value) => metas.filter((t) => (attr(t, key) || '').toLowerCase() === value);
  const content = (arr) => (arr.length ? decodeEntities(attr(arr[arr.length - 1], 'content') || '') : null);
  const canonicals = links.filter((t) => (attr(t, 'rel') || '').toLowerCase() === 'canonical');
  const titleMatch = head.match(/<title\b[^>]*>([^<]*)<\/title>/i);
  const jsonLd = [...head.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
    .map((m) => m[1]);
  let jsonLdValid = 0;
  for (const body of jsonLd) {
    try { JSON.parse(body); jsonLdValid++; } catch { /* counted as invalid */ }
  }
  return {
    title: titleMatch ? decodeEntities(titleMatch[1]).trim() : null,
    description: content(metaBy('name', 'description')),
    canonicals: canonicals.map((t) => decodeEntities(attr(t, 'href') || '')),
    canonicalFromHelmet: canonicals.some((t) => /\sdata-rh\b/i.test(t)),
    ogTitle: content(metaBy('property', 'og:title')),
    ogDescription: content(metaBy('property', 'og:description')),
    ogUrl: content(metaBy('property', 'og:url')),
    ogImage: content(metaBy('property', 'og:image')),
    jsonLdCount: jsonLd.length,
    jsonLdValid,
    prerendered: head.includes(PRERENDER_MARKER_PREFIX),
    hasH1: /<h1\b/i.test(head),
    suspenseFallback: />Loading page\.\.\.</.test(head),
  };
}

function canonicalPath(href) {
  try {
    const u = new URL(href, SITE_ORIGIN);
    if (u.origin !== SITE_ORIGIN) return null;
    return u.pathname.replace(/\/+$/, '') || '/';
  } catch {
    return null;
  }
}

/**
 * Decide whether a rendered page is worth writing. Returns a list of problems;
 * empty means ship it. Each rule exists because the page would otherwise bake
 * in the wrong metadata:
 *  - final URL differs: the route redirected (auth gate, <Navigate>), so the
 *    HTML belongs to a different page.
 *  - title equals the shell title: the page's own SEO never applied.
 *  - no <h1>, or the Suspense fallback is still showing: only the shell
 *    rendered, so a crawler would index a spinner.
 *  - canonical missing, not set by Helmet, or pointing at another path: the
 *    404 page and auth redirects keep the shell's home canonical, which would
 *    turn the URL into a baked soft-404.
 */
export function validateRenderedHtml(route, html, { shellTitle, finalPath } = {}) {
  const info = inspectHtml(html);
  const problems = [];
  if (finalPath != null && (finalPath.replace(/\/+$/, '') || '/') !== route) {
    problems.push(`redirected to ${finalPath}`);
  }
  if (!info.title) problems.push('no <title>');
  else if (route !== '/' && shellTitle && info.title === shellTitle.trim()) {
    problems.push('title is still the shell default');
  }
  if (!info.description) problems.push('no meta description');
  if (info.canonicals.length !== 1) {
    problems.push(`expected 1 canonical, found ${info.canonicals.length}`);
  } else {
    const cp = canonicalPath(info.canonicals[0]);
    if (cp !== route) problems.push(`canonical ${info.canonicals[0]} does not match ${route}`);
  }
  if (!info.canonicalFromHelmet) problems.push('canonical is the static shell default, not the page\'s');
  if (!info.ogTitle) problems.push('no og:title');
  if (!info.ogUrl) problems.push('no og:url');
  if (!info.hasH1) problems.push('no <h1>: the page body never rendered');
  if (info.suspenseFallback) problems.push('still showing the "Loading page..." fallback');
  if (info.jsonLdValid === 0) problems.push('no parseable JSON-LD');
  if (info.jsonLdValid !== info.jsonLdCount) problems.push('unparseable JSON-LD block');
  return { ok: problems.length === 0, problems, info };
}

/** Sources and inline bodies of the shell's own <script> tags. */
export function shellScriptKeys(shellHtml) {
  const keys = [];
  for (const m of String(shellHtml).matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const src = attr(m[0].slice(0, m[0].indexOf('>') + 1), 'src');
    keys.push(src ? `src:${src}` : `inline:${m[2]}`);
  }
  return keys;
}
