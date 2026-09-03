// The prospect's view of an estimate, and their acceptance of it (US-325).
//
// PUBLIC BY DESIGN, which is the whole point and also the whole risk. A person
// deciding whether to hire a contractor does not have an account and should
// not need one; asking them to make one before they have agreed loses the job.
// So this is the one surface in the product an unauthenticated stranger can
// reach, and it is written accordingly:
//
//   * The token is the credential. 32 bytes of crypto randomness, looked up on
//     an exact match, and never used as a database credential - this function
//     holds the service role and the caller holds only a string.
//   * It returns ONLY what a prospect needs to decide: the estimate, its
//     lines, the company's name. Not the client's other jobs, not internal
//     costs, not who else was quoted.
//   * Expired, revoked and already-accepted links are refused with a reason,
//     because a prospect who cannot tell why the page is blank calls the
//     contractor, and the contractor cannot tell either.
//   * Acceptance is rate limited per token: a signature is a legal act and a
//     stranger holding a link should not be able to spam the estimator's
//     inbox or the acceptance table with it.
//
// A GET-shaped read and a POST acceptance, so a link preview crawler that
// fetches the URL cannot accept a contract.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { getCorsHeaders } from "../_shared/secure-cors.ts";
import { checkRateLimit } from "../_shared/rate-limiter.ts";
import { writeAuditLog } from "../_shared/audit-log.ts";

const logStep = (step: string, details?: unknown) => {
  console.log(`[PUBLIC-ESTIMATE] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

const ViewSchema = z.object({
  action: z.literal("view"),
  token: z.string().regex(/^[a-f0-9]{64}$/, "Invalid link"),
});

const AcceptSchema = z.object({
  action: z.literal("accept"),
  token: z.string().regex(/^[a-f0-9]{64}$/, "Invalid link"),
  accepted_by_name: z.string().trim().min(1, "Please enter your name").max(200),
  accepted_by_email: z.string().email().optional().nullable(),
  signature: z.string().min(1, "A signature is required").max(500_000),
  signature_type: z.enum(["typed", "drawn"]).default("typed"),
});

/** Never leak which of the several reasons applies beyond what helps the user. */
const LINK_UNUSABLE =
  "This estimate link is no longer active. Ask your contractor to send a new one.";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // The mandated envelope, spelled out rather than spread, so both a reader
  // and the US-274 guard can see the shape at the point it is built. This
  // function cannot use successResponse/errorResponse from _shared: those add
  // auth-aware headers for an authenticated caller, and this endpoint is
  // deliberately anonymous.
  const json = (
    body: { success: boolean; data?: unknown; error?: string },
    status = 200,
  ) =>
    new Response(
      JSON.stringify({
        success: body.success,
        data: body.data,
        error: body.error,
        timestamp: new Date().toISOString(),
      }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );

  if (req.method !== "POST") {
    return json({ success: false, error: "Method not allowed" }, 405);
  }

  try {
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const raw = await req.json().catch(() => null);
    if (!raw) return json({ success: false, error: "Invalid request" }, 400);

    const view = ViewSchema.safeParse(raw);
    const accept = AcceptSchema.safeParse(raw);
    if (!view.success && !accept.success) {
      const issue = accept.error?.errors?.[0]?.message
        || view.error?.errors?.[0]?.message
        || "Invalid request";
      return json({ success: false, error: issue }, 400);
    }

    const token = view.success ? view.data.token : accept.data!.token;

    // Anonymous and unauthenticated, so the token is the only identity there
    // is. Throttle on it rather than on a user id.
    const limit = await checkRateLimit(serviceClient, {
      identifier: token,
      endpoint: accept.success ? "public-estimate:accept" : "public-estimate:view",
      maxRequests: accept.success ? 5 : 60,
      windowMinutes: 5,
    });
    if (!limit.allowed) {
      return json({ success: false, error: "Too many requests. Please wait a moment." }, 429);
    }

    const { data: link } = await serviceClient
      .from("estimate_share_links")
      .select("id, estimate_id, company_id, recipient_email, version_number, expires_at, revoked_at, accepted_at, first_viewed_at")
      .eq("token", token)
      .maybeSingle();

    if (!link || link.revoked_at || new Date(link.expires_at) < new Date()) {
      return json({ success: false, error: LINK_UNUSABLE }, 404);
    }

    const { data: estimate } = await serviceClient
      .from("estimates")
      .select("id, estimate_number, title, description, client_name, total_amount, subtotal, tax_amount, tax_percentage, discount_amount, valid_until, status, version_number, terms_and_conditions, notes")
      .eq("id", link.estimate_id)
      .maybeSingle();

    if (!estimate) {
      return json({ success: false, error: LINK_UNUSABLE }, 404);
    }

    // The price the link was sent for. If the estimator has since saved a new
    // version, this link is stale and must not be accepted at the old figure
    // or the new one.
    if (link.version_number !== null && estimate.version_number !== link.version_number) {
      return json({
        success: false,
        error: "This estimate has been revised. Ask your contractor for the current version.",
      }, 409);
    }

    const { data: company } = await serviceClient
      .from("companies")
      .select("name")
      .eq("id", link.company_id)
      .maybeSingle();

    const { data: lineItems } = await serviceClient
      .from("estimate_line_items")
      .select("item_name, description, quantity, unit, unit_cost, total_cost, sort_order")
      .eq("estimate_id", estimate.id)
      .order("sort_order", { ascending: true });

    // ---------------------------------------------------------------- view
    if (view.success) {
      if (!link.first_viewed_at) {
        const now = new Date().toISOString();

        // None of these three is worth failing the prospect's page over: they
        // came to read an estimate, and a missing read-receipt is the
        // estimator's problem, not theirs. But an unread error here is how
        // "have they even opened it?" silently stops working, so each is read
        // and logged.
        const [viewedMark, viewedComm, statusMove] = await Promise.all([
          serviceClient
            .from("estimate_share_links")
            .update({ first_viewed_at: now })
            .eq("id", link.id),
          serviceClient.from("estimate_communications").insert({
            estimate_id: estimate.id,
            communication_type: "viewed",
            recipient_email: link.recipient_email,
            viewed_at: now,
          }),
          estimate.status === "sent"
            ? serviceClient
                .from("estimates")
                .update({ status: "viewed", updated_at: now })
                .eq("id", estimate.id)
                .eq("status", "sent")
            : Promise.resolve({ error: null }),
        ]);

        if (viewedMark.error) logStep("View not marked on the link", viewedMark.error.message);
        if (viewedComm.error) logStep("View receipt not written", viewedComm.error.message);
        if (statusMove.error) logStep("Status not moved to viewed", statusMove.error.message);
      }

      return json({
        success: true,
        data: {
          companyName: company?.name || "Your contractor",
          estimate,
          lineItems: lineItems || [],
          alreadyAccepted: Boolean(link.accepted_at) || estimate.status === "accepted",
        },
      });
    }

    // -------------------------------------------------------------- accept
    const body = accept.data!;

    if (link.accepted_at || estimate.status === "accepted" || estimate.status === "converted") {
      return json({
        success: false,
        error: "This estimate has already been accepted.",
      }, 409);
    }

    const { error: acceptError } = await serviceClient
      .from("estimate_acceptances")
      .insert({
        estimate_id: estimate.id,
        company_id: link.company_id,
        share_link_id: link.id,
        accepted_by_name: body.accepted_by_name,
        accepted_by_email: body.accepted_by_email || link.recipient_email,
        signature: body.signature,
        signature_type: body.signature_type,
        // Frozen. An acceptance that records only "they agreed" is worth
        // little once the estimate has been edited.
        accepted_total: estimate.total_amount,
        version_number: estimate.version_number,
        ip_address: req.headers.get("x-forwarded-for")
          || req.headers.get("cf-connecting-ip")
          || null,
        user_agent: req.headers.get("user-agent"),
      });

    if (acceptError) {
      logStep("Acceptance insert failed", acceptError.message);
      return json({
        success: false,
        error: "Your acceptance could not be recorded. Please try again or contact your contractor.",
      }, 500);
    }

    // The trigger on estimate_acceptances moves the estimate to accepted and
    // spends the other links.
    const { error: acceptCommError } = await serviceClient
      .from("estimate_communications")
      .insert({
        estimate_id: estimate.id,
        communication_type: "accepted",
        recipient_email: link.recipient_email,
        responded_at: new Date().toISOString(),
        message: `Accepted by ${body.accepted_by_name}`,
      });

    // The acceptance itself is recorded and the trigger has moved the
    // estimate; this row is the history entry. Log rather than fail, so the
    // customer is not told their acceptance failed when it did not.
    if (acceptCommError) {
      logStep("Acceptance receipt not written", acceptCommError.message);
    }

    await writeAuditLog(serviceClient, {
      actorUserId: null,
      companyId: link.company_id,
      action: "estimate.accepted",
      entityType: "estimate",
      entityId: estimate.id,
      after: {
        accepted_by: body.accepted_by_name,
        total: estimate.total_amount,
        version: estimate.version_number,
      },
      description: `Estimate ${estimate.estimate_number} accepted by ${body.accepted_by_name}`,
      riskLevel: "high",
    });

    logStep("Estimate accepted", { estimateId: estimate.id });
    return json({
      success: true,
      data: { accepted: true, companyName: company?.name || "Your contractor" },
    });
  } catch (err) {
    logStep("Unhandled error", err instanceof Error ? err.message : String(err));
    return json({ success: false, error: "An unexpected error occurred" }, 500);
  }
});
