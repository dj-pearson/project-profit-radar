/**
 * pSEO page authoring, validation and link rules (US-386).
 *
 * pseo_pages had routes and a renderer but no way for content to get in: no
 * migration seeds it and no generator writes it. Pages now reach the table one
 * way, through the admin editor on /admin/pseo, which runs every draft through
 * validatePseoPageDraft before it is saved and again before it is published.
 * Writes are limited to root_admin/admin by RLS (20260923170000).
 *
 * The renderer only ever links to a pSEO page that is published: related
 * links are filtered against the published canonical URLs, and breadcrumbs
 * carry no link to a section index that has no route.
 */
import { z } from 'zod';
import {
  BUSINESS_SIZES,
  COMPETITORS,
  CONTRACTOR_TYPES,
  GEOGRAPHIES,
  PAIN_POINTS,
} from '@/data/pseo-taxonomy';
import type { PageType } from '@/types/pseo';

/** Below this many words of page-specific copy a page renders noindex. */
export const PSEO_MIN_UNIQUE_WORDS = 300;

export type DimensionKey = 'contractor_types' | 'pain_points' | 'geographies' | 'business_sizes' | 'competitors';

/**
 * Page types the editor can author, and which dimension each URL segment
 * comes from. feature_contractor is left out: no taxonomy holds the feature
 * slugs its /features/:feature/:contractorType URL needs.
 */
export const AUTHORABLE_PAGE_TYPES: Record<
  Exclude<PageType, 'feature_contractor'>,
  { prefix: '/software' | '/compare'; dimensions: DimensionKey[] }
> = {
  contractor_pain: { prefix: '/software', dimensions: ['contractor_types', 'pain_points'] },
  contractor_geo: { prefix: '/software', dimensions: ['contractor_types', 'geographies'] },
  contractor_size: { prefix: '/software', dimensions: ['contractor_types', 'business_sizes'] },
  pain_size: { prefix: '/software', dimensions: ['pain_points', 'business_sizes'] },
  pain_geo: { prefix: '/software', dimensions: ['pain_points', 'geographies'] },
  comparison: { prefix: '/compare', dimensions: ['competitors'] },
};

export type AuthorablePageType = keyof typeof AUTHORABLE_PAGE_TYPES;

type TaxonomyEntry = { display_name: string; url_slug: string };

export const TAXONOMY: Record<DimensionKey, Record<string, TaxonomyEntry>> = {
  contractor_types: CONTRACTOR_TYPES,
  pain_points: PAIN_POINTS,
  geographies: GEOGRAPHIES,
  business_sizes: BUSINESS_SIZES,
  competitors: COMPETITORS,
};

/** Normalise a path for comparison: no trailing slash, no query or hash. */
export function normalizePath(url: string): string {
  const path = url.split(/[?#]/)[0].trim();
  return path.length > 1 ? path.replace(/\/+$/, '') : path;
}

/**
 * True for a URL the pSEO renderer answers: /software/:a/:b, /compare/:slug
 * or /features/:feature/:contractorType. (/features/:x alone is a static page.)
 */
export function isPseoPath(url: string): boolean {
  return /^\/(software\/[^/]+\/[^/]+|compare\/[^/]+|features\/[^/]+\/[^/]+)$/.test(normalizePath(url));
}

/** The combination key and canonical URL for a page type and its dimension ids. */
export function buildPageIdentity(
  pageType: AuthorablePageType,
  dimensionIds: string[],
): { combination_key: string; canonical_url: string; dimension_1: string; dimension_2: string } | null {
  const def = AUTHORABLE_PAGE_TYPES[pageType];
  if (!def || dimensionIds.length < def.dimensions.length) return null;
  const slugs: string[] = [];
  for (let i = 0; i < def.dimensions.length; i++) {
    const entry = TAXONOMY[def.dimensions[i]][dimensionIds[i]];
    if (!entry) return null;
    slugs.push(entry.url_slug);
  }
  const ids = dimensionIds.slice(0, def.dimensions.length);
  return {
    combination_key: [pageType, ...ids].join('::'),
    canonical_url: `${def.prefix}/${slugs.join('/')}`,
    dimension_1: ids[0],
    // pseo_pages.dimension_2 is NOT NULL; a comparison is always against Brikly.
    dimension_2: ids[1] ?? 'brikly',
  };
}

const text = (min: number, label: string) =>
  z.string({ required_error: `${label} is required` }).trim().min(min, `${label} needs at least ${min} characters`);

const relatedPageSchema = z.object({
  title: text(3, 'Related page title'),
  url: z.string().trim().refine(isPseoPath, 'Related page URL must be a /software, /compare or /features pSEO URL'),
  relationship: z.string().trim().default(''),
  page_type: z.string().trim().default(''),
});

/**
 * The page_schema the renderer draws. Hero plus at least one body section is
 * required; everything the renderer treats as optional stays optional.
 */
export const pageContentSchema = z
  .object({
    hero: z.object({
      headline: text(10, 'Hero headline'),
      subheadline: text(10, 'Hero subheadline'),
      intro: text(40, 'Hero intro'),
      proof_point: z.string().trim().optional(),
      cta_primary: text(2, 'Primary CTA label'),
      cta_secondary: text(2, 'Secondary CTA label'),
    }),
    pain_section: z
      .object({
        section_title: text(5, 'Pain section title'),
        pain_points: z
          .array(z.object({ title: text(3, 'Pain title'), description: text(20, 'Pain description'), consequence: z.string().trim().default('') }))
          .min(1, 'Pain section needs at least one pain point'),
      })
      .optional(),
    solution_section: z
      .object({
        section_title: text(5, 'Solution section title'),
        features: z
          .array(
            z.object({
              name: text(3, 'Feature name'),
              description: text(20, 'Feature description'),
              contractor_specific_benefit: z.string().trim().default(''),
            }),
          )
          .min(1, 'Solution section needs at least one feature'),
      })
      .optional(),
    faq: z
      .array(z.object({ question: text(10, 'FAQ question'), answer: text(30, 'FAQ answer') }))
      .default([]),
    related_pages: z.array(relatedPageSchema).default([]),
  })
  .passthrough()
  .refine((s) => s.pain_section || s.solution_section, {
    message: 'Add a pain_section or a solution_section; a hero alone is not a page',
  });

export const pageDraftSchema = z
  .object({
    page_type: z.enum(Object.keys(AUTHORABLE_PAGE_TYPES) as [AuthorablePageType, ...AuthorablePageType[]], {
      errorMap: () => ({ message: 'Choose a page type' }),
    }),
    dimension_ids: z.array(z.string().trim().min(1)).min(1, 'Choose the page dimensions'),
    seo_title: text(15, 'SEO title').max(70, 'SEO title must be 70 characters or fewer'),
    seo_description: text(50, 'SEO description').max(160, 'SEO description must be 160 characters or fewer'),
    page_schema: pageContentSchema,
  })
  .superRefine((d, ctx) => {
    const def = AUTHORABLE_PAGE_TYPES[d.page_type];
    if (d.dimension_ids.length !== def.dimensions.length) {
      ctx.addIssue({ code: 'custom', path: ['dimension_ids'], message: `${d.page_type} needs ${def.dimensions.length} dimension(s)` });
      return;
    }
    if (!buildPageIdentity(d.page_type, d.dimension_ids)) {
      ctx.addIssue({ code: 'custom', path: ['dimension_ids'], message: 'A chosen dimension is not in the taxonomy' });
    }
  });

export type PageDraftInput = z.input<typeof pageDraftSchema>;

export interface PseoPageRow {
  page_type: AuthorablePageType;
  combination_key: string;
  dimension_1: string;
  dimension_2: string;
  dimension_3: null;
  seo_title: string;
  seo_description: string;
  canonical_url: string;
  page_schema: Record<string, unknown>;
  is_published: false;
  generation_status: 'review_needed';
  generation_model: 'manual';
  qc_failures: string[] | null;
}

export type DraftValidation =
  | { ok: true; row: PseoPageRow; wordCount: number; warnings: string[] }
  | { ok: false; errors: string[] };

/**
 * Validate an authored draft and, if it passes, build the pseo_pages row. A
 * saved draft is never published; publishing is a separate admin action.
 */
export function validatePseoPageDraft(input: unknown): DraftValidation {
  const parsed = pageDraftSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map((i) => (i.path.length ? `${i.path.join('.')}: ${i.message}` : i.message)),
    };
  }
  const d = parsed.data;
  const identity = buildPageIdentity(d.page_type, d.dimension_ids)!;
  const self = d.page_schema.related_pages.find((r) => normalizePath(r.url) === identity.canonical_url);
  if (self) return { ok: false, errors: ['page_schema.related_pages: a page cannot list itself as related'] };

  const wordCount = countUniqueCopyWords(d.page_schema);
  const warnings =
    wordCount < PSEO_MIN_UNIQUE_WORDS
      ? [`${wordCount} words of page copy, under the ${PSEO_MIN_UNIQUE_WORDS}-word bar: the page will render noindex`]
      : [];

  return {
    ok: true,
    wordCount,
    warnings,
    row: {
      page_type: d.page_type,
      ...identity,
      dimension_3: null,
      seo_title: d.seo_title,
      seo_description: d.seo_description,
      page_schema: d.page_schema as Record<string, unknown>,
      is_published: false,
      generation_status: 'review_needed',
      generation_model: 'manual',
      qc_failures: warnings.length ? warnings : null,
    },
  };
}

/**
 * Re-check a stored page before it goes live. Returns the reasons it cannot
 * be published; an empty list means it can.
 */
export function publishBlockers(page: {
  page_type: string;
  dimension_1: string;
  dimension_2: string;
  seo_title: string;
  seo_description: string;
  page_schema: unknown;
}): string[] {
  const def = AUTHORABLE_PAGE_TYPES[page.page_type as AuthorablePageType];
  if (!def) return [`${page.page_type} pages cannot be published from the editor`];
  const ids = [page.dimension_1, page.dimension_2].slice(0, def.dimensions.length);
  const result = validatePseoPageDraft({
    page_type: page.page_type,
    dimension_ids: ids,
    seo_title: page.seo_title,
    seo_description: page.seo_description,
    page_schema: page.page_schema,
  });
  return result.ok ? [] : result.errors;
}

/**
 * Words of page-specific copy: hero, pain, solution, how-it-works, comparison
 * points and FAQ. Pricing, the unlimited-users callout, SEO fields and related
 * links repeat across every page, so they do not count.
 */
export function countUniqueCopyWords(schema: unknown): number {
  if (!schema || typeof schema !== 'object') return 0;
  const s = schema as Record<string, unknown>;
  const diff = (s.differentiation ?? {}) as Record<string, unknown>;
  const parts: unknown[] = [
    s.hero,
    s.pain_section,
    s.solution_section,
    s.how_it_works,
    diff.vs_spreadsheets,
    diff.vs_competitor,
    s.faq,
  ];
  const strings: string[] = [];
  const collect = (v: unknown) => {
    if (typeof v === 'string') strings.push(v);
    else if (Array.isArray(v)) v.forEach(collect);
    else if (v && typeof v === 'object') Object.values(v).forEach(collect);
  };
  parts.forEach(collect);
  return strings.join(' ').split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w)).length;
}

export interface RelatedLink {
  title: string;
  url: string;
  relationship?: string;
}

/** Keep only related links whose target is a published pSEO page. */
export function filterPublishedLinks<T extends RelatedLink>(links: T[] | undefined, publishedUrls: Set<string>): T[] {
  if (!links?.length) return [];
  const published = new Set([...publishedUrls].map(normalizePath));
  return links.filter((l) => typeof l.url === 'string' && isPseoPath(l.url) && published.has(normalizePath(l.url)));
}

/** The pSEO URLs a page's related_pages point at, for the published lookup. */
export function relatedPseoUrls(links: RelatedLink[] | undefined): string[] {
  return [...new Set((links ?? []).map((l) => (typeof l.url === 'string' ? normalizePath(l.url) : '')).filter(isPseoPath))];
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

/**
 * Home > section > page. The section crumb is text only: /software and
 * /compare have no index route, and a link there renders the 404 page.
 */
export function buildBreadcrumbs(page: { page_type: string; seo_title: string }): BreadcrumbItem[] {
  const section =
    page.page_type === 'comparison' ? 'Compare' : page.page_type === 'feature_contractor' ? 'Features' : 'Software';
  return [{ label: 'Home', href: '/' }, { label: section }, { label: page.seo_title }];
}

/** schema.org BreadcrumbList for the linked crumbs plus the page itself. */
export function breadcrumbListSchema(
  items: BreadcrumbItem[],
  pageUrl: string,
  toAbsolute: (path: string) => string,
): Record<string, unknown> {
  const listed = items.filter((i, idx) => i.href || idx === items.length - 1);
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: listed.map((item, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: item.label,
      item: toAbsolute(item.href ?? pageUrl),
    })),
  };
}

/**
 * A starting point for a new page, filled from the taxonomy. The copy is
 * deliberately thin: it names the combination and leaves the substance to the
 * author, so an unedited template stays under the word bar and renders noindex.
 */
export function buildDraftTemplate(pageType: AuthorablePageType, dimensionIds: string[]): Record<string, unknown> {
  const def = AUTHORABLE_PAGE_TYPES[pageType];
  const names = def.dimensions.map((dim, i) => TAXONOMY[dim][dimensionIds[i]]?.display_name ?? '');
  const subject = pageType === 'comparison' ? `Brikly vs ${names[0]}` : names.join(' - ');
  return {
    hero: {
      headline: subject,
      subheadline: '',
      intro: '',
      proof_point: '',
      cta_primary: 'Request a Demo',
      cta_secondary: 'See Pricing',
    },
    pain_section: {
      section_title: '',
      pain_points: [{ title: '', description: '', consequence: '' }],
    },
    solution_section: {
      section_title: '',
      features: [{ name: '', description: '', contractor_specific_benefit: '' }],
    },
    faq: [],
    related_pages: [],
  };
}
