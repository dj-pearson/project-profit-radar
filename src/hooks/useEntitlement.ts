/**
 * What the signed-in company's plan gives it, and which of those limits the
 * server is currently enforcing (US-335).
 *
 * Every number comes from the one tier definition (supabase/functions/_shared/
 * tiers.ts, generated into src/lib/tiers.generated.ts). The server is the
 * gate - the projects, invite-team-member, quickbooks-sync and api-management
 * edge functions and the storage.objects insert policy - and this hook exists
 * so the UI can say so before the user clicks, not to enforce anything.
 *
 * `enforced` mirrors the three US-335 feature flags. While a flag is off the
 * server does not refuse, so the UI warns rather than blocks: a control
 * disabled on the client for a limit the server does not apply is a paying
 * customer locked out by a bug in the display layer.
 */
import { useMemo } from 'react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import {
  BYTES_PER_GB, ENTITLEMENT_ERROR_CODES, accountAccess, limitsFor, storageLimitBytes,
  tierAllowsFeature, tierRequiredFor,
  type AccountAccess, type EntitlementErrorCode, type TierLimits, type TierName,
} from '@/lib/tiers.generated';

export interface EntitlementInput {
  tier: string | null | undefined;
  isComplimentary: boolean;
  status: string | null | undefined;
  trialEndDate: string | null | undefined;
  hasStripeSubscription: boolean;
  usage: { teamMembers: number; projects: number; storageGb: number };
  enforced: { planFeatures: boolean; trialExpiry: boolean; storageQuota: boolean };
  now?: Date;
}

export interface Entitlement {
  tier: string;
  limits: TierLimits;
  access: AccountAccess;
  /** True only when the account is read-only AND the server enforces it. */
  readOnly: boolean;
  enforced: EntitlementInput['enforced'];
  storage: { usedBytes: number; limitBytes: number; overLimit: boolean; nearLimit: boolean };
  /** Room for `n` more of a counted resource on this plan. */
  hasRoomFor: (resource: 'projects' | 'teamMembers', n?: number) => boolean;
  /** Does the plan include this feature? Display only; the server decides. */
  planIncludes: (feature: string) => boolean;
  requiredTierFor: (feature: string) => TierName | null;
}

/** Pure, so the rules are testable without React or Supabase. */
export function deriveEntitlement(input: EntitlementInput): Entitlement {
  const tier = input.tier || 'starter';
  const limits = input.isComplimentary
    ? { teamMembers: -1, projects: -1, storage: -1 }
    : limitsFor(tier);
  const access = accountAccess({
    subscriptionStatus: input.status,
    trialEndDate: input.trialEndDate,
    isComplimentary: input.isComplimentary,
    hasStripeSubscription: input.hasStripeSubscription,
    now: input.now,
  });

  const usedBytes = Math.round(input.usage.storageGb * BYTES_PER_GB);
  const limitBytes = input.isComplimentary ? -1 : storageLimitBytes(tier);
  const storage = {
    usedBytes,
    limitBytes,
    overLimit: limitBytes !== -1 && usedBytes >= limitBytes,
    nearLimit: limitBytes !== -1 && usedBytes >= limitBytes * 0.8,
  };

  return {
    tier,
    limits,
    access,
    readOnly: access === 'read_only' && input.enforced.trialExpiry,
    enforced: input.enforced,
    storage,
    hasRoomFor: (resource, n = 1) => {
      const limit = limits[resource];
      return limit === -1 || input.usage[resource] + n <= limit;
    },
    planIncludes: (feature) => input.isComplimentary || tierAllowsFeature(tier, feature),
    requiredTierFor: (feature) => tierRequiredFor(feature),
  };
}

const CODES = new Set<string>(Object.values(ENTITLEMENT_ERROR_CODES));

/**
 * The `code` of an entitlement refusal from an edge function, or null. Accepts
 * the parsed response body; the envelope is { success: false, error, code,
 * entitlement, timestamp } (_shared/entitlements.ts entitlementDeniedResponse).
 */
export function entitlementErrorCode(body: unknown): EntitlementErrorCode | null {
  if (!body || typeof body !== 'object') return null;
  const code = (body as { code?: unknown }).code;
  return typeof code === 'string' && CODES.has(code) ? (code as EntitlementErrorCode) : null;
}

export function useEntitlement(): Entitlement & { loading: boolean } {
  const { subscriptionData, subscriptionStatus, usage, loading } = useSubscription();
  const planFeatures = useFeatureFlag('entitlements.plan_features').enabled;
  const trialExpiry = useFeatureFlag('entitlements.trial_expiry').enabled;
  const storageQuota = useFeatureFlag('entitlements.storage_quota').enabled;

  const entitlement = useMemo(() => deriveEntitlement({
    tier: subscriptionData?.subscription_tier,
    isComplimentary: !!subscriptionData?.is_complimentary,
    status: subscriptionStatus?.status,
    trialEndDate: subscriptionStatus?.trialEndDate,
    hasStripeSubscription: !!subscriptionStatus?.hasStripeSubscription,
    usage: { teamMembers: usage.teamMembers, projects: usage.projects, storageGb: usage.storage },
    enforced: { planFeatures, trialExpiry, storageQuota },
  }), [subscriptionData, subscriptionStatus, usage, planFeatures, trialExpiry, storageQuota]);

  return { ...entitlement, loading };
}
