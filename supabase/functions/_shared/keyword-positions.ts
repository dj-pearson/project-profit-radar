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
