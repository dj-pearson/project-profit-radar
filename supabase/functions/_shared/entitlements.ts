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
  BYTES_PER_GB, storageLimitBytes, accountAccess, ENTITLEMENT_ERROR_CODES,
  type TierLimits, type TierName, type AccountAccess, type EntitlementErrorCode,
} from "./tiers.ts";
import { isFlagEnabled } from "./feature-flags.ts";
import { API_VERSION, apiVersionHeaders } from "./api-version.ts";

export {
  TIER_LIMITS, TIER_DISPLAY_NAMES, TIER_ORDER, FEATURE_MIN_TIER,
  tierAllowsFeature, tierRequiredFor, limitsFor, tierRank,
  BYTES_PER_GB, storageLimitBytes, accountAccess, ENTITLEMENT_ERROR_CODES,
  type TierLimits, type TierName, type AccountAccess, type EntitlementErrorCode,
};

export type EntitlementResource = keyof TierLimits;

// Which table to count for a given resource (company_id-scoped). storage is
// not a row count: it is the byte total from public.company_storage_used_bytes
// (US-335), and `additionalCount` is the size of the incoming file in bytes.
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

    if (resource === "storage") {
      const { data: used, error } = await supabase.rpc("company_storage_used_bytes", {
        p_company_id: companyId,
      });
      if (error) return UNLIMITED(tier); // migration not applied yet: fail open
      const limitBytes = storageLimitBytes(tier);
      const currentUsage = Number(used ?? 0);
      const allowed = currentUsage + additionalCount <= limitBytes;
      const usedGb = (currentUsage / BYTES_PER_GB).toFixed(1);
      return {
        allowed,
        limit: limitBytes,
        currentUsage,
        tier,
        reason: allowed
          ? undefined
          : `Your ${TIER_DISPLAY_NAMES[tier as TierName] ?? tier} plan includes ${limit} GB of storage and ${usedGb} GB is in use. Delete files or upgrade to upload more.`,
        upgradeTo: allowed ? undefined : tier === "starter" ? "professional" : "enterprise",
      };
    }

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

/** The supabase-js client, typed the way checkEntitlement takes it. */
type DbClient = Parameters<typeof checkEntitlement>[0];

// ---------------------------------------------------------------------------
// Account standing: trial expiry and suspension (US-335 AC4)
// ---------------------------------------------------------------------------

export interface StandingResult {
  access: AccountAccess;
  status: string;
  reason?: string;
}

/**
 * Is this company allowed to create or change things? The rule itself is
 * accountAccess() in tiers.ts; this reads the rows it needs.
 *
 * Fails OPEN on any error, like the rest of this module. Complimentary is
 * checked for the acting user, the same way checkEntitlement does.
 */
export async function checkAccountStanding(
  supabase: DbClient,
  companyId: string,
  opts: { userId?: string } = {},
): Promise<StandingResult> {
  try {
    const { data: company, error } = await supabase
      .from("companies")
      .select("subscription_status, trial_end_date, stripe_subscription_id")
      .eq("id", companyId)
      .maybeSingle();
    if (error || !company) return { access: "full", status: "unknown" };

    let isComplimentary = false;
    if (opts.userId) {
      const { data: sub } = await supabase
        .from("subscribers")
        .select("is_complimentary, complimentary_expires_at")
        .eq("user_id", opts.userId)
        .maybeSingle();
      isComplimentary = !!sub?.is_complimentary &&
        (!sub.complimentary_expires_at || new Date(sub.complimentary_expires_at) > new Date());
    }

    const status = String(company.subscription_status ?? "");
    const access = accountAccess({
      subscriptionStatus: status,
      trialEndDate: company.trial_end_date,
      hasStripeSubscription: !!company.stripe_subscription_id,
      isComplimentary,
    });
    return {
      access,
      status,
      reason: access === "read_only"
        ? "This account is read-only because the trial or subscription has ended. " +
          "You can still view and export your data. Choose a plan to make changes."
        : undefined,
    };
  } catch {
    return { access: "full", status: "unknown" };
  }
}

// ---------------------------------------------------------------------------
// The refusal envelope
// ---------------------------------------------------------------------------

export interface EntitlementDenial {
  code: EntitlementErrorCode;
  message: string;
  tier?: string;
  limit?: number;
  currentUsage?: number;
  upgradeTo?: string | null;
  requiredTier?: string | null;
}

/**
 * 403 in the standard envelope ({ success, error, timestamp }) plus `code`
 * and an `entitlement` object, both additive, so a client that only reads
 * `error` keeps working and one that reads `code` can open the upgrade sheet.
 * 403 is what these refusals already returned (US-199); the status is part of
 * the contract.
 */
export function entitlementDeniedResponse(
  denial: EntitlementDenial,
  corsHeaders: Record<string, string>,
): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: denial.message,
      code: denial.code,
      entitlement: {
        tier: denial.tier ?? null,
        limit: denial.limit ?? null,
        currentUsage: denial.currentUsage ?? null,
        upgradeTo: denial.upgradeTo ?? denial.requiredTier ?? null,
        upgradePath: "/subscription-settings",
      },
      timestamp: new Date().toISOString(),
      // US-273: additive; see docs/API_VERSIONING.md.
      api_version: API_VERSION,
    }),
    { status: 403, headers: { ...corsHeaders, ...apiVersionHeaders(), "Content-Type": "application/json" } },
  );
}

/** The denial for a checkEntitlement result that was not allowed. */
export function limitDenial(resource: EntitlementResource, r: EntitlementResult): EntitlementDenial {
  return {
    code: resource === "storage"
      ? ENTITLEMENT_ERROR_CODES.storageQuotaExceeded
      : ENTITLEMENT_ERROR_CODES.limitReached,
    message: r.reason || `Your plan limit for ${resource} has been reached.`,
    tier: r.tier,
    limit: r.limit,
    currentUsage: r.currentUsage,
    upgradeTo: r.upgradeTo ?? null,
  };
}

// ---------------------------------------------------------------------------
// Flag-gated refusals (US-335)
// ---------------------------------------------------------------------------
//
// Enforcement that would refuse something an existing customer does today is
// behind a feature flag that defaults OFF (docs/FEATURE_FLAGS.md). These two
// helpers put the flag read and the check in one place so each edge function
// adds a single line, and so "is it enforced?" has one answer.
//
// Both return a Response to send, or null to carry on.

/** Refuse a write when the company is read-only and trial expiry is enforced. */
export async function refuseIfReadOnly(
  supabase: DbClient,
  companyId: string,
  corsHeaders: Record<string, string>,
  opts: { userId?: string } = {},
): Promise<Response | null> {
  const flag = await isFlagEnabled(supabase, "entitlements.trial_expiry", companyId);
  if (!flag.enabled) return null;
  const standing = await checkAccountStanding(supabase, companyId, opts);
  if (standing.access !== "read_only") return null;
  return entitlementDeniedResponse({
    code: ENTITLEMENT_ERROR_CODES.accountReadOnly,
    message: standing.reason ?? "This account is read-only.",
    upgradeTo: null,
  }, corsHeaders);
}

/** Refuse a feature the company's plan does not include, when plan gates are enforced. */
export async function refuseIfFeatureNotInPlan(
  supabase: DbClient,
  companyId: string,
  feature: string,
  corsHeaders: Record<string, string>,
): Promise<Response | null> {
  if (!tierRequiredFor(feature)) return null;
  const flag = await isFlagEnabled(supabase, "entitlements.plan_features", companyId);
  if (!flag.enabled) return null;
  const result = await checkFeature(supabase, companyId, feature);
  if (result.allowed) return null;
  return entitlementDeniedResponse({
    code: ENTITLEMENT_ERROR_CODES.featureNotInPlan,
    message: result.reason ?? `${feature} is not included in this plan.`,
    tier: result.tier,
    requiredTier: result.requiredTier,
  }, corsHeaders);
}

// ---------------------------------------------------------------------------
// Dunning: one way to suspend (US-335 AC4)
// ---------------------------------------------------------------------------

/**
 * Put the company behind a subscribers row into 'suspended' - the state
 * stripe-webhook writes for a canceled subscription and trial-management
 * writes after an unpaid trial's grace period. process-dunning and
 * failed-payment-recovery used to change only the subscribers row, which
 * nothing that decides what a company may do reads, so a company that failed
 * every retry kept full access.
 *
 * Needs the service-role client. Returns what happened rather than throwing:
 * the caller is a cron loop, and one company's failure must not stop the run.
 */
export async function suspendCompanyOfSubscriber(
  supabase: DbClient,
  subscriberId: string,
): Promise<{ companyId: string | null; error?: string }> {
  const { data: sub, error: subError } = await supabase
    .from("subscribers")
    .select("user_id")
    .eq("id", subscriberId)
    .maybeSingle();
  if (subError) return { companyId: null, error: subError.message };
  if (!sub?.user_id) return { companyId: null };

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("company_id")
    .eq("id", sub.user_id)
    .maybeSingle();
  if (profileError) return { companyId: null, error: profileError.message };
  if (!profile?.company_id) return { companyId: null };

  const { error: updateError } = await supabase
    .from("companies")
    .update({ subscription_status: "suspended", updated_at: new Date().toISOString() })
    .eq("id", profile.company_id);
  if (updateError) return { companyId: profile.company_id, error: updateError.message };
  return { companyId: profile.company_id };
}
