import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  REQUIRED_ROUTES,
  isPrerenderable,
  outputFileFor,
  routesFromSitemap,
  shellScriptKeys,
  validateRenderedHtml,
} from '../../../../scripts/prerender-lib.mjs';

/**
 * US-222: scripts/prerender.mjs writes rendered HTML for public routes and
 * scripts/prerender-check.mjs guards / and /pricing in the built output.
 * These tests pin the rules both rely on, without a browser.
 */

const SHELL_TITLE = 'Brikly - Construction Management Software for Small Contractors';

function page(route: string, overrides: Partial<Record<string, string>> = {}) {
  const canonical = overrides.canonical ?? `https://brikly.net${route === '/' ? '' : route}`;
  const title = overrides.title ?? 'Brikly Pricing - Plans from $149/Month';
  const jsonLd = overrides.jsonLd ?? '{"@context":"https://schema.org","@type":"Product","name":"Brikly"}';
  const body = overrides.body ?? '<div id="root"><main><h1>Pricing</h1></main></div>';
  return `<!DOCTYPE html>
<!-- prerendered: ${route} -->
<html lang="en"><head>
<title>${title}</title>
<meta name="description" content="Plans from $149/month" data-rh="true">
<link rel="canonical" href="${canonical}"${overrides.canonicalAttrs ?? ' data-rh="true"'}>
<meta property="og:title" content="${title}" data-rh="true">
<meta property="og:url" content="${canonical}" data-rh="true">
<script type="application/ld+json" data-rh="true">${jsonLd}</script>
</head><body>${body}</body></html>`;
}

describe('prerender route selection', () => {
  it('reads pathnames from sitemap <loc> entries without trailing slashes', () => {
    const xml = `<urlset>
      <url><loc>https://brikly.net/</loc></url>
      <url><loc>https://brikly.net/pricing</loc></url>
      <url><loc>https://brikly.net/features/</loc></url>
      <url><loc>https://brikly.net/pricing</loc></url>
    </urlset>`;
    expect(routesFromSitemap(xml)).toEqual(['/', '/pricing', '/features']);
  });

  it('never prerenders authenticated or auth-flow paths', () => {
    for (const r of ['/dashboard', '/admin/users', '/auth', '/settings', '/projects/123',
      '/knowledge-base', '/support', '/my-tasks', '/project/:id']) {
      expect(isPrerenderable(r), r).toBe(false);
    }
    for (const r of ['/', '/pricing', '/features/job-costing', '/resources/some-guide',
      '/construction-project-management-software', '/support-plans-are-not-a-route-but-ok']) {
      expect(isPrerenderable(r), r).toBe(true);
    }
  });

  it('writes /route as route.html so Cloudflare Pages does not add a trailing slash', () => {
    expect(outputFileFor('/')).toBe('index.html');
    expect(outputFileFor('/pricing')).toBe('pricing.html');
    expect(outputFileFor('/features/job-costing')).toBe('features/job-costing.html');
  });
});

describe('validateRenderedHtml', () => {
  it('accepts a page with its own title, description, canonical, OpenGraph and JSON-LD', () => {
    const v = validateRenderedHtml('/pricing', page('/pricing'), { shellTitle: SHELL_TITLE, finalPath: '/pricing' });
    expect(v.problems).toEqual([]);
    expect(v.ok).toBe(true);
  });

  it('accepts the home page canonical without a trailing slash', () => {
    expect(validateRenderedHtml('/', page('/'), { shellTitle: SHELL_TITLE }).ok).toBe(true);
  });

  it('rejects a route that redirected (auth gate / Navigate)', () => {
    const v = validateRenderedHtml('/knowledge-base', page('/'), { finalPath: '/' });
    expect(v.ok).toBe(false);
    expect(v.problems.join()).toMatch(/redirected to \//);
  });

  it('rejects a soft-404: the shell title and the static home canonical', () => {
    const html = page('/blog/missing-post', {
      title: SHELL_TITLE, canonical: 'https://brikly.net', canonicalAttrs: '',
    });
    const v = validateRenderedHtml('/blog/missing-post', html, { shellTitle: SHELL_TITLE });
    expect(v.ok).toBe(false);
    expect(v.problems.join('|')).toMatch(/shell default/);
    expect(v.problems.join('|')).toMatch(/does not match/);
  });

  it('rejects an alias whose canonical points at another path', () => {
    const v = validateRenderedHtml('/old-slug', page('/old-slug', { canonical: 'https://brikly.net/new-slug' }));
    expect(v.ok).toBe(false);
  });

  it('rejects a page still showing the Suspense fallback', () => {
    const html = page('/pricing', { body: '<div id="root"><p>Loading page...</p></div>' });
    const v = validateRenderedHtml('/pricing', html, { shellTitle: SHELL_TITLE });
    expect(v.problems.join('|')).toMatch(/h1/);
    expect(v.problems.join('|')).toMatch(/Loading page/);
  });

  it('rejects missing or broken JSON-LD', () => {
    expect(validateRenderedHtml('/pricing', page('/pricing', { jsonLd: '{not json' })).ok).toBe(false);
  });

  it('guards the routes the story names', () => {
    expect(REQUIRED_ROUTES).toEqual(['/', '/pricing']);
  });
});

describe('prerender shell handling', () => {
  it('keys shell scripts by src or inline body', () => {
    const keys = shellScriptKeys('<script>window.a=1</script><script type="module" crossorigin src="/assets/index.js"></script>');
    expect(keys).toEqual(['inline:window.a=1', 'src:/assets/index.js']);
  });

  it('never rewrites app routes to index.html, which holds the prerendered home page', () => {
    const redirects = fs.readFileSync(path.resolve(__dirname, '../../../../public/_redirects'), 'utf8');
    const rules = redirects.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
    expect(rules.some((r) => /^\/\*\s+\/index\.html\s+200$/.test(r))).toBe(false);
    expect(rules).toContain('/* /404.html 200');
  });
});
