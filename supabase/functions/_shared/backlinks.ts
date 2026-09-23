/**
 * Backlink sync for sync-backlinks.
 *
 * With no backlink API configured (or the provider call failing) the function
 * used to upsert five hard-coded example.com-style backlinks into seo_backlinks
 * with random follow/spam/first_seen/status values, and report them as a
 * successful sync. A link nobody found reads exactly like one somebody did, so
 * there is no simulated path: no live data means an error saying why.
 *
 * Pure on purpose, so vitest can load it.
 */

export const BACKLINKS_NOT_CONFIGURED_CODE = 'BACKLINKS_NOT_CONFIGURED';
export const BACKLINKS_PROVIDER_FAILED_CODE = 'BACKLINKS_PROVIDER_FAILED';

export const BACKLINKS_NOT_CONFIGURED_MESSAGE =
  'Backlink sync is not configured. Set AHREFS_API_KEY in the Supabase function secrets to sync live backlinks (the Moz provider is not implemented).';

/** Moz credentials exist as secrets, but the Moz call was never written. */
export const MOZ_NOT_IMPLEMENTED_MESSAGE =
  'MOZ_ACCESS_ID / MOZ_SECRET_KEY are set, but the Moz backlink provider is not implemented. Use provider "ahrefs" with AHREFS_API_KEY.';

export function isProviderConfigured(provider: string, ahrefsApiKey: string | null | undefined): boolean {
  return provider === 'ahrefs' && typeof ahrefsApiKey === 'string' && ahrefsApiKey.trim().length > 0;
}

/**
 * 500 like check-keyword-positions' missing SERP key. `providerError` set means
 * the provider was configured but the call failed.
 */
export function backlinksUnavailableResponse(
  corsHeaders: Record<string, string>,
  providerError?: string | null,
  mozCredentialsSet = false,
): Response {
  const failed = typeof providerError === 'string' && providerError.length > 0;
  const notConfigured = mozCredentialsSet ? MOZ_NOT_IMPLEMENTED_MESSAGE : BACKLINKS_NOT_CONFIGURED_MESSAGE;
  return new Response(
    JSON.stringify({
      success: false,
      error: failed ? `Backlink provider request failed: ${providerError}` : notConfigured,
      code: failed ? BACKLINKS_PROVIDER_FAILED_CODE : BACKLINKS_NOT_CONFIGURED_CODE,
      timestamp: new Date().toISOString(),
    }),
    { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
}
