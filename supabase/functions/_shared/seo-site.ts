/**
 * site_id for rows the root_admin SEO functions write.
 *
 * On the live database seo_serp_positions.site_id is NOT NULL (the generated
 * types say so), and check-keyword-positions / track-serp-features never set
 * it, so every insert failed. The value is resolved the way
 * provision_company_for_current_user (20260903010000) resolves a site: the
 * caller's own user_profiles.site_id, else the active 'brikly' site, else the
 * oldest active site. null when none of those exists; the insert then fails on
 * the live NOT NULL and the function reports stored/saved: false, which is the
 * truth.
 *
 * Every lookup tolerates an error (a database without site_id or without a
 * sites table), so this never turns a working check into a failed one.
 */

export interface SiteRow {
  id: string;
  key?: string | null;
  is_active?: boolean | null;
  created_at?: string | null;
}

/** The pure choice, separated so vitest can check the order. */
export function pickSiteId(profileSiteId: string | null | undefined, sites: SiteRow[]): string | null {
  if (typeof profileSiteId === 'string' && profileSiteId) return profileSiteId;
  const active = sites.filter((s) => s && s.is_active !== false && typeof s.id === 'string');
  const brikly = active.find((s) => s.key === 'brikly');
  if (brikly) return brikly.id;
  const oldest = [...active].sort((a, b) => String(a.created_at ?? '').localeCompare(String(b.created_at ?? '')))[0];
  return oldest?.id ?? null;
}

type Result = { data: unknown; error: unknown };
interface SiteLookupClient {
  from(table: string): {
    select(columns: string): {
      eq(column: string, value: unknown): PromiseLike<Result> & { maybeSingle(): PromiseLike<Result> };
    };
  };
}

/** `supabase` is a supabase-js client; typed loosely so any client version fits. */
export async function resolveSeoSiteId(supabase: unknown, userId: string): Promise<string | null> {
  const client = supabase as SiteLookupClient;
  let profileSiteId: string | null = null;
  try {
    const { data, error } = await client
      .from('user_profiles')
      .select('site_id')
      .eq('id', userId)
      .maybeSingle();
    const siteId = (data as { site_id?: unknown } | null)?.site_id;
    if (!error && typeof siteId === 'string' && siteId) profileSiteId = siteId;
  } catch {
    // no site_id column on this database
  }
  if (profileSiteId) return profileSiteId;

  try {
    const { data, error } = await client
      .from('sites')
      .select('id, key, is_active, created_at')
      .eq('is_active', true);
    if (!error && Array.isArray(data)) return pickSiteId(null, data as SiteRow[]);
  } catch {
    // no sites table on this database
  }
  return null;
}
