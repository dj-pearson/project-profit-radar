import { describe, it, expect, vi, afterEach } from 'vitest';
import React, { isValidElement, type ReactElement, type ReactNode } from 'react';
import { Navigate, Route } from 'react-router-dom';
import { appRoutes } from '../appRoutes';
import { marketingRoutes } from '../marketingRoutes';
import { financialRoutes } from '../financialRoutes';
import { projectRoutes } from '../projectRoutes';
import { peopleRoutes } from '../peopleRoutes';
import { operationsRoutes } from '../operationsRoutes';
import { adminRoutes } from '../adminRoutes';
import {
  DOMAIN,
  GUARD_NAMES,
  NON_INDEXABLE,
  loadRouteTable,
  staticEntries,
  dynamicEntries,
  mergeEntries,
  buildSitemapXML,
  fetchContent,
  generateRobotsTxt,
  matchesPattern,
} from '../../../scripts/generate-sitemap.js';

/**
 * US-382: the sitemap is derived from the route table, not a hand-kept list.
 * The generator reads the route files as text; these tests hold it to the
 * route tree React Router actually mounts.
 */

type RouteProps = { path?: string; element?: ReactNode; children?: ReactNode };

function collectRoutes(node: ReactNode, out: ReactElement<RouteProps>[] = []): ReactElement<RouteProps>[] {
  React.Children.forEach(node, (child) => {
    if (!isValidElement(child)) return;
    const el = child as ReactElement<RouteProps>;
    if (el.type === Route) out.push(el);
    if (el.props.children) collectRoutes(el.props.children, out);
  });
  return out;
}

function componentName(el: ReactNode): string {
  if (!isValidElement(el)) return String(el);
  const t = el.type as { displayName?: string; name?: string } | string;
  return typeof t === 'string' ? t : t.displayName || t.name || 'Anonymous';
}

const mounted = [appRoutes, marketingRoutes, projectRoutes, financialRoutes, peopleRoutes, operationsRoutes, adminRoutes]
  .flatMap((tree) => collectRoutes(tree))
  .filter((r) => r.props.path && r.props.element)
  .map((r) => ({
    path: r.props.path!,
    guarded: GUARD_NAMES.has(componentName(r.props.element)),
    redirect: (r.props.element as ReactElement).type === Navigate,
  }));

/** The route that would answer a concrete URL: exact paths win over patterns, as in React Router. */
function answeringRoute(url: string) {
  return mounted.find((r) => r.path === url) || mounted.find((r) => r.path.includes(':') && matchesPattern(r.path, url));
}

const table = loadRouteTable();
const statics = staticEntries(table, new Map());
const sample = dynamicEntries(table.templates, {
  blogPosts: [
    { slug: 'crew-scheduling-tips', updated_at: '2026-05-01T10:00:00Z' },
    { slug: 'no-date-post', updated_at: null },
  ],
  pseoPages: [
    { canonical_url: '/compare/procore', updated_at: '2026-04-02T00:00:00Z' },
    { canonical_url: '/software/hvac/scheduling', updated_at: '2026-04-03T00:00:00Z' },
    { canonical_url: '/nowhere/at/all/here', updated_at: '2026-04-04T00:00:00Z' },
  ],
});
const all = mergeEntries(statics, sample.entries);
const locs = [...buildSitemapXML(all).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(DOMAIN, ''));

describe('sitemap generator (US-382)', () => {
  it('parses the same routes React Router mounts, with the same guard status', () => {
    const parsed = new Map(table.routes.map((r: { path: string; guarded: boolean }) => [r.path, r.guarded]));
    const mountedPaths = new Set(mounted.map((r) => r.path));
    expect([...parsed.keys()].filter((p) => !mountedPaths.has(p))).toEqual([]);
    expect([...mountedPaths].filter((p) => !parsed.has(p))).toEqual([]);
    const disagree = mounted.filter((r) => parsed.get(r.path) !== r.guarded).map((r) => r.path);
    expect(disagree).toEqual([]);
  });

  it('every sitemap URL is answered by a route, and none by a guarded route or a redirect', () => {
    expect(locs.length).toBeGreaterThan(50);
    const bad = locs.filter((url) => {
      const r = answeringRoute(url);
      return !r || r.guarded || r.redirect;
    });
    expect(bad).toEqual([]);
  });

  it('leaves out sign-in, setup, app pages, return pages and aliases', () => {
    for (const p of NON_INDEXABLE) expect(locs).not.toContain(p);
    for (const p of [
      '/dashboard', '/knowledge-base', '/support', '/tutorials', '/schedule-builder',
      '/procore-alternative-detailed', '/procore-alternative-simple', '/job-costing-software-simple',
      '/privacy', '/terms', '/security', '/cookies', '/demo-request', '/health-check', '/blog/crew-scheduling-tips',
    ]) {
      expect(locs, p).not.toContain(p);
    }
    expect(new Set(locs).size).toBe(locs.length);
  });

  it('includes the public pages the old list missed', () => {
    for (const p of ['/', '/contact', '/legal/security', '/pricing', '/resources', '/demo', '/tools/schedule-builder']) expect(locs).toContain(p);
  });

  it('includes published blog posts and pSEO pages at their routed URLs with updated_at as lastmod', () => {
    expect(table.templates.blog).toBe('/resources/:slug');
    expect(all).toContainEqual({ path: '/resources/crew-scheduling-tips', lastmod: '2026-05-01' });
    expect(all).toContainEqual({ path: '/resources/no-date-post' });
    expect(all).toContainEqual({ path: '/compare/procore', lastmod: '2026-04-02' });
    expect(locs).not.toContain('/nowhere/at/all/here');
    expect(sample.dropped).toBe(1);
  });

  it('never invents a lastmod: no git date means no <lastmod>, and dates come per file', () => {
    expect(statics.every((e: { lastmod?: string }) => !e.lastmod)).toBe(true);
    expect(buildSitemapXML(statics)).not.toContain('<lastmod>');

    const dates = new Map([
      ['src/pages/Pricing.tsx', '2026-01-10'],
      ['src/pages/Contact.tsx', '2026-03-22'],
    ]);
    const dated = staticEntries(table, dates);
    expect(dated).toContainEqual({ path: '/pricing', lastmod: '2026-01-10' });
    expect(dated).toContainEqual({ path: '/contact', lastmod: '2026-03-22' });
    expect(dated.filter((e: { lastmod?: string }) => e.lastmod)).toHaveLength(2);
  });

  describe('fetchContent', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('asks Supabase for published rows only', async () => {
      const urls: string[] = [];
      vi.stubGlobal('fetch', vi.fn(async (url: string) => {
        urls.push(url);
        return new Response('[]', { status: 200 });
      }));
      const out = await fetchContent({ SUPABASE_URL: 'https://db.example', SUPABASE_ANON_KEY: 'anon' });
      expect(out).toEqual({ blogPosts: [], pseoPages: [] });
      expect(urls.some((u) => u.startsWith('https://db.example/rest/v1/blog_posts?') && u.includes('status=eq.published'))).toBe(true);
      expect(urls.some((u) => u.startsWith('https://db.example/rest/v1/pseo_pages?') && u.includes('is_published=eq.true'))).toBe(true);
    });

    it('fails loudly without a key instead of returning nothing', async () => {
      await expect(fetchContent({})).rejects.toThrow(/anon key/);
    });
  });

  it('robots.txt has no LLMs-txt directive and no trailing-slash gaps', () => {
    const robots = generateRobotsTxt();
    expect(robots).not.toMatch(/LLMs-txt/i);
    for (const p of ['/auth', '/dashboard', '/admin', '/setup']) {
      expect(robots).toMatch(new RegExp(`^Disallow: ${p}$`, 'm'));
    }
    expect(robots).toContain(`Sitemap: ${DOMAIN}/sitemap.xml`);
  });
});
