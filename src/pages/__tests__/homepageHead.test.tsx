/**
 * US-409: the homepage settles on exactly one of each head tag, and on the
 * same one whichever SEO renderer resolves first.
 *
 * Before this, three things wrote the homepage's identity tags: index.html's
 * static tags, UnifiedSEOSystem (global, lazy, waits on a Supabase fetch) and
 * PageSEO inside Index (lazy route). react-helmet-async never touched the
 * static tags, so they sat beside Helmet's copies, and between the two Helmet
 * renderers the later mount won - which depended on chunk and fetch timing.
 *
 * The test loads the real index.html head, renders the real Index page next to
 * the global SEO components, and drives both mount orders explicitly.
 */
import { useState } from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, waitFor } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// The seo_meta_tags lookup UnifiedSEOSystem makes before it renders anything.
// Each test decides when it resolves, which is how mount order is controlled.
const seoFetch = vi.hoisted(() => ({
  release: (() => {}) as () => void,
  gate: Promise.resolve() as Promise<void>,
  reset() {
    this.gate = new Promise<void>((r) => {
      this.release = r;
    });
  },
}));

vi.mock('@/integrations/supabase/client', () => {
  const builder: Record<string, unknown> = {};
  const chain = () => builder;
  Object.assign(builder, {
    select: chain,
    eq: chain,
    order: chain,
    limit: chain,
    maybeSingle: () => seoFetch.gate.then(() => ({ data: null, error: null })),
    single: () => Promise.resolve({ data: null, error: null }),
    then: (res: (v: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(res),
  });
  return {
    supabase: {
      from: () => builder,
      rpc: () => Promise.resolve({ data: null, error: null }),
      auth: {
        getSession: () => Promise.resolve({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      },
      functions: { invoke: () => Promise.resolve({ data: null, error: null }) },
    },
  };
});

// Chrome that needs the tenant/auth providers and has nothing to do with <head>.
vi.mock('@/components/Header', () => ({ default: () => null }));

import Index from '@/pages/Index';
import { UnifiedSEOSystem } from '@/components/seo/UnifiedSEOSystem';
import { AutoSchemaInjector } from '@/components/seo/AutoSchemaInjector';

const INDEX_HTML = readFileSync(resolve(__dirname, '../../../index.html'), 'utf8');

/** Put index.html's real <head> in place, as the browser would before JS runs. */
function loadShellHead() {
  const doc = new DOMParser().parseFromString(INDEX_HTML, 'text/html');
  document.head.innerHTML = '';
  doc.head.querySelectorAll('title, meta, link').forEach((el) => {
    document.head.appendChild(document.importNode(el, true));
  });
}

let showPage: (v: boolean) => void = () => {};

function Harness() {
  const [page, setPage] = useState(false);
  showPage = setPage;
  return (
    <>
      <UnifiedSEOSystem autoOptimize enableAnalytics={false} />
      <AutoSchemaInjector />
      {page && <Index />}
    </>
  );
}

function renderHomepage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <HelmetProvider>
        <MemoryRouter initialEntries={['/']}>
          <Harness />
        </MemoryRouter>
      </HelmetProvider>
    </QueryClientProvider>,
  );
}

const SINGLETONS = [
  'title',
  'meta[name="description"]',
  'meta[name="keywords"]',
  'meta[name="author"]',
  'meta[name="robots"]',
  'meta[name="viewport"]',
  'meta[name="theme-color"]',
  'link[rel="canonical"]',
  'meta[property="og:title"]',
  'meta[property="og:description"]',
  'meta[property="og:url"]',
  'meta[property="og:image"]',
  'meta[property="og:type"]',
  'meta[name="twitter:card"]',
  'meta[name="twitter:title"]',
  'meta[name="twitter:description"]',
  'meta[name="twitter:image"]',
  'meta[name="citation_title"]',
  'meta[name="dc.title"]',
];

function headSnapshot() {
  const counts = Object.fromEntries(
    SINGLETONS.map((s) => [s, document.head.querySelectorAll(s).length]),
  );
  const attr = (s: string, a: string) => document.head.querySelector(s)?.getAttribute(a) ?? null;
  return {
    counts,
    title: document.title,
    description: attr('meta[name="description"]', 'content'),
    canonical: attr('link[rel="canonical"]', 'href'),
    ogTitle: attr('meta[property="og:title"]', 'content'),
  };
}

const ONE_OF_EACH = Object.fromEntries(SINGLETONS.map((s) => [s, 1]));

// What Index's PageSEO declares. If the homepage copy changes, change these.
const EXPECTED = {
  title: 'Real-Time Job Costing for Contractors | Brikly',
  description: expect.stringMatching(/^Construction job costing software with real-time budget tracking/),
  canonical: 'https://brikly.net',
  ogTitle: 'Real-Time Job Costing for Contractors',
};

async function settled() {
  await waitFor(() => {
    expect(document.title).toBe(EXPECTED.title);
    expect(headSnapshot().counts).toEqual(ONE_OF_EACH);
  });
  return headSnapshot();
}

beforeEach(() => {
  seoFetch.reset();
  loadShellHead();
});

describe('homepage <head> has one owner per tag (US-409)', () => {
  it('the shell itself ships at most one of each', () => {
    const { counts } = headSnapshot();
    expect(Object.entries(counts).filter(([, n]) => n > 1)).toEqual([]);
  });

  it('never drops to zero while the global lookup is still in flight', async () => {
    renderHomepage();
    // Helmet has committed (the site default title is in), and the static tags
    // it adopted from index.html have been replaced rather than just removed.
    await waitFor(() => expect(document.title).toBe('Brikly - Construction Management Platform'));
    expect(headSnapshot().counts).toEqual(ONE_OF_EACH);
  });

  it('settles on PageSEO when the global SEO system resolves first', async () => {
    renderHomepage();
    await act(async () => {
      seoFetch.release();
    });
    // UnifiedSEOSystem's own homepage title is in place before the page mounts.
    await waitFor(() =>
      expect(document.title).toBe('Construction Management Software - Save 40% on Projects | Brikly'),
    );

    await act(async () => {
      showPage(true);
    });

    expect(await settled()).toMatchObject({ counts: ONE_OF_EACH, ...EXPECTED });
  });

  it('settles on the same tags when the page mounts first', async () => {
    renderHomepage();
    await act(async () => {
      showPage(true);
    });
    await act(async () => {
      seoFetch.release();
    });

    expect(await settled()).toMatchObject({ counts: ONE_OF_EACH, ...EXPECTED });
  });
});
