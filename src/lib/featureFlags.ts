/**
 * Web mirror of supabase/functions/_shared/feature-flags.ts (US-281).
 *
 * The edge function is what enforces a flag; the web app reads the same
 * public.feature_flags rows only so it can say a feature is paused before the
 * user clicks it. Add, change or delete a flag in both files in the same
 * change - supabase/functions/_shared/feature-flags.test.ts compares them.
 * Procedure and lifecycle: docs/FEATURE_FLAGS.md.
 */

export interface FeatureFlagDefinition {
  description: string;
  owner: string;
  addedOn: string;
  removeBy: string;
  default: boolean;
  onReadError: boolean;
  safeSide: string;
}

export const FEATURE_FLAGS = {
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

/** Same resolution order as the server: global off, company, global, default. */
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
