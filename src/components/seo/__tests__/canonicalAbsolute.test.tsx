/**
 * US-381: every SEO component emits an absolute https://brikly.net canonical,
 * even when the call site (or a seo_meta_tags row) passes a relative path.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';

const dbRow: { current: Record<string, unknown> | null } = { current: null };

vi.mock('@/integrations/supabase/client', () => {
  const builder = {
    select: () => builder,
    eq: () => builder,
    maybeSingle: () => Promise.resolve({ data: dbRow.current, error: null }),
  };
  return { supabase: { from: () => builder } };
});

import { PageSEO } from '@/components/seo/PageSEO';
import { UnifiedSEOSystem } from '@/components/seo/UnifiedSEOSystem';
import LegalPageLayout from '@/components/legal/LegalPageLayout';

function renderAt(path: string, ui: React.ReactElement) {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>
    </HelmetProvider>,
  );
}

function canonicalHrefs(): string[] {
  return Array.from(document.head.querySelectorAll('link[rel="canonical"]')).map(
    (el) => el.getAttribute('href') ?? '',
  );
}

async function expectCanonical(expected: string) {
  await waitFor(() => {
    const hrefs = canonicalHrefs();
    expect(hrefs.length).toBeGreaterThan(0);
    expect(hrefs[hrefs.length - 1]).toBe(expected);
  });
}

beforeEach(() => {
  document.head.innerHTML = '';
  dbRow.current = null;
});

describe('canonical URLs are absolute (US-381)', () => {
  it('PageSEO resolves a relative canonicalUrl against https://brikly.net', async () => {
    renderAt('/pricing', <PageSEO title="Pricing" description="d" canonicalUrl="/pricing" />);
    await expectCanonical('https://brikly.net/pricing');
    expect(
      document.head.querySelector('meta[property="og:url"]')?.getAttribute('content'),
    ).toBe('https://brikly.net/pricing');
  });

  it('PageSEO falls back to the current path when no canonicalUrl is given', async () => {
    renderAt('/features', <PageSEO title="Features" description="d" />);
    await expectCanonical('https://brikly.net/features');
  });

  it('PageSEO leaves an already-absolute canonical alone', async () => {
    renderAt(
      '/x',
      <PageSEO title="X" description="d" canonicalUrl="https://brikly.net/resources/x" />,
    );
    await expectCanonical('https://brikly.net/resources/x');
  });

  it('UnifiedSEOSystem resolves a relative canonicalUrl prop', async () => {
    renderAt(
      '/solutions',
      <UnifiedSEOSystem canonicalUrl="/solutions" autoOptimize={false} enableAnalytics={false} />,
    );
    await expectCanonical('https://brikly.net/solutions');
  });

  it('UnifiedSEOSystem resolves a relative canonical_url from seo_meta_tags', async () => {
    dbRow.current = { page_path: '/faq', canonical_url: '/faq' };
    renderAt('/faq', <UnifiedSEOSystem autoOptimize={false} enableAnalytics={false} />);
    await expectCanonical('https://brikly.net/faq');
  });

  it('LegalPageLayout emits an absolute canonical for the routed path', async () => {
    renderAt(
      '/privacy',
      <LegalPageLayout title="Privacy Policy" metaDescription="d">
        <p>body</p>
      </LegalPageLayout>,
    );
    await expectCanonical('https://brikly.net/privacy');
  });
});
