/**
 * US-384: the build-time RSS feed (scripts/generate-rss.js).
 */
import { describe, it, expect } from 'vitest';
import { buildRssXML, feedPosts, xmlEscape, fetchFeedPosts } from '../../../../scripts/generate-rss.js';
import { loadRouteTable } from '../../../../scripts/generate-sitemap.js';
import { blogPostPath } from '../blogPaths';

const now = new Date('2026-09-20T00:00:00Z');
const post = (over: Record<string, unknown>) => ({
  title: 'Post',
  slug: 'post',
  excerpt: 'Excerpt',
  seo_description: null,
  published_at: '2026-09-01T12:00:00Z',
  created_at: '2026-08-30T00:00:00Z',
  status: 'published',
  ...over,
});

const items = (xml: string) => [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => m[1]);
const tag = (item: string, name: string) => item.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`))?.[1];

describe('RSS feed builder', () => {
  it('escapes XML special characters in titles and descriptions', () => {
    const xml = buildRssXML(
      [post({ title: 'Bids & <Budgets> "quoted" it\'s', excerpt: 'a < b && c > d', slug: 'bids' })],
      { now },
    );
    const [item] = items(xml);
    expect(tag(item, 'title')).toBe('Bids &amp; &lt;Budgets&gt; &quot;quoted&quot; it&apos;s');
    expect(tag(item, 'description')).toBe('a &lt; b &amp;&amp; c &gt; d');
    expect(xml).not.toMatch(/<Budgets>/);
  });

  it('strips characters XML 1.0 cannot carry', () => {
    expect(xmlEscape('ok\u0000\u0008\u001Fdone\n')).toBe('okdone\n');
  });

  it('lists only published, already-live posts, newest first', () => {
    const xml = buildRssXML(
      [
        post({ slug: 'older', title: 'Older', published_at: '2026-08-01T00:00:00Z' }),
        post({ slug: 'draft', title: 'Draft', status: 'draft' }),
        post({ slug: 'scheduled', title: 'Scheduled', status: 'scheduled' }),
        post({ slug: 'future', title: 'Future', published_at: '2026-12-01T00:00:00Z' }),
        post({ slug: 'newer', title: 'Newer', published_at: '2026-09-10T00:00:00Z' }),
        post({ slug: '', title: 'No slug' }),
      ],
      { now },
    );
    expect(items(xml).map((i) => tag(i, 'title'))).toEqual(['Newer', 'Older']);
  });

  it('links each item to its canonical /resources/<slug> URL', () => {
    const template = loadRouteTable().templates.blog;
    expect(template).toBe('/resources/:slug');
    const xml = buildRssXML([post({ slug: 'crew scheduling&tips' })], { now, template });
    const [item] = items(xml);
    const expected = `https://brikly.net${blogPostPath('crew scheduling&tips')}`;
    expect(tag(item, 'link')).toBe(expected);
    expect(tag(item, 'guid')).toBe(expected);
    expect(item).toContain('<guid isPermaLink="true">');
  });

  it('uses RFC 822 dates and a lastBuildDate taken from the newest post', () => {
    const xml = buildRssXML([post({ published_at: '2026-09-01T12:00:00Z' })], { now });
    expect(xml).toContain('<pubDate>Tue, 01 Sep 2026 12:00:00 GMT</pubDate>');
    expect(xml).toContain('<lastBuildDate>Tue, 01 Sep 2026 12:00:00 GMT</lastBuildDate>');
  });

  it('falls back to seo_description and omits an empty description', () => {
    const [a, b] = items(
      buildRssXML(
        [
          post({ slug: 'a', title: 'A', excerpt: null, seo_description: 'From SEO', published_at: '2026-09-02T00:00:00Z' }),
          post({ slug: 'b', title: 'B', excerpt: null, seo_description: null }),
        ],
        { now },
      ),
    );
    expect(tag(a, 'description')).toBe('From SEO');
    expect(b).not.toContain('<description>');
  });

  it('writes a valid channel with a self link and no items when there are no posts', () => {
    const xml = buildRssXML([], { now });
    expect(xml).toMatch(/^<\?xml version="1.0" encoding="UTF-8"\?>/);
    expect(xml).toContain('<atom:link href="https://brikly.net/feed.xml" rel="self" type="application/rss+xml" />');
    expect(xml).not.toContain('<item>');
    expect(xml).not.toContain('lastBuildDate');
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    expect(doc.getElementsByTagName('parsererror')).toHaveLength(0);
  });

  it('parses as XML with hostile content', () => {
    const xml = buildRssXML([post({ title: '</title><script>x</script>', excerpt: ']]> & <![CDATA[' })], { now });
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    expect(doc.getElementsByTagName('parsererror')).toHaveLength(0);
    expect(doc.getElementsByTagName('item')).toHaveLength(1);
  });

  it('caps the feed length', () => {
    const many = Array.from({ length: 80 }, (_, i) =>
      post({ slug: `p${i}`, published_at: new Date(Date.UTC(2026, 0, 1 + i)).toISOString() }),
    );
    expect(feedPosts(many, { now })).toHaveLength(50);
  });

  it('asks Supabase for published posts only, with the anon key', async () => {
    let calledUrl = '';
    let headers: Record<string, string> = {};
    const fakeFetch = async (url: string, init: { headers: Record<string, string> }) => {
      calledUrl = url;
      headers = init.headers;
      return { ok: true, json: async () => [] } as unknown as Response;
    };
    await fetchFeedPosts({ SUPABASE_URL: 'https://db.example/', SUPABASE_ANON_KEY: 'anon' }, fakeFetch);
    expect(calledUrl).toMatch(/^https:\/\/db\.example\/rest\/v1\/blog_posts\?/);
    expect(calledUrl).toContain('status=eq.published');
    expect(headers.apikey).toBe('anon');
    await expect(fetchFeedPosts({}, fakeFetch)).rejects.toThrow(/anon key/);
  });
});
