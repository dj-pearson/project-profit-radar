/**
 * US-383: a missing post renders "Article Not Found", which the SPA serves
 * with a 200, so the page has to carry robots noindex instead.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const postRow: { current: Record<string, unknown> | null } = { current: null };

vi.mock('@/integrations/supabase/client', () => {
  const builder = {
    select: () => builder,
    eq: () => builder,
    single: () =>
      Promise.resolve(
        postRow.current
          ? { data: postRow.current, error: null }
          : { data: null, error: { code: 'PGRST116', message: 'no rows' } },
      ),
    maybeSingle: () => Promise.resolve({ data: null, error: null }),
  };
  return { supabase: { from: () => builder } };
});

vi.mock('@/components/Header', () => ({ default: () => <header /> }));
vi.mock('@/components/Footer', () => ({ default: () => <footer /> }));
vi.mock('@/components/InternalLinking', () => ({ default: () => null }));

import BlogPost from '../BlogPost';

const renderAt = (path: string) =>
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/resources/:slug" element={<BlogPost />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>,
  );

const robots = () =>
  Array.from(document.head.querySelectorAll('meta[name="robots"]')).map(
    (el) => el.getAttribute('content') ?? '',
  );

beforeEach(() => {
  document.head.innerHTML = '';
  postRow.current = null;
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('BlogPost (US-383)', () => {
  it('marks a missing post noindex', async () => {
    renderAt('/blog/does-not-exist');
    expect(await screen.findByRole('heading', { name: 'Article Not Found' })).toBeInTheDocument();
    await waitFor(() => expect(robots().some((c) => c.includes('noindex'))).toBe(true));
  });

  it('serves the /blog alias with the /resources canonical, indexable, and a Person author', async () => {
    postRow.current = {
      id: 'p1',
      title: 'Job costing basics',
      slug: 'job-costing-basics',
      excerpt: 'How to set up job costing',
      body: 'Some words here.',
      featured_image_url: 'https://cdn.example.com/cover.jpg',
      published_at: '2026-09-01T00:00:00Z',
      created_at: '2026-09-01T00:00:00Z',
      seo_title: null,
      seo_description: null,
      author_name: 'Dana Reyes',
    };
    renderAt('/blog/job-costing-basics');
    expect(await screen.findByRole('heading', { level: 1, name: 'Job costing basics' })).toBeInTheDocument();

    await waitFor(() => {
      const hrefs = Array.from(document.head.querySelectorAll('link[rel="canonical"]')).map((el) =>
        el.getAttribute('href'),
      );
      expect(hrefs.at(-1)).toBe('https://brikly.net/resources/job-costing-basics');
    });
    expect(robots().every((c) => !c.includes('noindex'))).toBe(true);

    const article = Array.from(document.head.querySelectorAll('script[type="application/ld+json"]'))
      .map((el) => JSON.parse(el.textContent || '{}'))
      .find((d) => d['@type'] === 'Article');
    expect(article.author).toEqual({ '@type': 'Person', name: 'Dana Reyes' });
    expect(article.image).toBe('https://cdn.example.com/cover.jpg');
  });
});
