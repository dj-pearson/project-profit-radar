// Server-side plan entitlement enforcement (US-199).
//
// The client (useSubscription().checkLimit + PermissionGate) gates the UI, but
// that is bypassable via direct API calls. This helper is the authoritative,
// server-side gate for plan limits and must be called before creating a gated
// resource in an edge function.
//
// TIER_LIMITS used to be declared here AND in src/contexts/SubscriptionContext.tsx,
// with a comment asking whoever changed one to remember the other. A comment is
// not a mechanism (US-335). Both now come from tiers.ts, which the web client
// gets as a generated copy.
import {
  TIER_LIMITS, TIER_DISPLAY_NAMES, TIER_ORDER, FEATURE_MIN_TIER,
  tierAllowsFeature, tierRequiredFor, limitsFor, tierRank,
  type TierLimits, type TierName,
} from "./tiers.ts";

export {
  TIER_LIMITS, TIER_DISPLAY_NAMES, TIER_ORDER, FEATURE_MIN_TIER,
  tierAllowsFeature, tierRequiredFor, limitsFor, tierRank,
  type TierLimits, type TierName,
};

export type EntitlementResource = keyof TierLimits;

// Which table to count for a given resource (company_id-scoped). storage is
// measured differently and is not enforced by row-count here.
const RESOURCE_TABLE: Record<EntitlementResource, string | null> = {
  projects: "projects",
  teamMembers: "user_profiles",
  storage: null,
};

export interface EntitlementResult {
  allowed: boolean;
  limit: number; // -1 = unlimited
  currentUsage: number;
  tier: string;
  reason?: string;
  upgradeTo?: string;
}

const UNLIMITED = (tier: string): EntitlementResult => ({
  allowed: true,
  limit: -1,
  currentUsage: 0,
  tier,
});

/**
 * Authoritative server-side plan-limit check. Returns whether `companyId` may
 * create `additionalCount` more of `resource`.
 *
 * Fails OPEN on any ambiguity (unknown tier, missing data, infra error) so we
 * never hard-lock paying / complimentary / grandfathered accounts — it only
 * blocks the clear case of an explicit starter/professional tier that is at or
 * over its limit.
 */
export async function checkEntitlement(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  companyId: string,
  resource: EntitlementResource,
  opts: { additionalCount?: number; userId?: string } = {},
): Promise<EntitlementResult> {
  const additionalCount = opts.additionalCount ?? 1;

  try {
    // Complimentary accounts bypass limits (best-effort, per-user).
    if (opts.userId) {
      const { data: sub } = await supabase
        .from("subscribers")
        .select("is_complimentary, complimentary_expires_at")
        .eq("user_id", opts.userId)
        .maybeSingle();
      const notExpired = !sub?.complimentary_expires_at ||
        new Date(sub.complimentary_expires_at) > new Date();
      if (sub?.is_complimentary && notExpired) {
        return UNLIMITED("complimentary");
      }
    }

    const { data: company } = await supabase
      .from("companies")
      .select("subscription_tier")
      .eq("id", companyId)
      .maybeSingle();

    const tier = (company?.subscription_tier as string) || "starter";
    const limits = TIER_LIMITS[tier];

    // Unknown or enterprise tier => unlimited (fail open).
    if (!limits || limits[resource] === -1) {
      return UNLIMITED(tier);
    }

    const limit = limits[resource];
    const table = RESOURCE_TABLE[resource];
    if (!table) return UNLIMITED(tier); // not row-count enforced

    let query = supabase
      .from(table)
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId);

    // A client_portal user is a customer being shown their own job, not a seat
    // the contractor bought (US-319). Counting them would make the portal
    // something a contractor rations, and would let a busy job push a company
    // over its plan limit for inviting its own customers.
    if (table === "user_profiles") {
      query = query.neq("role", "client_portal");
    }

    const { count } = await query;

    const currentUsage = count ?? 0;
    const allowed = currentUsage + additionalCount <= limit;

    return {
      allowed,
      limit,
      currentUsage,
      tier,
      reason: allowed
        ? undefined
        : `Your ${tier} plan includes up to ${limit} ${resource}. You currently have ${currentUsage}. Upgrade to add more.`,
      upgradeTo: allowed ? undefined : tier === "starter" ? "professional" : "enterprise",
    };
  } catch (_err) {
    // Never block legitimate work because the check itself failed.
    return UNLIMITED("unknown");
  }
}

/**
 * Is this company's plan allowed to use this feature? (US-335)
 *
 * canAccessFeature on the client returned true for any trial, complimentary or
 * subscribed company, so no feature was tier-gated anywhere - the Pricing page
 * sold QuickBooks sync as Professional and API access as Enterprise, and a
 * Starter account had both.
 *
 * Server-side, because the client gate is bypassable by calling the API
 * directly, which is the whole reason this module exists.
 *
 * Fails OPEN on an error, like checkEntitlement above: never block legitimate
 * work because the check itself broke. It fails CLOSED on an unrecognised tier,
 * because that withholds a paid feature rather than handing one out.
 */
export async function checkFeature(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  companyId: string,
  feature: string,
): Promise<{ allowed: boolean; tier: string; requiredTier: string | null; reason?: string }> {
  const required = tierRequiredFor(feature);
  if (!required) return { allowed: true, tier: "unknown", requiredTier: null };

  try {
    const { data, error } = await supabase
      .from("companies")
      .select("subscription_tier, subscription_status")
      .eq("id", companyId)
      .maybeSingle();

    if (error || !data) return { allowed: true, tier: "unknown", requiredTier: required };

    const tier = String(data.subscription_tier ?? "starter");
    const allowed = tierAllowsFeature(tier, feature);

    return {
      allowed,
      tier,
      requiredTier: required,
      reason: allowed
        ? undefined
        : `${feature} is included with ${TIER_DISPLAY_NAMES[required]} and above. ` +
          `This company is on ${TIER_DISPLAY_NAMES[tier as TierName] ?? tier}.`,
    };
  } catch (_err) {
    return { allowed: true, tier: "unknown", requiredTier: required };
  }
}
