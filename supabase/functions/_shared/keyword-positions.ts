/**
 * SERP position tracking for check-keyword-positions.
 *
 * Without SERP_API_KEY the function used to invent a ranking for 70% of
 * keywords (Math.floor(Math.random() * 50) + 1), plus a random search volume
 * and difficulty for every keyword even when the key WAS set, and saved all of
 * it to seo_serp_positions next to real rows. A position nobody measured reads
 * exactly like one somebody did, so this module has no simulated path: no key
 * means an error the admin can act on, and a field with no source is null.
 *
 * Pure on purpose, so vitest can load it.
 */

export const SERP_NOT_CONFIGURED_MESSAGE =
  'Keyword position tracking is not configured. Set SERP_API_KEY (serpapi.com) in the Supabase function secrets to check live rankings.';

export const SERP_NOT_CONFIGURED_CODE = 'SERP_NOT_CONFIGURED';

/**
 * The response for a missing key. 500 matches this function's other
 * server-side failures and the sibling SEO functions (bing-search-api,
 * google-analytics-api) that answer a missing key the same way.
 */
export function serpNotConfiguredResponse(corsHeaders: Record<string, string>): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: SERP_NOT_CONFIGURED_MESSAGE,
      code: SERP_NOT_CONFIGURED_CODE,
      timestamp: new Date().toISOString(),
    }),
    { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
}

export function isSerpConfigured(apiKey: string | null | undefined): apiKey is string {
  return typeof apiKey === 'string' && apiKey.trim().length > 0;
}

export interface OrganicResult {
  link?: unknown;
}

/**
 * 1-based position of the first organic result on `domain`, matched on the
 * result's hostname (exact or a subdomain), so "example.com" does not match
 * "notexample.com" or a URL that only mentions it in a query string.
 */
export function findDomainPosition(
  organic: OrganicResult[] | null | undefined,
  domain: string,
): { position: number | null; url: string | null } {
  const want = domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  if (!want || !Array.isArray(organic)) return { position: null, url: null };
  for (let i = 0; i < organic.length; i++) {
    const link = organic[i]?.link;
    if (typeof link !== 'string') continue;
    let host: string;
    try {
      host = new URL(link).hostname.toLowerCase().replace(/^www\./, '');
    } catch {
      continue;
    }
    if (host === want || host.endsWith(`.${want}`)) return { position: i + 1, url: link };
  }
  return { position: null, url: null };
}

/** Typical organic click-through rate (%) by position. An estimate, labelled as one. */
const CTR_BY_POSITION: Record<number, number> = {
  1: 31.7, 2: 24.7, 3: 18.7, 4: 13.6, 5: 9.5,
  6: 6.3, 7: 4.2, 8: 3.2, 9: 2.6, 10: 2.4,
};

export function estimateCtr(position: number | null): number {
  if (position === null) return 0;
  return CTR_BY_POSITION[position] ?? (position <= 20 ? 1.0 : 0.5);
}

export interface KeywordPosition {
  keyword: string;
  position: number | null;
  url: string | null;
  ctr: number;
}

/**
 * The row shape SEOManager reads (current_position, search_volume,
 * estimated_traffic, position_change). search_volume and estimated_traffic
 * are null because SerpApi's search endpoint does not report volume; they
 * were random numbers before.
 */
export function toPositionRecord(
  r: KeywordPosition,
  ctx: { domain: string; country: string; device: string },
) {
  return {
    keyword: r.keyword,
    domain: ctx.domain,
    country: ctx.country,
    device: ctx.device,
    current_position: r.position,
    previous_position: null,
    position_change: 0,
    ranking_url: r.url,
    search_volume: null,
    estimated_traffic: null,
    ctr: r.ctr,
    serp_features: [],
    competitors: [],
  };
}

export function summarizePositions(results: KeywordPosition[]) {
  const ranked = results.filter((r): r is KeywordPosition & { position: number } => r.position !== null);
  return {
    total_keywords: results.length,
    ranking_keywords: ranked.length,
    avg_position: ranked.length > 0
      ? Math.round(ranked.reduce((sum, r) => sum + r.position, 0) / ranked.length)
      : null,
    top_10_keywords: ranked.filter((r) => r.position <= 10).length,
    top_3_keywords: ranked.filter((r) => r.position <= 3).length,
    // No search volume source, so no traffic estimate. Was a sum of random numbers.
    total_estimated_traffic: null,
  };
}

/**
 * Columns seo_serp_positions actually has: 20251107000000_enterprise_seo_features
 * plus site_id (NOT NULL on the live database; added nullable, IF NOT EXISTS,
 * by 20260924150000 so a replayed history has it too). toPositionRecord's
 * shape is what SEOManager reads from the response, and none of
 * current_position, ranking_url, domain, country, previous_position,
 * position_change, search_volume, ctr or serp_features exists on the table, so
 * inserting it failed on every call. The row below is the storage mapping.
 */
export const SERP_POSITION_COLUMNS = [
  'id', 'keyword_id', 'company_id', 'site_id',
  'keyword', 'search_engine', 'location', 'device', 'language',
  'position', 'url', 'title', 'description',
  'has_featured_snippet', 'featured_snippet_type', 'has_knowledge_panel',
  'has_people_also_ask', 'has_image_pack', 'has_video_carousel', 'has_local_pack',
  'competitors', 'estimated_traffic', 'estimated_value',
  'checked_at', 'created_at',
] as const;

export type SerpPositionColumn = (typeof SERP_POSITION_COLUMNS)[number];

export interface SerpRowContext {
  country: string;
  device: string;
  siteId: string | null;
}

/** The seo_serp_positions row for one checked keyword. */
export function toSerpPositionRow(r: KeywordPosition, ctx: SerpRowContext): Partial<Record<SerpPositionColumn, unknown>> {
  return {
    site_id: ctx.siteId,
    keyword: r.keyword,
    search_engine: 'google',
    location: ctx.country,
    device: ctx.device,
    position: r.position,
    url: r.url,
    // No search volume, so no traffic estimate (see toPositionRecord).
    estimated_traffic: null,
    competitors: [],
  };
}

/** SERP feature names track-serp-features checks, mapped to their boolean column. */
export const SERP_FEATURE_COLUMNS: Record<string, SerpPositionColumn> = {
  featured_snippet: 'has_featured_snippet',
  knowledge_graph: 'has_knowledge_panel',
  people_also_ask: 'has_people_also_ask',
  image_pack: 'has_image_pack',
  video_carousel: 'has_video_carousel',
  local_pack: 'has_local_pack',
};

/**
 * The seo_serp_positions row for a track-serp-features run. It used to insert
 * domain, country, current_position, serp_features and owned_features, none of
 * which exist. Features without a column (shopping_results, news_results, ...)
 * and ownership stay in the response only.
 */
export function toSerpFeaturesRow(
  input: {
    keyword: string;
    presentFeatures: string[];
    position: number | null;
    url: string | null;
  },
  ctx: SerpRowContext,
): Partial<Record<SerpPositionColumn, unknown>> {
  const row: Partial<Record<SerpPositionColumn, unknown>> = {
    site_id: ctx.siteId,
    keyword: input.keyword,
    search_engine: 'google',
    location: ctx.country,
    device: ctx.device,
    position: input.position,
    url: input.url,
    competitors: [],
  };
  for (const [feature, column] of Object.entries(SERP_FEATURE_COLUMNS)) {
    row[column] = input.presentFeatures.includes(feature);
  }
  return row;
}

/**
 * The response entries: the display shape SEOManager reads, over the stored
 * row when there is one (so `id`, `checked_at` and the table columns are
 * added, never replacing a display key).
 */
export function mergeSavedPositions<T extends Record<string, unknown>>(
  display: T[],
  saved: Array<Record<string, unknown>> | null | undefined,
): Array<T & Record<string, unknown>> {
  const rows = Array.isArray(saved) ? saved : [];
  return display.map((d, i) => {
    const byIndex = rows[i];
    const match = byIndex && byIndex.keyword === d.keyword
      ? byIndex
      : rows.find((row) => row.keyword === d.keyword);
    return { ...(match ?? {}), ...d };
  });
}
