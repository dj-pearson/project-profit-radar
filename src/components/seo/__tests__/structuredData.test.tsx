/**
 * US-385: structured data validates and points at things that exist.
 *
 * - every @type is a real schema.org type (no "ComparisonTable")
 * - every url/logo/image/@id is absolute on https://brikly.net, and files
 *   served from public/ actually exist there
 * - no SearchAction pointing at the unrouted /search
 * - price comes from src/config/pricing.ts and priceValidUntil is in the future
 * - the default OG image is public/og-image.png at 1200x630, with width/height tags
 * - verification files are in public/, and llms.txt is served at the root
 */
import React from 'react';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/integrations/supabase/client', () => {
  const builder = {
    select: () => builder,
    eq: () => builder,
    maybeSingle: () => Promise.resolve({ data: null, error: null }),
    then: (resolve: (v: unknown) => unknown) => resolve({ data: [], error: null }),
  };
  return { supabase: { from: () => builder } };
});

import {
  PageSEO,
  createOrganizationSchema,
  createProductSchema,
  createWebSiteSchema,
} from '@/components/seo/PageSEO';
import { UnifiedSEOSystem } from '@/components/seo/UnifiedSEOSystem';
import { SaaSProductSchema, BriklyServiceSchema } from '@/components/seo/SaaSProductSchema';
import { OrganizationSchema, SoftwareSchema, ProductSchema } from '@/components/seo/EnhancedSchemaMarkup';
import { SiteSearchSchema } from '@/components/seo/SiteSearchSchema';
import { AutoSchemaInjector } from '@/components/seo/AutoSchemaInjector';
import { CLAIMS } from '@/config/claims';
import { getSEOConfig } from '@/config/seoConfig';
import {
  constructionSoftwareStructuredData,
  organizationStructuredData,
} from '@/components/SEOMetaTags';
import { PRICING_PLANS } from '@/config/pricing';
import {
  COMPANY_INFO,
  DEFAULT_OG_IMAGE,
  DEFAULT_OG_IMAGE_HEIGHT,
  DEFAULT_OG_IMAGE_WIDTH,
  SCHEMA_PRICE,
  SOFTWARE_INFO,
  getPriceValidUntil,
} from '@/config/seoConfig';

const ROOT = join(__dirname, '..', '..', '..', '..');
const PUBLIC = join(ROOT, 'public');
const INDEX_HTML = readFileSync(join(ROOT, 'index.html'), 'utf8');

// Every type the site emits, each checked against schema.org/docs/full.html.
// Adding a type here is a claim that it exists on schema.org; check first.
const SCHEMA_ORG_TYPES = new Set([
  'AggregateOffer', 'AggregateRating', 'Answer', 'Article', 'BlogPosting', 'Brand',
  'BreadcrumbList', 'ContactPoint', 'Country', 'CreativeWork', 'EntryPoint',
  'FAQPage', 'HowTo', 'HowToStep', 'HowToSupply', 'HowToTool', 'ImageObject',
  'ItemList', 'ListItem', 'MonetaryAmount', 'Offer', 'OfferCatalog', 'Organization',
  'Person', 'Place', 'PostalAddress', 'Product', 'QuantityValue', 'Question',
  'Rating', 'Review', 'SearchAction', 'Service', 'SiteNavigationElement',
  'SoftwareApplication', 'SpeakableSpecification', 'State', 'Table',
  'UnitPriceSpecification', 'VideoObject', 'WebApplication', 'WebPage', 'WebSite',
]);

// Keys whose value is a URL that must live on the brikly.net origin.
const OWN_URL_KEYS = new Set(['url', 'logo', 'image', '@id', 'item', 'downloadUrl']);

type Json = unknown;

function walk(node: Json, visit: (key: string, value: Json, parent: Record<string, Json>) => void) {
  if (Array.isArray(node)) {
    node.forEach((n) => walk(n, visit));
  } else if (node && typeof node === 'object') {
    const obj = node as Record<string, Json>;
    for (const [k, v] of Object.entries(obj)) {
      visit(k, v, obj);
      walk(v, visit);
    }
  }
}

function problemsIn(schema: Json, label: string): string[] {
  const problems: string[] = [];
  const today = new Date().toISOString().slice(0, 10);
  walk(schema, (key, value, parent) => {
    if (key === '@type') {
      for (const t of Array.isArray(value) ? value : [value]) {
        if (!SCHEMA_ORG_TYPES.has(String(t))) problems.push(`${label}: @type "${t}" is not a schema.org type`);
      }
    }
    if (OWN_URL_KEYS.has(key) && typeof value === 'string') {
      if (!/^https:\/\/brikly\.net(\/|$)/.test(value)) {
        problems.push(`${label}: ${key} "${value}" is not an absolute https://brikly.net URL`);
      } else {
        const path = value.replace(/^https:\/\/brikly\.net/, '').split(/[?#]/)[0];
        if (/\.(png|jpe?g|webp|svg|ico)$/i.test(path) && !existsSync(join(PUBLIC, path))) {
          problems.push(`${label}: ${key} "${value}" has no file at public${path}`);
        }
      }
    }
    if (key === 'urlTemplate' && typeof value === 'string' && value.includes('/search')) {
      problems.push(`${label}: SearchAction targets ${value}, which is not a route`);
    }
    if (key === 'price' && parent['@type'] !== 'MonetaryAmount' && String(value) !== SCHEMA_PRICE) {
      problems.push(`${label}: price ${String(value)} does not match SCHEMA_PRICE ${SCHEMA_PRICE}`);
    }
    if (key === 'priceValidUntil' && !(String(value) > today)) {
      problems.push(`${label}: priceValidUntil ${String(value)} is not in the future`);
    }
  });
  return problems;
}

function jsonLdBlocks(html: string): Json[] {
  return Array.from(html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)).map(
    (m) => JSON.parse(m[1]),
  );
}

function renderedJsonLd(): Json[] {
  return Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map((el) =>
    JSON.parse(el.textContent || '{}'),
  );
}

function renderWithProviders(ui: React.ReactElement, path = '/') {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>
    </HelmetProvider>,
  );
}

function meta(selector: string): string | null {
  const all = document.head.querySelectorAll(selector);
  return all.length ? all[all.length - 1].getAttribute('content') : null;
}

function pngSize(file: string): { width: number; height: number } {
  const buf = readFileSync(file);
  expect(buf.subarray(1, 4).toString('ascii')).toBe('PNG');
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

beforeEach(() => {
  document.head.innerHTML = '';
  document.body.innerHTML = '';
});

describe('schema price comes from the pricing config (US-385)', () => {
  it('SCHEMA_PRICE is the cheapest monthly plan in src/config/pricing.ts', () => {
    expect(SCHEMA_PRICE).toBe(String(Math.min(...PRICING_PLANS.map((p) => p.monthlyPrice))));
    expect(SOFTWARE_INFO.price).toBe(SCHEMA_PRICE);
    expect(COMPANY_INFO.priceRange).toContain(`$${SCHEMA_PRICE}`);
  });

  it('getPriceValidUntil is always a future date', () => {
    expect(getPriceValidUntil(new Date('2026-09-23T00:00:00Z'))).toBe('2027-12-31');
    expect(getPriceValidUntil(new Date('2026-12-31T12:00:00Z'))).toBe('2027-12-31');
    expect(getPriceValidUntil() > new Date().toISOString().slice(0, 10)).toBe(true);
  });
});

describe('index.html structured data (US-385)', () => {
  const blocks = jsonLdBlocks(INDEX_HTML);

  it('has JSON-LD blocks that parse', () => {
    expect(blocks.length).toBeGreaterThanOrEqual(3);
  });

  it('uses only schema.org types, brikly.net URLs that exist, and the config price', () => {
    expect(blocks.flatMap((b, i) => problemsIn(b, `index.html#${i}`))).toEqual([]);
  });

  it('carries no SearchAction, since /search is not routed', () => {
    expect(INDEX_HTML).not.toContain('SearchAction');
    expect(INDEX_HTML).not.toContain('brikly.net/search');
  });

  it('points Organization.logo at a file in public/', () => {
    const org = blocks.find((b) => (b as { '@type'?: string })['@type'] === 'Organization') as { logo: string };
    expect(org.logo).toBe('https://brikly.net/BriklyLogo.png');
    expect(existsSync(join(PUBLIC, 'BriklyLogo.png'))).toBe(true);
  });

  it('sets og:image to the 1200x630 public/og-image.png with width/height', () => {
    const tag = (prop: string) =>
      INDEX_HTML.match(new RegExp(`<meta (?:property|name)="${prop}" content="([^"]*)"`))?.[1];
    expect(tag('og:image')).toBe(DEFAULT_OG_IMAGE);
    expect(tag('og:image:width')).toBe(String(DEFAULT_OG_IMAGE_WIDTH));
    expect(tag('og:image:height')).toBe(String(DEFAULT_OG_IMAGE_HEIGHT));
    expect(tag('twitter:image')).toBe(DEFAULT_OG_IMAGE);
  });
});

describe('default OG image file (US-385)', () => {
  it('public/og-image.png exists at the declared dimensions', () => {
    expect(DEFAULT_OG_IMAGE).toBe('https://brikly.net/og-image.png');
    expect(pngSize(join(PUBLIC, 'og-image.png'))).toEqual({
      width: DEFAULT_OG_IMAGE_WIDTH,
      height: DEFAULT_OG_IMAGE_HEIGHT,
    });
  });
});

describe('React schema emitters (US-385)', () => {
  it('PageSEO schema helpers', () => {
    const schemas = [createOrganizationSchema(), createWebSiteSchema(), createProductSchema('Brikly', 'd')];
    expect(schemas.flatMap((s, i) => problemsIn(s, `PageSEO#${i}`))).toEqual([]);
    expect(JSON.stringify(createWebSiteSchema())).not.toContain('SearchAction');
  });

  it('SEOMetaTags legacy exports', () => {
    expect([
      ...problemsIn(constructionSoftwareStructuredData, 'SEOMetaTags.software'),
      ...problemsIn(organizationStructuredData, 'SEOMetaTags.organization'),
    ]).toEqual([]);
  });

  it('SaaSProductSchema, BriklyServiceSchema and EnhancedSchemaMarkup', async () => {
    renderWithProviders(
      <>
        <SaaSProductSchema includeReviews={false} />
        <BriklyServiceSchema />
        <OrganizationSchema />
        <SoftwareSchema />
        <ProductSchema name="Brikly" description="d" price={SCHEMA_PRICE} />
      </>,
    );
    await waitFor(() => expect(renderedJsonLd().length).toBeGreaterThanOrEqual(5));
    expect(renderedJsonLd().flatMap((s, i) => problemsIn(s, `rendered#${i}`))).toEqual([]);
  });

  it('the checker itself flags a bad type, a foreign logo, a stale price and /search', () => {
    const bad = {
      '@type': 'ComparisonTable',
      logo: 'https://brikly.net/images/brikly-logo.png',
      offers: { '@type': 'Offer', price: '350', priceValidUntil: '2025-12-31' },
      potentialAction: { '@type': 'SearchAction', target: { urlTemplate: 'https://brikly.net/search?q={q}' } },
    };
    expect(problemsIn(bad, 'bad')).toHaveLength(5);
  });

  it.each(['/', '/pricing', '/features'])(
    'AutoSchemaInjector (mounted on every route in App.tsx) is valid on %s',
    async (path) => {
      renderWithProviders(<AutoSchemaInjector />, path);
      if (!getSEOConfig(path)) return;
      await waitFor(() => expect(renderedJsonLd().length).toBeGreaterThan(0));
      const blocks = renderedJsonLd();
      expect(blocks.flatMap((s, i) => problemsIn(s, `auto${path}#${i}`))).toEqual([]);
      // An AggregateRating with no ratingValue is a Rich Results error; with the
      // claim unverified there must be no AggregateRating at all.
      const ratings: Json[] = [];
      walk(blocks, (k, v) => {
        if (k === '@type' && v === 'AggregateRating') ratings.push(v);
      });
      if (!CLAIMS.aggregateRating.verified) expect(ratings).toEqual([]);
    },
  );

  it('SiteSearchSchema emits no SearchAction unless given a real search URL', () => {
    renderWithProviders(<SiteSearchSchema />);
    const [schema] = renderedJsonLd();
    expect(schema).not.toHaveProperty('potentialAction');
  });

  it('UnifiedSEOSystem on / uses the config price and a valid applicationCategory', async () => {
    renderWithProviders(<UnifiedSEOSystem title="Brikly" description="d" />, '/');
    await waitFor(() => expect(meta('meta[property="og:image"]')).toBe(DEFAULT_OG_IMAGE));
    expect(meta('meta[property="og:image:width"]')).toBe('1200');
    expect(meta('meta[property="og:image:height"]')).toBe('630');
    const software = renderedJsonLd().find(
      (s) => (s as { '@type'?: string })['@type'] === 'SoftwareApplication',
    ) as { offers: { price: string } } | undefined;
    expect(software?.offers.price).toBe(SCHEMA_PRICE);
    expect(renderedJsonLd().flatMap((s, i) => problemsIn(s, `unified#${i}`))).toEqual([]);
  });

  it('PageSEO defaults og:image to og-image.png with width/height, and omits them for a custom image', async () => {
    const { unmount } = renderWithProviders(<PageSEO title="Pricing" description="d" />);
    await waitFor(() => expect(meta('meta[property="og:image"]')).toBe(DEFAULT_OG_IMAGE));
    expect(meta('meta[property="og:image:width"]')).toBe('1200');
    expect(meta('meta[property="og:image:height"]')).toBe('630');
    unmount();
    document.head.innerHTML = '';

    renderWithProviders(<PageSEO title="Post" description="d" ogImage="https://brikly.net/BriklyLogo.png" />);
    await waitFor(() => expect(meta('meta[property="og:image"]')).toBe('https://brikly.net/BriklyLogo.png'));
    expect(meta('meta[property="og:image:width"]')).toBeNull();
  });
});

describe('no invalid schema.org type literals anywhere in src/ (US-385)', () => {
  it('every literal "@type": "X" is on the allowlist', () => {
    const offenders: string[] = [];
    const scan = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const full = join(dir, name);
        if (statSync(full).isDirectory()) {
          if (name !== 'node_modules' && name !== '__tests__') scan(full);
        } else if (/\.(tsx?|jsx?)$/.test(name)) {
          const src = readFileSync(full, 'utf8');
          for (const m of src.matchAll(/["']@type["']\s*:\s*["']([A-Za-z]+)["']/g)) {
            if (!SCHEMA_ORG_TYPES.has(m[1])) offenders.push(`${full.slice(ROOT.length + 1)}: ${m[1]}`);
          }
        }
      }
    };
    scan(join(ROOT, 'src'));
    expect(offenders).toEqual([]);
  });
});

describe('verification and llms.txt files (US-385)', () => {
  it('the Yandex verification file is served from public/, not the repo root', () => {
    expect(existsSync(join(PUBLIC, 'yandex_5b34dc7bf0e441e6.html'))).toBe(true);
    expect(existsSync(join(ROOT, 'yandex_5b34dc7bf0e441e6.html'))).toBe(false);
  });

  it('llms.txt is rewritten to /.well-known/llms.txt ahead of the SPA catch-all', () => {
    expect(existsSync(join(PUBLIC, '.well-known', 'llms.txt'))).toBe(true);
    const rules = readFileSync(join(PUBLIC, '_redirects'), 'utf8')
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'));
    const llms = rules.findIndex((l) => /^\/llms\.txt\s+\/\.well-known\/llms\.txt\s+200$/.test(l));
    const catchAll = rules.findIndex((l) => l.startsWith('/* '));
    expect(llms).toBeGreaterThanOrEqual(0);
    expect(llms).toBeLessThan(catchAll);
  });
});
