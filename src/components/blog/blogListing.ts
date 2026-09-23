/**
 * Pure listing logic for the public blog index and category pages (US-384):
 * which posts are listable, which category a post falls in, and how a list
 * splits into pages. Kept free of React and Supabase so it can be tested
 * directly.
 *
 * blog_posts has no category column, so categories are derived from the
 * post's title and slug against the keyword lists in blogCategories.json.
 * scripts/generate-sitemap.js reads the same JSON to list the category
 * pages. A post can land in several categories, or in none (it still shows
 * on the index).
 */
import categoryData from './blogCategories.json';
import { BLOG_POST_CANONICAL_PREFIX } from './blogPaths';

export const SITE_ORIGIN = 'https://brikly.net';
/** scripts/generate-rss.js writes the feed here (and a copy at /rss.xml). */
export const RSS_FEED_PATH = '/feed.xml';
export const BLOG_PAGE_SIZE = 9;
export const BLOG_INDEX_PATH = BLOG_POST_CANONICAL_PREFIX;
export const BLOG_CATEGORY_PREFIX = `${BLOG_POST_CANONICAL_PREFIX}/category`;

export interface BlogCategory {
  slug: string;
  name: string;
  description: string;
  keywords: string[];
}

export const BLOG_CATEGORIES: readonly BlogCategory[] = categoryData;

export interface BlogListingPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  featured_image_url: string | null;
  published_at: string | null;
  created_at: string;
  seo_description: string | null;
  status?: string;
}

/** Hand-written guide pages that live at /resources/<slug> as their own routes. */
export interface CuratedGuide {
  title: string;
  description: string;
  readTime: string;
  author: string;
  slug: string;
  label: string;
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** "job cost*" matches "job costing"; "vs" matches the word vs only. */
export function keywordPattern(keyword: string): RegExp {
  const prefix = keyword.endsWith('*');
  const words = (prefix ? keyword.slice(0, -1) : keyword).trim().split(/\s+/).map(escapeRegExp);
  return new RegExp(`\\b${words.join('\\s+')}${prefix ? '\\w*' : '\\b'}`, 'i');
}

const patternCache = new Map<string, RegExp[]>();
const patternsFor = (category: BlogCategory) => {
  let p = patternCache.get(category.slug);
  if (!p) {
    p = category.keywords.map(keywordPattern);
    patternCache.set(category.slug, p);
  }
  return p;
};

/** Slugs of every category whose keywords match the item's title or slug. */
export function categoriesFor(
  item: { title: string; slug: string },
  categories: readonly BlogCategory[] = BLOG_CATEGORIES,
): string[] {
  const haystack = `${item.title} ${item.slug.replace(/[-_]+/g, ' ')}`;
  return categories.filter((c) => patternsFor(c).some((re) => re.test(haystack))).map((c) => c.slug);
}

export function getCategory(slug: string | undefined): BlogCategory | undefined {
  return slug ? BLOG_CATEGORIES.find((c) => c.slug === slug) : undefined;
}

export function inCategory<T extends { title: string; slug: string }>(items: readonly T[], categorySlug: string): T[] {
  const category = getCategory(categorySlug);
  if (!category) return [];
  return items.filter((item) => categoriesFor(item, [category]).length > 0);
}

/**
 * Published, already live, newest first. The query already asks for
 * status=published; this is the same rule applied to whatever came back.
 */
export function listablePosts<T extends BlogListingPost>(posts: readonly T[], now: Date = new Date()): T[] {
  const ts = (p: BlogListingPost) => new Date(p.published_at || p.created_at).getTime();
  return posts
    .filter((p) => (p.status === undefined || p.status === 'published') && !!p.slug)
    .filter((p) => !p.published_at || new Date(p.published_at).getTime() <= now.getTime())
    .sort((a, b) => ts(b) - ts(a));
}

/**
 * Page number from a :page route param. undefined means page 1; anything
 * that isn't a positive integer without leading zeros is null (invalid).
 */
export function parsePageParam(raw: string | undefined): number | null {
  if (raw === undefined) return 1;
  return /^[1-9]\d{0,5}$/.test(raw) ? Number(raw) : null;
}

export interface Page<T> {
  items: T[];
  page: number;
  totalPages: number;
  totalItems: number;
  /** The requested page is past the last one. */
  outOfRange: boolean;
}

export function paginate<T>(items: readonly T[], page: number, pageSize: number = BLOG_PAGE_SIZE): Page<T> {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const outOfRange = page > totalPages;
  const start = (page - 1) * pageSize;
  return {
    items: outOfRange ? [] : items.slice(start, start + pageSize),
    page,
    totalPages,
    totalItems: items.length,
    outOfRange,
  };
}

/** /resources, /resources/page/2, /resources/category/x/page/3 */
export function listingPath(base: string, page: number): string {
  return page <= 1 ? base : `${base}/page/${page}`;
}

/** Page numbers to show: first, last, and a window around the current one. */
export function pageWindow(page: number, totalPages: number): (number | 'gap')[] {
  const wanted = new Set([1, totalPages, page - 1, page, page + 1].filter((p) => p >= 1 && p <= totalPages));
  const sorted = [...wanted].sort((a, b) => a - b);
  const out: (number | 'gap')[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push('gap');
    out.push(p);
  });
  return out;
}

export const categoryPath = (slug: string): string => `${BLOG_CATEGORY_PREFIX}/${encodeURIComponent(slug)}`;

export const CURATED_GUIDES: readonly CuratedGuide[] = [
  {
    title: 'Best Construction Management Software for Small Business (2025)',
    description: 'Complete guide to choosing construction management software for small contractors. Compare features, pricing, and ROI.',
    readTime: '12 min read',
    author: 'Brikly Team',
    slug: 'best-construction-management-software-small-business-2025',
    label: 'Software Guides',
  },
  {
    title: 'Job Costing in Construction: Setup Guide & Common Mistakes',
    description: 'Master job costing with our step-by-step guide. Learn to track costs, improve margins, and avoid costly mistakes.',
    readTime: '8 min read',
    author: 'Brikly Team',
    slug: 'job-costing-construction-setup-guide',
    label: 'Financial Management',
  },
  {
    title: 'OSHA Safety Logs: Digital Playbook for Construction Teams',
    description: 'Complete guide to OSHA compliance. Templates, workflows, and digital tools to keep your team safe and compliant.',
    readTime: '15 min read',
    author: 'Brikly Team',
    slug: 'osha-safety-logs-digital-playbook',
    label: 'Safety',
  },
  {
    title: 'Construction Scheduling Software: Stop Project Delays',
    description: 'Simple scheduling rules that prevent delays. Learn how small contractors can improve project timelines.',
    readTime: '10 min read',
    author: 'Brikly Team',
    slug: 'construction-scheduling-software-prevent-delays',
    label: 'Project Management',
  },
  {
    title: 'Construction Daily Logs: What to Track and Why It Pays',
    description: 'Essential guide to daily logs that reduce rework and improve project outcomes. Templates and best practices included.',
    readTime: '9 min read',
    author: 'Brikly Team',
    slug: 'construction-daily-logs-best-practices',
    label: 'Field Management',
  },
  {
    title: 'Procore vs Brikly: Which is Better for Small GC Teams?',
    description: 'Honest comparison of Procore and Brikly for small contractors. Features, pricing, and ease of use compared.',
    readTime: '6 min read',
    author: 'Brikly Team',
    slug: 'procore-vs-brikly-small-contractors',
    label: 'Comparisons',
  },
  {
    title: 'QuickBooks Integration Guide',
    description: 'Step-by-step guide to integrate QuickBooks with construction management software for automated accounting.',
    readTime: '8 min read',
    author: 'Brikly Team',
    slug: 'quickbooks-integration-guide',
    label: 'Integration',
  },
  {
    title: 'Construction Mobile App Guide',
    description: 'Best construction mobile apps for field teams. Compare features and find the perfect field management solution.',
    readTime: '10 min read',
    author: 'Brikly Team',
    slug: 'construction-mobile-app-guide',
    label: 'Mobile',
  },
  {
    title: 'Brikly vs Buildertrend: Feature & Pricing Comparison',
    description: 'Side-by-side comparison of Brikly and Buildertrend for residential and commercial contractors.',
    readTime: '7 min read',
    author: 'Brikly Team',
    slug: 'brikly-vs-buildertrend-comparison',
    label: 'Comparisons',
  },
];

const guide = (slug: string) => {
  const g = CURATED_GUIDES.find((x) => x.slug === slug);
  if (!g) throw new Error(`unknown curated guide ${slug}`);
  return g;
};

/** The grouped guide sections the index has always shown on its first page. */
export const CURATED_SECTIONS: readonly { title: string; guides: CuratedGuide[] }[] = [
  {
    title: 'Construction Management Guides',
    guides: [
      'best-construction-management-software-small-business-2025',
      'job-costing-construction-setup-guide',
      'osha-safety-logs-digital-playbook',
      'construction-scheduling-software-prevent-delays',
      'construction-daily-logs-best-practices',
    ].map(guide),
  },
  {
    title: 'Software Comparisons',
    guides: [
      'procore-vs-brikly-small-contractors',
      'quickbooks-integration-guide',
      'construction-mobile-app-guide',
      'brikly-vs-buildertrend-comparison',
    ].map(guide),
  },
];
