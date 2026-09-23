/**
 * US-383: the card's "View" link must land on a path the router answers.
 * It used to open /blog/<slug> while only /resources/:slug was routed.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, createRoutesFromChildren, matchRoutes } from 'react-router-dom';
import { BlogPostCard } from '../BlogPostCard';
import { marketingRoutes } from '@/routes/marketingRoutes';
import { appRoutes } from '@/routes/appRoutes';

const post = {
  id: 'p1',
  title: 'Job costing basics',
  slug: 'job-costing-basics',
  body: 'body',
  excerpt: 'excerpt',
  featured_image_url: '',
  seo_title: '',
  seo_description: '',
  status: 'published',
  published_at: '2026-09-01T00:00:00Z',
  created_at: '2026-09-01T00:00:00Z',
};

const routes = createRoutesFromChildren(
  <>
    {marketingRoutes}
    {appRoutes}
  </>,
);

const routedPattern = (pathname: string) =>
  matchRoutes(routes, pathname)?.at(-1)?.route.path;

describe('BlogPostCard links (US-383)', () => {
  it("points the View link at a path the router answers with the post page", () => {
    render(
      <MemoryRouter>
        <BlogPostCard post={post} onEdit={vi.fn()} onDelete={vi.fn()} />
      </MemoryRouter>,
    );
    const href = screen.getByRole('link', { name: 'View Job costing basics' }).getAttribute('href');
    expect(href).toBe('/resources/job-costing-basics');
    expect(routedPattern(href!)).toBe('/resources/:slug');
  });

  it('keeps old /blog/<slug> links routed', () => {
    expect(routedPattern('/blog/job-costing-basics')).toBe('/blog/:slug');
  });
});
