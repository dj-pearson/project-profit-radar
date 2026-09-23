import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

/**
 * US-386: the renderer links only to pages that exist and are published.
 * Supabase is faked: the page lookup returns one page, and the related-page
 * lookup returns only the canonical URLs this test marks published.
 */
const state = vi.hoisted(() => ({
  page: null as Record<string, unknown> | null,
  published: [] as string[],
  relatedQuery: null as { urls: string[]; publishedOnly: boolean } | null,
}));

vi.mock('@/integrations/supabase/client', () => {
  const builder = () => {
    const q: { filters: Record<string, unknown>; inUrls?: string[]; isUpdate?: boolean } = { filters: {} };
    const b: Record<string, unknown> = {
      select: () => b,
      update: () => {
        q.isUpdate = true;
        return b;
      },
      eq: (col: string, val: unknown) => {
        q.filters[col] = val;
        return b;
      },
      in: (_col: string, urls: string[]) => {
        q.inUrls = urls;
        return b;
      },
      single: async () => ({ data: state.page, error: state.page ? null : { message: 'no rows' } }),
      then: (resolve: (v: unknown) => void) => {
        if (q.inUrls) {
          state.relatedQuery = { urls: q.inUrls, publishedOnly: q.filters.is_published === true };
          const rows = q.inUrls.filter((u) => state.published.includes(u)).map((canonical_url) => ({ canonical_url }));
          return resolve({ data: rows, error: null });
        }
        return resolve({ data: null, error: null });
      },
    };
    return b;
  };
  return { supabase: { from: () => builder() } };
});

import PSEOPageRenderer from '../PSEOPageRenderer';

const PATH = '/software/electrical-contractor/cash-flow-management';

function renderAt(path: string) {
  window.history.pushState({}, '', path);
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/software/:dim1/:dim2" element={<PSEOPageRenderer />} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>,
  );
}

function pageWith(related: Array<{ title: string; url: string }>) {
  return {
    id: 'p1',
    page_type: 'contractor_pain',
    seo_title: 'Cash Flow Software for Electrical Contractors',
    seo_description: 'desc',
    canonical_url: PATH,
    is_published: true,
    view_count: 0,
    page_schema: {
      hero: { headline: 'Cash flow', subheadline: 's', intro: 'i', cta_primary: 'Demo', cta_secondary: 'Pricing' },
      related_pages: related.map((r) => ({ ...r, relationship: 'rel', page_type: 'contractor_pain' })),
    },
  };
}

beforeEach(() => {
  state.page = null;
  state.published = [];
  state.relatedQuery = null;
});

describe('PSEOPageRenderer links (US-386)', () => {
  it('renders a related link only when its target is published', async () => {
    state.page = pageWith([
      { title: 'Time tracking for electricians', url: '/software/electrical-contractor/time-tracking' },
      { title: 'Unpublished draft', url: '/software/electrical-contractor/invoicing-software' },
      { title: 'Not a pSEO page', url: '/nowhere' },
    ]);
    state.published = ['/software/electrical-contractor/time-tracking'];

    renderAt(PATH);

    await screen.findByText('Time tracking for electricians');
    expect(screen.queryByText('Unpublished draft')).toBeNull();
    expect(screen.queryByText('Not a pSEO page')).toBeNull();
    expect(state.relatedQuery?.publishedOnly).toBe(true);
    expect(state.relatedQuery?.urls).not.toContain('/nowhere');
  });

  it('drops the related section when no target is published', async () => {
    state.page = pageWith([{ title: 'Draft only', url: '/software/electrical-contractor/invoicing-software' }]);
    renderAt(PATH);
    await screen.findByText('Cash flow');
    expect(screen.queryByText('Related Resources')).toBeNull();
    expect(screen.queryByText('Draft only')).toBeNull();
  });

  it('links nowhere unrouted: no /software or /compare hrefs anywhere on the page', async () => {
    state.page = pageWith([]);
    const { container } = renderAt(PATH);
    await screen.findByText('Cash flow');
    const hrefs = [...container.querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(hrefs).not.toContain('/software');
    expect(hrefs).not.toContain('/compare');
    expect(hrefs).toContain('/demo');
  });

  it('marks a thin page noindex and emits BreadcrumbList', async () => {
    state.page = pageWith([]);
    renderAt(PATH);
    await screen.findByText('Cash flow');
    await waitFor(() => {
      expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex, follow');
    });
    const ld = [...document.head.querySelectorAll('script[type="application/ld+json"]')].map((s) => s.textContent ?? '');
    expect(ld.some((t) => t.includes('"BreadcrumbList"'))).toBe(true);
  });
});
