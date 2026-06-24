// Server-side per-tier MONTHLY AI usage quota (security audit CR-1 / H-6).
//
// This is the authoritative, unspoofable hard ceiling on paid AI calls per
// company per calendar month. It complements (does NOT replace) the per-minute
// rate limiter in `rate-limiter.ts`:
//   * rate-limiter.ts  -> burst control  (e.g. 20 AI calls / minute / user)
//   * ai-quota.ts      -> cost control   (e.g. N AI calls / month / company tier)
//
// Backing store: `ai_usage_counters` (+ atomic `increment_ai_usage` RPC), created
// in migration 20260624000000. That table has NO client write policy, so the
// count cannot be forged or reset by a client (unlike the legacy `usage_metrics`,
// audit H-1). Always pass a SERVICE-ROLE client here.
//
// Fail-open posture: like `entitlements.ts` and `rate-limiter.ts`, any ambiguity
// (unknown tier, missing data, infra error) ALLOWS the request. The quota is a
// cost backstop layered on top of the per-minute limiter, not the sole control —
// we never hard-lock a paying/complimentary account because a lookup failed.

// AI calls allowed per company per month, by subscription tier.
// -1 = unlimited. Keep tier names aligned with entitlements.ts / SubscriptionContext.
export const AI_TIER_MONTHLY_LIMITS: Record<string, number> = {
  starter: 250,
  professional: 2500,
  enterprise: -1,
  complimentary: -1,
};

// Fallback when a company's tier is unknown/unrecognized — fail open (unlimited).
const DEFAULT_LIMIT = -1;

export interface AiQuotaResult {
  /** Whether this AI call is permitted under the monthly quota. */
  allowed: boolean;
  /** Monthly limit for the resolved tier (-1 = unlimited). */
  limit: number;
  /** Calls already used this month BEFORE this request. */
  used: number;
  /** Resolved subscription tier. */
  tier: string;
  /** Company the quota was resolved for (null if it could not be resolved). */
  companyId: string | null;
  /** Seconds until the quota window resets (start of next month), when blocked. */
  retryAfter: number;
  /** Human-readable reason when blocked. */
  reason?: string;
}

const allow = (
  tier: string,
  companyId: string | null,
  limit = DEFAULT_LIMIT,
  used = 0,
): AiQuotaResult => ({ allowed: true, limit, used, tier, companyId, retryAfter: 0 });

/** Seconds from now until the first day of next UTC month. */
function secondsUntilNextMonth(): number {
  const now = new Date();
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return Math.max(0, Math.ceil((next.getTime() - now.getTime()) / 1000));
}

/** First day of the current UTC month as YYYY-MM-DD (matches the RPC's period_month). */
function currentPeriodMonth(): string {
  const now = new Date();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${now.getUTCFullYear()}-${m}-01`;
}

/**
 * Resolve the company_id for an authenticated user from their profile.
 * Tries `user_profiles` then `profiles` (mirrors auth-helpers.ts).
 */
export async function getCompanyIdForUser(
  // deno-lint-ignore no-explicit-any
  serviceClient: any,
  userId: string,
): Promise<string | null> {
  const { data: up } = await serviceClient
    .from("user_profiles")
    .select("company_id")
    .eq("id", userId)
    .maybeSingle();
  if (up?.company_id) return up.company_id as string;

  const { data: p } = await serviceClient
    .from("profiles")
    .select("company_id")
    .eq("user_id", userId)
    .maybeSingle();
  return (p?.company_id as string) ?? null;
}

async function resolveTier(
  // deno-lint-ignore no-explicit-any
  serviceClient: any,
  companyId: string,
  userId?: string,
): Promise<string> {
  // Complimentary accounts (per-user) bypass the quota — same rule as entitlements.ts.
  if (userId) {
    const { data: sub } = await serviceClient
      .from("subscribers")
      .select("is_complimentary, complimentary_expires_at")
      .eq("user_id", userId)
      .maybeSingle();
    const notExpired = !sub?.complimentary_expires_at ||
      new Date(sub.complimentary_expires_at) > new Date();
    if (sub?.is_complimentary && notExpired) return "complimentary";
  }

  const { data: company } = await serviceClient
    .from("companies")
    .select("subscription_tier")
    .eq("id", companyId)
    .maybeSingle();
  return (company?.subscription_tier as string) || "starter";
}

/**
 * Pre-flight monthly AI quota check. Call AFTER the per-minute rate limit and
 * BEFORE invoking the model. Pass a SERVICE-ROLE client.
 *
 * Provide either `companyId` (preferred — saves a lookup) or `userId` (the
 * company is then resolved from the user's profile). `userId` also enables the
 * complimentary-account bypass.
 *
 * The returned `companyId` should be passed to `recordAiUsage` after a successful
 * call so you don't resolve the company twice.
 */
export async function enforceAiQuota(
  // deno-lint-ignore no-explicit-any
  serviceClient: any,
  opts: { companyId?: string; userId?: string },
): Promise<AiQuotaResult> {
  try {
    const companyId = opts.companyId ??
      (opts.userId ? await getCompanyIdForUser(serviceClient, opts.userId) : null);

    // Can't attribute usage to a company -> fail open (cost backstop only).
    if (!companyId) return allow("unknown", null);

    const tier = await resolveTier(serviceClient, companyId, opts.userId);
    const limit = AI_TIER_MONTHLY_LIMITS[tier] ?? DEFAULT_LIMIT;
    if (limit < 0) return allow(tier, companyId, limit); // unlimited

    const { data: row, error } = await serviceClient
      .from("ai_usage_counters")
      .select("ai_calls")
      .eq("company_id", companyId)
      .eq("period_month", currentPeriodMonth())
      .maybeSingle();

    if (error) return allow(tier, companyId, limit); // fail open on infra error

    const used = Number(row?.ai_calls ?? 0);
    if (used < limit) return allow(tier, companyId, limit, used);

    return {
      allowed: false,
      limit,
      used,
      tier,
      companyId,
      retryAfter: secondsUntilNextMonth(),
      reason:
        `Your ${tier} plan includes ${limit} AI requests per month and you have used ${used}. ` +
        `The quota resets at the start of next month. Upgrade your plan for a higher limit.`,
    };
  } catch (_err) {
    // Never block legitimate work because the quota check itself failed.
    return allow("unknown", opts.companyId ?? null);
  }
}

/**
 * Record one (or more) successful AI calls against the company's monthly counter.
 * Best-effort and atomic (single UPSERT via the increment_ai_usage RPC); a failure
 * here never breaks the user-facing response. Pass a SERVICE-ROLE client.
 */
export async function recordAiUsage(
  // deno-lint-ignore no-explicit-any
  serviceClient: any,
  opts: { companyId: string | null; calls?: number; tokens?: number },
): Promise<void> {
  if (!opts.companyId) return;
  try {
    const { error } = await serviceClient.rpc("increment_ai_usage", {
      p_company_id: opts.companyId,
      p_calls: opts.calls ?? 1,
      p_tokens: opts.tokens ?? 0,
    });
    if (error) console.error("[AIQuota] increment_ai_usage failed:", error);
  } catch (err) {
    console.error("[AIQuota] increment_ai_usage threw:", err);
  }
}

/** Build a 429 response for an exceeded monthly AI quota. */
export function aiQuotaResponse(
  result: AiQuotaResult,
  corsHeaders: Record<string, string> = {},
): Response {
  return new Response(
    JSON.stringify({
      error: result.reason ?? "Monthly AI usage limit reached",
      quota: { limit: result.limit, used: result.used, tier: result.tier },
      retryAfter: result.retryAfter,
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Retry-After": String(result.retryAfter),
        "X-AI-Quota-Limit": String(result.limit),
        "X-AI-Quota-Used": String(result.used),
        "X-AI-Quota-Remaining": String(Math.max(0, result.limit - result.used)),
      },
    },
  );
}
