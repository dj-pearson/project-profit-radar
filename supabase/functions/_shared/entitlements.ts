// Server-side plan entitlement enforcement (US-199).
//
// The client (useSubscription().checkLimit + PermissionGate) gates the UI, but
// that is bypassable via direct API calls. This helper is the authoritative,
// server-side gate for plan limits and must be called before creating a gated
// resource in an edge function.
//
// IMPORTANT: TIER_LIMITS mirrors src/contexts/SubscriptionContext.tsx — keep the
// two in sync (or move both to a shared source) when limits change.

export interface TierLimits {
  teamMembers: number; // -1 = unlimited
  projects: number; // -1 = unlimited
  storage: number; // GB, -1 = unlimited
}

export const TIER_LIMITS: Record<string, TierLimits> = {
  starter: { teamMembers: 5, projects: 10, storage: 10 },
  professional: { teamMembers: 20, projects: 50, storage: 100 },
  enterprise: { teamMembers: -1, projects: -1, storage: -1 },
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

    const { count } = await supabase
      .from(table)
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId);

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
