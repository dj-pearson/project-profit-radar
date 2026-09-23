import { describe, it, expect } from 'vitest';
import {
  PSEO_MIN_UNIQUE_WORDS,
  buildBreadcrumbs,
  buildDraftTemplate,
  buildPageIdentity,
  countUniqueCopyWords,
  filterPublishedLinks,
  publishBlockers,
  validatePseoPageDraft,
} from '../pageAuthoring';

const words = (n: number) => Array.from({ length: n }, (_, i) => `word${i}`).join(' ');

function validDraft(overrides: Record<string, unknown> = {}) {
  return {
    page_type: 'contractor_pain',
    dimension_ids: ['electrical', 'cash-flow'],
    seo_title: 'Cash Flow Software for Electrical Contractors',
    seo_description: 'Track retainage, labor burn and material costs per job so an electrical shop sees cash gaps weeks ahead.',
    page_schema: {
      hero: {
        headline: 'Cash flow for electrical contractors',
        subheadline: 'See which jobs are eating your float',
        intro: 'Electrical shops carry labor for weeks before a draw clears. Brikly shows the gap per job.',
        cta_primary: 'Request a Demo',
        cta_secondary: 'See Pricing',
      },
      pain_section: {
        section_title: 'Where the money goes',
        pain_points: [{ title: 'Retainage', description: 'Ten percent held on every draw until closeout.', consequence: '' }],
      },
      faq: [],
      related_pages: [],
    },
    ...overrides,
  };
}

describe('buildPageIdentity', () => {
  it('builds the canonical URL from taxonomy slugs, matching the routed shape', () => {
    const id = buildPageIdentity('contractor_pain', ['electrical', 'cash-flow']);
    expect(id?.canonical_url).toMatch(/^\/software\/electrical-contractor\/[a-z-]+$/);
    expect(id?.combination_key).toBe('contractor_pain::electrical::cash-flow');
  });

  it('builds /compare/:slug for a comparison and fills the NOT NULL dimension_2', () => {
    const id = buildPageIdentity('comparison', ['vs-procore']);
    expect(id?.canonical_url).toBe('/compare/vs-procore');
    expect(id?.dimension_2).toBe('brikly');
  });

  it('refuses an id that is not in the taxonomy', () => {
    expect(buildPageIdentity('contractor_pain', ['electrical', 'nope'])).toBeNull();
  });
});

describe('validatePseoPageDraft', () => {
  it('accepts a complete draft and saves it unpublished for review', () => {
    const result = validatePseoPageDraft(validDraft());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.row.is_published).toBe(false);
    expect(result.row.generation_status).toBe('review_needed');
    expect(result.row.canonical_url.startsWith('/software/electrical-contractor/')).toBe(true);
  });

  it.each([
    ['seo_title', { seo_title: '' }],
    ['seo_description', { seo_description: 'too short' }],
    ['page_type', { page_type: 'feature_contractor' }],
    ['dimension_ids', { dimension_ids: ['electrical'] }],
  ])('rejects a draft with a bad %s', (field, override) => {
    const result = validatePseoPageDraft(validDraft(override));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => e.startsWith(field))).toBe(true);
  });

  it('rejects a draft with no page content', () => {
    const result = validatePseoPageDraft(validDraft({ page_schema: undefined }));
    expect(result.ok).toBe(false);
  });

  it('rejects a hero with empty required fields', () => {
    const d = validDraft();
    (d.page_schema as { hero: Record<string, string> }).hero.intro = '';
    const result = validatePseoPageDraft(d);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => e.startsWith('page_schema.hero.intro'))).toBe(true);
  });

  it('rejects a page that is only a hero', () => {
    const d = validDraft();
    delete (d.page_schema as Record<string, unknown>).pain_section;
    const result = validatePseoPageDraft(d);
    expect(result.ok).toBe(false);
  });

  it('rejects the unedited template', () => {
    const result = validatePseoPageDraft(
      validDraft({ page_schema: buildDraftTemplate('contractor_pain', ['electrical', 'cash-flow']) }),
    );
    expect(result.ok).toBe(false);
  });

  it('rejects related links that are not pSEO URLs, or that point at itself', () => {
    const d = validDraft();
    (d.page_schema as Record<string, unknown>).related_pages = [
      { title: 'Pricing', url: '/pricing', relationship: '', page_type: '' },
    ];
    expect(validatePseoPageDraft(d).ok).toBe(false);

    const self = buildPageIdentity('contractor_pain', ['electrical', 'cash-flow'])!.canonical_url;
    (d.page_schema as Record<string, unknown>).related_pages = [
      { title: 'Itself', url: self, relationship: '', page_type: '' },
    ];
    expect(validatePseoPageDraft(d).ok).toBe(false);
  });

  it('warns, and marks qc_failures, when the copy is under the word bar', () => {
    const result = validatePseoPageDraft(validDraft());
    expect(result.ok && result.warnings.length).toBe(1);
    expect(result.ok && result.row.qc_failures?.length).toBe(1);
  });

  it('publishBlockers re-validates a stored row', () => {
    const ok = validatePseoPageDraft(validDraft());
    if (!ok.ok) throw new Error('fixture invalid');
    expect(publishBlockers(ok.row)).toEqual([]);
    expect(publishBlockers({ ...ok.row, seo_title: '' }).length).toBeGreaterThan(0);
    expect(publishBlockers({ ...ok.row, page_type: 'feature_contractor' }).length).toBeGreaterThan(0);
  });
});

describe('countUniqueCopyWords', () => {
  it('counts page copy and ignores pricing and SEO boilerplate', () => {
    const schema = {
      hero: { headline: words(10) },
      pricing: { headline: words(500) },
      seo: { title: words(500) },
      faq: [{ question: words(5), answer: words(5) }],
    };
    expect(countUniqueCopyWords(schema)).toBe(20);
    expect(countUniqueCopyWords({ hero: { intro: words(PSEO_MIN_UNIQUE_WORDS) } })).toBe(PSEO_MIN_UNIQUE_WORDS);
  });
});

describe('link rules', () => {
  const related = [
    { title: 'Published', url: '/software/electrical-contractor/time-tracking', relationship: '' },
    { title: 'Draft', url: '/software/electrical-contractor/invoicing-software', relationship: '' },
    { title: 'Missing', url: '/compare/vs-nobody', relationship: '' },
    { title: 'Not pSEO', url: '/pricing', relationship: '' },
    { title: 'External', url: 'https://example.com/software/a/b', relationship: '' },
  ];

  it('keeps only related links whose target is a published page', () => {
    const published = new Set(['/software/electrical-contractor/time-tracking/']);
    expect(filterPublishedLinks(related, published).map((l) => l.title)).toEqual(['Published']);
    expect(filterPublishedLinks(related, new Set())).toEqual([]);
    expect(filterPublishedLinks(undefined, published)).toEqual([]);
  });

  it('breadcrumbs link only to Home: /software and /compare have no route', () => {
    for (const page_type of ['contractor_pain', 'comparison', 'feature_contractor']) {
      const crumbs = buildBreadcrumbs({ page_type, seo_title: 'T' });
      expect(crumbs.filter((c) => c.href).map((c) => c.href)).toEqual(['/']);
    }
  });
});
