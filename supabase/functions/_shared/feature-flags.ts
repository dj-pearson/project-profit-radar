/**
 * Runtime feature flags and kill switches (US-281).
 *
 * The registry below is the only place a flag exists. A row in
 * public.feature_flags (20260924160000_feature_flags.sql) overrides it at
 * runtime; a row whose key is not registered here is ignored. The web app
 * reads the same table through src/lib/featureFlags.ts, which mirrors this
 * registry - feature-flags.test.ts fails if the two drift.
 *
 * Every flag names two values, and they are separate on purpose:
 *   - `default`: the answer when no row exists (the normal state);
 *   - `onReadError`: the answer when the table cannot be read. This is the
 *     flag's safe side, and `safeSide` says why in a sentence. A flag guarding
 *     a new money path fails closed; a kill switch on something customers
 *     already rely on fails open, because a database hiccup should not switch
 *     off a working integration for every company.
 *
 * `removeBy` is when the flag should have been deleted (docs/FEATURE_FLAGS.md,
 * lifecycle). The test fails after that date, so a flag cannot quietly become
 * a permanent dead branch: someone has to delete it or push the date out in a
 * reviewed change that says why.
 *
 * Pure apart from the one query, so vitest can load it.
 */

export interface FeatureFlagDefinition {
  description: string;
  owner: string;
  addedOn: string; // YYYY-MM-DD
  removeBy: string; // YYYY-MM-DD
  default: boolean;
  onReadError: boolean;
  safeSide: string;
}

export const FEATURE_FLAGS = {
  // US-281 reference flag. Turn it off (global row, enabled = false) when a
  // QuickBooks change is corrupting imported data or Intuit is misbehaving;
  // quickbooks-sync then answers 503 before it touches tokens or the API.
  'quickbooks.sync': {
    description: 'QuickBooks sync (quickbooks-sync edge function and the Sync buttons in Settings > Integrations).',
    owner: 'djpearson',
    addedOn: '2026-09-24',
    removeBy: '2027-09-24',
    default: true,
    onReadError: true,
    safeSide:
      'Fails open. Customers already depend on sync, and if the flag table cannot be read the sync cannot write its own rows either, so failing closed would only add an outage.',
  },
  // US-335. Each of these turns on enforcement that would refuse something an
  // existing customer can do today, so each is dark until the owner switches
  // it on (docs/FEATURE_FLAGS.md, "Entitlement enforcement"). Off - no row, or
  // an unreadable table - means "not enforced", which is the side that never
  // locks a paying customer out.
  'entitlements.plan_features': {
    description: 'Plan-tier feature gates: QuickBooks sync needs Professional, creating an API key needs Enterprise, and the public API projects endpoint counts against the project limit.',
    owner: 'djpearson',
    addedOn: '2026-09-23',
    removeBy: '2027-03-31',
    default: false,
    onReadError: false,
    safeSide:
      'Fails open. Starter companies use QuickBooks sync today; refusing it because the flag table could not be read would take away a working integration for an infrastructure hiccup.',
  },
  'entitlements.trial_expiry': {
    description: 'An expired trial (past trial_end_date plus the grace period) or a suspended account is read-only: project create/update, team invites, API project writes and storage uploads are refused with an upgrade path.',
    owner: 'djpearson',
    addedOn: '2026-09-23',
    removeBy: '2027-03-31',
    default: false,
    onReadError: false,
    safeSide:
      'Fails open. Read-only mode stops a company working; it must never be switched on by a failed read, only by the owner deciding to enforce it.',
  },
  'entitlements.storage_quota': {
    description: 'Uploads to company buckets are refused once the company has used its plan storage allowance (storage.objects insert policy plus the storage_quota check in edge functions).',
    owner: 'djpearson',
    addedOn: '2026-09-23',
    removeBy: '2027-03-31',
    default: false,
    onReadError: false,
    safeSide:
      'Fails open. Nobody has ever been held to a storage limit, so companies may already be over it; an unreadable flag must not start refusing their job-site photos.',
  },
} as const satisfies Record<string, FeatureFlagDefinition>;

export type FeatureFlagKey = keyof typeof FEATURE_FLAGS;

export interface FeatureFlagRow {
  company_id: string | null;
  enabled: boolean;
}

export type FlagSource = 'global_kill' | 'company' | 'global' | 'default' | 'read_error';

export interface FlagDecision {
  enabled: boolean;
  source: FlagSource;
}

/**
 * Resolve a flag from the rows stored for its key. Rows for other companies
 * (the service role sees every row) are ignored.
 *
 *   1. a global row that is off wins - the kill switch;
 *   2. then this company's row;
 *   3. then a global row;
 *   4. then the registry default.
 */
export function resolveFlag(
  key: FeatureFlagKey,
  rows: readonly FeatureFlagRow[],
  companyId: string | null | undefined,
): FlagDecision {
  const global = rows.find((r) => r.company_id === null);
  if (global && global.enabled === false) return { enabled: false, source: 'global_kill' };
  const own = companyId ? rows.find((r) => r.company_id === companyId) : undefined;
  if (own) return { enabled: own.enabled === true, source: 'company' };
  if (global) return { enabled: global.enabled === true, source: 'global' };
  return { enabled: FEATURE_FLAGS[key].default, source: 'default' };
}

// Only the query surface this helper uses, so a test can pass a stub.
interface FlagQueryClient {
  from(table: 'feature_flags'): {
    select(columns: string): {
      eq(column: string, value: string): PromiseLike<{ data: unknown; error: { message: string } | null }>;
    };
  };
}

/**
 * Read one flag for a company. Never throws: a failed read (including the
 * table not existing yet) resolves to the flag's `onReadError` and is logged.
 *
 * Works with either client. The user-JWT client sees the global rows and the
 * caller's own company's rows (RLS); the service client sees every row and
 * resolveFlag drops the other companies'. companyId is compared in memory
 * rather than put in a PostgREST filter, so a caller-supplied value never
 * reaches the query string.
 */
export async function isFlagEnabled(
  client: FlagQueryClient,
  key: FeatureFlagKey,
  companyId: string | null | undefined,
): Promise<FlagDecision> {
  try {
    const { data, error } = await client
      .from('feature_flags')
      .select('company_id, enabled')
      .eq('flag_key', key);
    if (error) throw new Error(error.message);
    return resolveFlag(key, Array.isArray(data) ? (data as FeatureFlagRow[]) : [], companyId);
  } catch (e) {
    console.error(`[feature-flags] could not read ${key}; using onReadError`, e instanceof Error ? e.message : e);
    return { enabled: FEATURE_FLAGS[key].onReadError, source: 'read_error' };
  }
}

export const FEATURE_DISABLED_MESSAGE: Record<FeatureFlagKey, string> = {
  'quickbooks.sync':
    'QuickBooks sync is paused while we fix a problem. Your existing data is unchanged; try again later.',
  // Enforcement flags: "disabled" means not enforced, so these messages are
  // never sent. The record is typed over every key, so they must exist.
  'entitlements.plan_features': 'Plan feature gates are not enforced.',
  'entitlements.trial_expiry': 'Trial expiry is not enforced.',
  'entitlements.storage_quota': 'Storage quota is not enforced.',
};

/** 503 in the standard envelope for a request a switched-off flag refuses. */
export function featureDisabledResponse(
  key: FeatureFlagKey,
  corsHeaders: Record<string, string>,
): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: FEATURE_DISABLED_MESSAGE[key],
      feature_flag: key,
      timestamp: new Date().toISOString(),
    }),
    { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '3600' } },
  );
}
