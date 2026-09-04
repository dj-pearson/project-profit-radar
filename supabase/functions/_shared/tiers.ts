/**
 * What each plan gets. THE ONE DEFINITION (US-335).
 *
 * This was declared twice - supabase/functions/_shared/entitlements.ts and
 * src/contexts/SubscriptionContext.tsx - with a comment on one of them asking
 * whoever changes it to remember the other:
 *
 *   // IMPORTANT: TIER_LIMITS mirrors src/contexts/SubscriptionContext.tsx -
 *   // keep the two in sync (or move both to a shared source) when limits
 *   // change.
 *
 * A comment is not a mechanism. The two are now generated from this file:
 * `node scripts/generate-tiers.mjs` writes src/lib/tiers.generated.ts, and
 * scripts/check-tiers-in-sync.mjs fails if the generated copy has drifted.
 *
 * This file lives under supabase/functions/_shared because Deno cannot import
 * from src/ (it would not deploy) while the web build can be given a generated
 * copy. The direction is forced; the single source is not.
 *
 * NOTE, unresolved: the marketing copy in src/components/SubscriptionChange.tsx
 * and TrialConversion.tsx advertises "25 Projects" for Professional while the
 * enforced limit here is 50. One of the two is wrong and it is a commercial
 * decision which. Recorded on US-335 rather than silently picking one.
 */

export interface TierLimits {
  /** -1 means unlimited. */
  teamMembers: number;
  projects: number;
  /** Gigabytes. -1 means unlimited. */
  storage: number;
}

export type TierName = 'starter' | 'professional' | 'enterprise';

export const TIER_LIMITS: Record<TierName, TierLimits> = {
  starter: { teamMembers: 5, projects: 10, storage: 10 },
  professional: { teamMembers: 20, projects: 50, storage: 100 },
  enterprise: { teamMembers: -1, projects: -1, storage: -1 },
};

export const TIER_DISPLAY_NAMES: Record<TierName, string> = {
  starter: 'Starter',
  professional: 'Professional',
  enterprise: 'Enterprise',
};

/** Cheapest plan first. Used to name the upgrade that unlocks something. */
export const TIER_ORDER: TierName[] = ['starter', 'professional', 'enterprise'];

/**
 * Features sold as belonging to a plan, and the lowest plan that gets them.
 *
 * Only features the pricing page actually advertises as tier-specific are
 * listed. Everything absent from this map is available on every plan, which is
 * the safe default: gating something nobody sold is how you take a capability
 * away from a paying customer.
 */
export const FEATURE_MIN_TIER: Record<string, TierName> = {
  // "QuickBooks Integration" - Professional and up.
  quickbooks_sync: 'professional',
  advanced_reporting: 'professional',
  // "API Access" - Enterprise only.
  api_access: 'enterprise',
  custom_reports: 'enterprise',
  sso: 'enterprise',
};

export const tierRank = (tier: string): number => {
  const i = TIER_ORDER.indexOf(tier as TierName);
  return i === -1 ? 0 : i;
};

/**
 * Does this plan include this feature?
 *
 * An unknown feature is allowed. An unknown TIER is treated as the cheapest,
 * which is the conservative direction: it withholds a paid feature rather than
 * handing one out on a plan nobody recognises.
 */
export function tierAllowsFeature(tier: string, feature: string): boolean {
  const required = FEATURE_MIN_TIER[feature];
  if (!required) return true;
  return tierRank(tier) >= tierRank(required);
}

/** The cheapest plan that would unlock a feature, or null if every plan has it. */
export function tierRequiredFor(feature: string): TierName | null {
  return FEATURE_MIN_TIER[feature] ?? null;
}

export function limitsFor(tier: string): TierLimits {
  return TIER_LIMITS[tier as TierName] ?? TIER_LIMITS.starter;
}
