/**
 * US-384: blog index pagination and topic pages.
 */
import { describe, it, expect } from 'vitest';
import { MemoryRouter, createRoutesFromChildren, matchRoutes } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { BlogPagination } from '../BlogListing';
import {
  BLOG_CATEGORIES,
  CURATED_GUIDES,
  categoriesFor,
  categoryPath,
  inCategory,
  keywordPattern,
  listablePosts,
  listingPath,
  pageWindow,
  paginate,
  parsePageParam,
  type BlogListingPost,
} from '../blogListing';
import { appRoutes } from '@/routes/appRoutes';
import { marketingRoutes } from '@/routes/marketingRoutes';
import { categoryEntries, loadRouteTable } from '../../../../scripts/generate-sitemap.js';

const post = (over: Partial<BlogListingPost>): BlogListingPost => ({
  id: over.slug || 'x',
  title: 'Untitled',
  slug: 'x',
  excerpt: null,
  featured_image_url: null,
  published_at: '2026-09-01T00:00:00Z',
  created_at: '2026-09-01T00:00:00Z',
  seo_description: null,
  status: 'published',
  ...over,
});

describe('pagination', () => {
  const items = Array.from({ length: 20 }, (_, i) => i);

  it('slices pages of nine and counts the total', () => {
    expect(paginate(items, 1).items).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    expect(paginate(items, 3).items).toEqual([18, 19]);
    expect(paginate(items, 3)).toMatchObject({ totalPages: 3, totalItems: 20, outOfRange: false });
  });

  it('flags a page past the end and returns nothing for it', () => {
    expect(paginate(items, 4)).toMatchObject({ items: [], outOfRange: true });
    expect(paginate([], 1)).toMatchObject({ items: [], totalPages: 1, outOfRange: false });
  });

  it('parses the :page param strictly', () => {
    expect(parsePageParam(undefined)).toBe(1);
    expect(parsePageParam('2')).toBe(2);
    for (const bad of ['0', '-1', '01', '2.5', 'abc', '', '1e3']) expect(parsePageParam(bad), bad).toBeNull();
  });

  it('builds crawlable page paths with page 1 at the bare URL', () => {
    expect(listingPath('/resources', 1)).toBe('/resources');
    expect(listingPath('/resources', 2)).toBe('/resources/page/2');
    expect(listingPath(categoryPath('safety-and-compliance'), 3)).toBe('/resources/category/safety-and-compliance/page/3');
  });

  it('shows first, last and neighbours with gaps between', () => {
    expect(pageWindow(1, 1)).toEqual([1]);
    expect(pageWindow(5, 10)).toEqual([1, 'gap', 4, 5, 6, 'gap', 10]);
    expect(pageWindow(2, 3)).toEqual([1, 2, 3]);
  });
});

describe('listable posts', () => {
  it('drops drafts, future posts and slugless rows, newest first', () => {
    const now = new Date('2026-09-20T00:00:00Z');
    const out = listablePosts(
      [
        post({ slug: 'old', published_at: '2026-01-01T00:00:00Z' }),
        post({ slug: 'draft', status: 'draft' }),
        post({ slug: 'future', published_at: '2027-01-01T00:00:00Z' }),
        post({ slug: '' }),
        post({ slug: 'new', published_at: '2026-09-10T00:00:00Z' }),
      ],
      now,
    );
    expect(out.map((p) => p.slug)).toEqual(['new', 'old']);
  });
});

describe('categories', () => {
  it('matches whole words and prefixes, not substrings', () => {
    expect(keywordPattern('app').test('Best field app')).toBe(true);
    expect(keywordPattern('app').test('Approval workflows')).toBe(false);
    expect(keywordPattern('schedul*').test('Scheduling crews')).toBe(true);
    expect(keywordPattern('job cost*').test('job   costing basics')).toBe(true);
  });

  it('classifies by title and slug, possibly into several topics', () => {
    expect(categoriesFor({ title: 'OSHA recordkeeping in 2026', slug: 'osha-recordkeeping' })).toEqual(['safety-and-compliance']);
    expect(categoriesFor({ title: 'Untitled', slug: 'procore-vs-brikly' })).toContain('software-comparisons');
    expect(categoriesFor({ title: 'Daily logs that hold up', slug: 'daily-logs' })).toEqual(
      expect.arrayContaining(['scheduling-and-project-management', 'field-and-mobile']),
    );
    expect(categoriesFor({ title: 'Company news', slug: 'company-news' })).toEqual([]);
  });

  it('filters a list to one topic and returns nothing for an unknown one', () => {
    const posts = [
      post({ slug: 'cash-flow-for-subs', title: 'Cash flow for subcontractors' }),
      post({ slug: 'osha-300', title: 'OSHA 300 logs' }),
    ];
    expect(inCategory(posts, 'job-costing-and-financials').map((p) => p.slug)).toEqual(['cash-flow-for-subs']);
    expect(inCategory(posts, 'nope')).toEqual([]);
  });

  it('gives every topic at least one hand-written guide, so no topic page is empty', () => {
    for (const c of BLOG_CATEGORIES) expect(inCategory(CURATED_GUIDES, c.slug).length, c.slug).toBeGreaterThan(0);
  });

  it('has unique, URL-safe slugs', () => {
    const slugs = BLOG_CATEGORIES.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const s of slugs) expect(s).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });
});

describe('routes and sitemap', () => {
  const routes = createRoutesFromChildren(
    <>
      {appRoutes}
      {marketingRoutes}
    </>,
  );
  const leaf = (url: string) => matchRoutes(routes, url)?.at(-1);

  it('answers listing and topic URLs with the listing pages, not the post page', () => {
    expect(leaf('/resources')?.route.path).toBe('/resources');
    expect(leaf('/resources/page/2')?.route.path).toBe('/resources/page/:page');
    expect(leaf('/resources/category/safety-and-compliance')?.route.path).toBe('/resources/category/:category');
    expect(leaf('/resources/category/safety-and-compliance/page/2')?.route.path).toBe('/resources/category/:category/page/:page');
    expect(leaf('/resources/some-post')?.route.path).toBe('/resources/:slug');
  });

  it('lists one sitemap URL per topic', () => {
    const { templates } = loadRouteTable();
    expect(templates.category).toBe('/resources/category/:category');
    expect(templates.blog).toBe('/resources/:slug');
    expect(categoryEntries(templates).map((e: { path: string }) => e.path)).toEqual(
      BLOG_CATEGORIES.map((c) => categoryPath(c.slug)),
    );
  });
});

describe('BlogPagination', () => {
  const renderAt = (page: number, totalPages: number) =>
    render(
      <HelmetProvider>
        <MemoryRouter>
          <BlogPagination basePath="/resources/category/field-and-mobile" page={page} totalPages={totalPages} />
        </MemoryRouter>
      </HelmetProvider>,
    );

  it('renders crawlable prev/next links with rel attributes', () => {
    renderAt(2, 3);
    const prev = screen.getByRole('link', { name: /newer/i });
    const next = screen.getByRole('link', { name: /older/i });
    expect(prev.getAttribute('href')).toBe('/resources/category/field-and-mobile');
    expect(prev.getAttribute('rel')).toBe('prev');
    expect(next.getAttribute('href')).toBe('/resources/category/field-and-mobile/page/3');
    expect(next.getAttribute('rel')).toBe('next');
    expect(screen.getByRole('link', { name: 'Page 2' }).getAttribute('aria-current')).toBe('page');
  });

  it('renders nothing for a single page', () => {
    const { container } = renderAt(1, 1);
    expect(container.querySelector('nav')).toBeNull();
  });
});
