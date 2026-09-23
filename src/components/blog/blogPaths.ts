/**
 * One place that decides where a blog post lives, so cards, the post page's
 * canonical and the router can't drift apart again (US-383: cards opened
 * /blog/<slug> while only /resources/:slug was routed).
 *
 * /resources/:slug is canonical because the prerender, sitemap and existing
 * inbound links already use it. /blog/:slug is routed as an alias to the same
 * page, which points its canonical back here.
 */
export const BLOG_POST_CANONICAL_PREFIX = '/resources';
export const BLOG_POST_ALIAS_PREFIX = '/blog';

export const blogPostPath = (slug: string): string =>
  `${BLOG_POST_CANONICAL_PREFIX}/${encodeURIComponent(slug)}`;
