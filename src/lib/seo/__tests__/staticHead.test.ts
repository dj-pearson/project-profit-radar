import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * index.html ships SEO tags for crawlers that do not run JS (nothing
 * prerenders the app). react-helmet-async renders the same tags again when a
 * route mounts, and it only REPLACES the static ones if they carry data-rh.
 * Without it, every page served two canonicals and two descriptions - the
 * homepage's and the route's - which tells Google to trust neither (US-399).
 */
const raw = readFileSync(resolve(__dirname, '../../../../index.html'), 'utf8');
/** Comments explain these tags and quote them, so strip them before scanning. */
const html = raw.replace(/<!--[\s\S]*?-->/g, '');

/** Tags react-helmet-async also renders, so the static copy must be adoptable. */
const MUST_BE_ADOPTED = [
  '<link rel="canonical"',
  '<meta name="description"',
  '<meta name="keywords"',
  '<meta name="author"',
  '<meta property="og:title"',
  '<meta property="og:description"',
  '<meta property="og:type"',
  '<meta property="og:url"',
  '<meta property="og:image"',
  '<meta name="twitter:card"',
  '<meta name="twitter:site"',
  '<meta name="twitter:title"',
  '<meta name="twitter:description"',
  '<meta name="twitter:image"',
];

/** The whole tag text, from its opening `<` to the closing `>`. */
function tagsStartingWith(prefix: string): string[] {
  const out: string[] = [];
  let from = 0;
  for (;;) {
    const start = html.indexOf(prefix, from);
    if (start === -1) return out;
    const end = html.indexOf('>', start);
    out.push(html.slice(start, end + 1));
    from = end + 1;
  }
}

describe('index.html static SEO head', () => {
  it.each(MUST_BE_ADOPTED)('%s carries data-rh so Helmet replaces it', (prefix) => {
    const tags = tagsStartingWith(prefix);
    expect(tags.length).toBeGreaterThan(0);
    for (const tag of tags) expect(tag).toContain('data-rh');
  });

  it('declares exactly one canonical, and in the sitemap\'s shape', () => {
    const canonicals = tagsStartingWith('<link rel="canonical"');
    expect(canonicals).toHaveLength(1);
    // generate-sitemap.js writes the homepage as https://brikly.net/ - a
    // canonical that disagrees with the sitemap is a second URL.
    expect(canonicals[0]).toContain('href="https://brikly.net/"');
  });

  it('leaves the viewport tag alone', () => {
    // Helmet's viewport is width=device-width,initial-scale=1 with no
    // viewport-fit=cover, so adopting this one would cost the iOS safe-area
    // insets. It is deliberately not in MUST_BE_ADOPTED.
    const viewport = tagsStartingWith('<meta name="viewport"');
    expect(viewport).toHaveLength(1);
    expect(viewport[0]).toContain('viewport-fit=cover');
    expect(viewport[0]).not.toContain('data-rh');
  });
});
