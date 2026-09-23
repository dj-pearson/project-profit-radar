/**
 * Build-time RSS feed for the blog (US-384).
 *
 * Reads published blog_posts from Supabase REST with the anon key, the same
 * way scripts/generate-sitemap.js does, and writes public/feed.xml plus an
 * identical public/rss.xml (both paths are common guesses for feed readers).
 * Post links use the blog route template from the route table, so the feed
 * and the sitemap can't disagree about where a post lives.
 *
 * If Supabase can't be reached the build still succeeds: an existing feed is
 * left alone, otherwise a valid feed with no items is written. Set
 * RSS_REQUIRE_DB=1 (or SITEMAP_REQUIRE_DB=1) to make that fatal.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DOMAIN, blogPath, loadRouteTable } from './generate-sitemap.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const FEED_FILES = ['feed.xml', 'rss.xml'];
export const FEED_PATH = '/feed.xml';
export const MAX_ITEMS = 50;
const DEFAULT_TEMPLATE = '/resources/:slug';

/** Characters XML 1.0 forbids outright; escaping can't save them. */
const INVALID_XML_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g;

export function xmlEscape(value) {
  return String(value ?? '')
    .replace(INVALID_XML_CHARS, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** RFC 822 date, which RSS 2.0 requires. null for a missing/bad date. */
export function rfc822(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toUTCString();
}

/**
 * Published, live, with a slug, newest first, capped at `limit`. The REST
 * query already filters on status; this is the same rule applied again so a
 * draft or a future-dated post can't reach the feed through a query change.
 */
export function feedPosts(posts, { now = new Date(), limit = MAX_ITEMS } = {}) {
  const when = (p) => new Date(p.published_at || p.created_at || 0).getTime();
  return posts
    .filter((p) => p && p.status === 'published' && p.slug && p.title)
    .filter((p) => !p.published_at || new Date(p.published_at).getTime() <= now.getTime())
    .sort((a, b) => when(b) - when(a))
    .slice(0, limit);
}

/**
 * posts: blog_posts rows (title, slug, excerpt, seo_description,
 * published_at, created_at, status). template: '/resources/:slug'.
 */
export function buildRssXML(posts, { template = DEFAULT_TEMPLATE, now = new Date(), limit = MAX_ITEMS } = {}) {
  const items = feedPosts(posts, { now, limit });
  const itemXml = items
    .map((p) => {
      const link = DOMAIN + blogPath(template, p.slug);
      const description = p.excerpt || p.seo_description || '';
      const pubDate = rfc822(p.published_at || p.created_at);
      return [
        '    <item>',
        `      <title>${xmlEscape(p.title)}</title>`,
        `      <link>${xmlEscape(link)}</link>`,
        `      <guid isPermaLink="true">${xmlEscape(link)}</guid>`,
        description ? `      <description>${xmlEscape(description)}</description>` : null,
        pubDate ? `      <pubDate>${pubDate}</pubDate>` : null,
        '    </item>',
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n');

  // Newest post date, not the build time: an unchanged feed stays byte-identical.
  const lastBuild = items.length ? rfc822(items[0].published_at || items[0].created_at) : null;

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Brikly Resources</title>
    <link>${DOMAIN}/resources</link>
    <description>Construction management guides and articles for small contractors from Brikly.</description>
    <language>en-us</language>
    <atom:link href="${DOMAIN}${FEED_PATH}" rel="self" type="application/rss+xml" />${lastBuild ? `\n    <lastBuildDate>${lastBuild}</lastBuildDate>` : ''}
${itemXml ? `${itemXml}\n` : ''}  </channel>
</rss>
`;
}

function loadDotEnv() {
  for (const f of ['.env', '.env.local']) {
    const p = path.join(ROOT, f);
    if (!fs.existsSync(p) || typeof process.loadEnvFile !== 'function') continue;
    try {
      process.loadEnvFile(p);
    } catch {
      // Unparseable .env: fall through to whatever the environment has.
    }
  }
}

export async function fetchFeedPosts(env = process.env, fetchImpl = fetch) {
  const url = (env.SUPABASE_URL || env.VITE_SUPABASE_URL || 'https://api.brikly.net').replace(/\/$/, '');
  const key = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY;
  if (!key) throw new Error('no Supabase anon key (SUPABASE_ANON_KEY or VITE_SUPABASE_PUBLISHABLE_KEY)');
  const query =
    'select=title,slug,excerpt,seo_description,published_at,created_at,status' +
    `&status=eq.published&order=published_at.desc.nullslast&limit=${MAX_ITEMS * 2}`;
  const res = await fetchImpl(`${url}/rest/v1/blog_posts?${query}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`blog_posts: HTTP ${res.status}`);
  return res.json();
}

async function main() {
  loadDotEnv();
  const template = loadRouteTable().templates.blog || DEFAULT_TEMPLATE;
  const publicDir = path.join(ROOT, 'public');
  fs.mkdirSync(publicDir, { recursive: true });

  let posts;
  try {
    posts = await fetchFeedPosts();
  } catch (err) {
    const msg = `[rss] Could not read blog_posts from Supabase: ${err.message}.`;
    if (process.env.RSS_REQUIRE_DB === '1' || process.env.SITEMAP_REQUIRE_DB === '1') {
      console.error(msg);
      process.exit(1);
    }
    const existing = FEED_FILES.every((f) => fs.existsSync(path.join(publicDir, f)));
    console.warn(`\n*** ${msg} ${existing ? 'Keeping the existing feed.' : 'Writing an empty feed.'}\n`);
    if (existing) return;
    posts = [];
  }

  const xml = buildRssXML(posts, { template });
  for (const f of FEED_FILES) fs.writeFileSync(path.join(publicDir, f), xml, 'utf8');
  const count = (xml.match(/<item>/g) || []).length;
  console.log(`[rss] ${count} posts -> ${FEED_FILES.map((f) => `public/${f}`).join(', ')}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
