/**
 * GENERATED FILE - DO NOT EDIT.
 *
 * Source: supabase/functions/_shared/tiers.ts
 * Regenerate: node scripts/generate-tiers.mjs
 *
 * Edit the source. scripts/check-tiers-in-sync.mjs fails if this copy has
 * drifted, so an edit here is reverted by the next run rather than kept.
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

// ---------------------------------------------------------------------------
// Storage (US-335 AC2)
// ---------------------------------------------------------------------------

export const BYTES_PER_GB = 1024 * 1024 * 1024;

/** The plan's storage allowance in bytes, or -1 for unlimited. */
export function storageLimitBytes(tier: string): number {
  const gb = limitsFor(tier).storage;
  return gb === -1 ? -1 : gb * BYTES_PER_GB;
}

// ---------------------------------------------------------------------------
// Trial expiry and account standing (US-335 AC4)
// ---------------------------------------------------------------------------

/** create_company_for_current_user starts every company on a trial this long. */
export const TRIAL_LENGTH_DAYS = 14;

/**
 * Days after trial_end_date before the account goes read-only. trial-management
 * moves a company to grace_period on the first run after the trial ends and to
 * suspended once this has passed; stripe-webhook maps past_due to
 * grace_period and canceled to suspended; process-dunning suspends after the
 * last failed retry. Whichever function wrote the status, it means the same
 * thing here.
 */
export const GRACE_PERIOD_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * full      - normal use.
 * grace     - trial ended (or a payment failed) and the grace period is running:
 *             everything still works, the banner says how long is left.
 * read_only - suspended, or the grace period has run out. The company can read
 *             and export its data and reach billing, and cannot create or
 *             change anything until it pays.
 */
export type AccountAccess = 'full' | 'grace' | 'read_only';

export interface AccountStandingInput {
  subscriptionStatus: string | null | undefined;
  trialEndDate: string | Date | null | undefined;
  isComplimentary?: boolean;
  /** companies.stripe_subscription_id is set. */
  hasStripeSubscription?: boolean;
  now?: Date;
}

/**
 * What a company's billing state allows. Pure, so the web banner, the edge
 * functions and the tests all read one rule.
 *
 *   suspended     read_only, whoever wrote it (trial-management after the
 *                 grace period, stripe-webhook on a canceled subscription,
 *                 process-dunning after the last failed retry).
 *   grace_period  grace. It is written both for an ended trial and for a
 *                 past_due payment, and a paying company's trial_end_date is
 *                 long past, so the date cannot tell the two apart; the move
 *                 to suspended is left to whichever function owns the state.
 *   trial         by date (unless a Stripe subscription is attached), because the status is only as fresh as the last
 *                 trial-management run: a trial that ended three weeks ago is
 *                 read-only whether or not the cron got to it.
 *   anything else full (active, pending, converting, anything new). The gate
 *                 exists to stop an expired trial writing, not to guess at
 *                 states it was never told about.
 */
export function accountAccess(input: AccountStandingInput): AccountAccess {
  if (input.isComplimentary) return 'full';
  const status = input.subscriptionStatus ?? '';
  if (status === 'suspended') return 'read_only';
  if (status === 'grace_period') return 'grace';
  if (status !== 'trial') return 'full';
  // A trial with a Stripe subscription attached is a company that has paid
  // and whose webhook has not landed yet. Never lock that one.
  if (input.hasStripeSubscription) return 'full';

  const now = (input.now ?? new Date()).getTime();
  const end = input.trialEndDate ? new Date(input.trialEndDate).getTime() : NaN;
  if (Number.isNaN(end) || now <= end) return 'full';
  if (now <= end + GRACE_PERIOD_DAYS * DAY_MS) return 'grace';
  return 'read_only';
}

// ---------------------------------------------------------------------------
// Error codes (the `code` field of a refused request)
// ---------------------------------------------------------------------------

/**
 * Every entitlement refusal carries one of these in the envelope's `code`, so
 * a client can show the right upgrade path without parsing the message.
 */
export const ENTITLEMENT_ERROR_CODES = {
  limitReached: 'plan_limit_reached',
  featureNotInPlan: 'feature_not_in_plan',
  storageQuotaExceeded: 'storage_quota_exceeded',
  accountReadOnly: 'account_read_only',
} as const;

export type EntitlementErrorCode =
  (typeof ENTITLEMENT_ERROR_CODES)[keyof typeof ENTITLEMENT_ERROR_CODES];
