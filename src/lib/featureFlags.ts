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
