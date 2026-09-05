// Send an estimate to a prospect (US-325).
//
// "Send to Client" ran update({ status: 'sent' }) and nothing else: no email,
// no link, no estimate_communications row, though that table exists for
// exactly this and had never been written by anything. The customer was never
// told a proposal existed, and the estimator could not tell whether it had
// been seen.
//
// The link is tokenised and public rather than portal-based on purpose. Portal
// access means an account, and asking someone to create one before they have
// agreed to hire you loses the job. The token is therefore a credential: 32
// bytes of crypto randomness, scoped to one estimate version, expiring, and
// spent as soon as a version supersedes it.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import {
  initializeAuthContext,
  errorResponse,
  successResponse,
} from "../_shared/auth-helpers.ts";
import { getCorsHeaders } from "../_shared/secure-cors.ts";
import { writeAuditLog } from "../_shared/audit-log.ts";
import { sendEmail, getSiteEmailConfig } from "../_shared/ses-email-service.ts";
import { escapeHtml } from "../_shared/invite-email.ts";

const logStep = (step: string, details?: unknown) => {
  console.log(`[SEND-ESTIMATE] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

const FRONTEND_URL = Deno.env.get("FRONTEND_URL") || "https://brikly.net";

const SendEstimateSchema = z.object({
  estimate_id: z.string().uuid("A valid estimate id is required"),
  to: z.string().email().optional().nullable(),
  message: z.string().trim().max(2000).optional().nullable(),
  expires_in_days: z.number().int().min(1).max(365).optional(),
});

const CAN_SEND = new Set(["admin", "root_admin", "project_manager", "office_staff"]);

/** The token is the only thing standing between a stranger and this price. */
function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const money = (amount: number): string =>
  amount.toLocaleString("en-US", { style: "currency", currency: "USD" });

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405, req);
  }

  try {
    const authContext = await initializeAuthContext(req);
    if (!authContext) {
      return errorResponse("Unauthorized - missing or invalid authentication", 401, req);
    }
    const { user, supabase } = authContext;

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role, company_id, first_name, last_name")
      .eq("id", user.id)
      .single();

    if (!profile?.company_id) {
      return errorResponse("Your account is not associated with a company", 403, req);
    }
    if (!CAN_SEND.has(profile.role)) {
      return errorResponse("You do not have permission to send estimates", 403, req);
    }

    let payload: z.infer<typeof SendEstimateSchema>;
    try {
      payload = SendEstimateSchema.parse(await req.json());
    } catch (err) {
      const message = err instanceof z.ZodError
        ? err.errors.map((e) => e.message).join("; ")
        : "Invalid request body";
      return errorResponse(message, 400, req);
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const { data: estimate } = await serviceClient
      .from("estimates")
      .select("id, estimate_number, title, company_id, client_name, client_email, total_amount, valid_until, status, version_number")
      .eq("id", payload.estimate_id)
      .maybeSingle();

    if (!estimate || estimate.company_id !== profile.company_id) {
      return errorResponse("That estimate is not in your company", 404, req);
    }
    if (estimate.status === "accepted" || estimate.status === "converted") {
      return errorResponse(
        "This estimate has already been accepted. Create a new version to send a revised price.",
        409,
        req,
      );
    }

    const recipient = (payload.to || estimate.client_email || "").trim();
    if (!recipient) {
      return errorResponse(
        "This estimate has no client email. Add one before sending it.",
        400,
        req,
      );
    }

    // Supersede every live link for this estimate. A customer must never be
    // able to accept a price that has been withdrawn or revised - so if this
    // fails, do NOT mint a second live link on top of the old one.
    const { error: supersedeError } = await serviceClient
      .from("estimate_share_links")
      .update({ revoked_at: new Date().toISOString() })
      .eq("estimate_id", estimate.id)
      .is("revoked_at", null);

    if (supersedeError) {
      logStep("Could not supersede the previous links", supersedeError.message);
      return errorResponse(
        "The previous estimate link could not be withdrawn, so a new one was not sent. Please try again.",
        500,
        req,
      );
    }

    const token = generateToken();
    const expiresAt = new Date(
      Date.now() + (payload.expires_in_days ?? 60) * 24 * 60 * 60 * 1000,
    ).toISOString();

    const { error: linkError } = await serviceClient
      .from("estimate_share_links")
      .insert({
        estimate_id: estimate.id,
        company_id: estimate.company_id,
        token,
        recipient_email: recipient,
        version_number: estimate.version_number,
        expires_at: expiresAt,
        created_by: user.id,
      });

    if (linkError) {
      logStep("Link creation failed", linkError.message);
      return errorResponse("Could not create the estimate link", 500, req);
    }

    const { data: company } = await serviceClient
      .from("companies")
      .select("name")
      .eq("id", estimate.company_id)
      .maybeSingle();

    const companyName = company?.name || "Your contractor";
    const senderName = [profile.first_name, profile.last_name]
      .filter(Boolean).join(" ").trim() || companyName;
    const siteConfig = await getSiteEmailConfig();
    const link = `${FRONTEND_URL}/estimate/${token}`;
    const validUntil = estimate.valid_until
      ? new Date(estimate.valid_until).toLocaleDateString("en-US", {
          year: "numeric", month: "long", day: "numeric",
        })
      : null;

    const html = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#1f2933;">
        <h1 style="font-size:22px;font-weight:600;margin:0 0 16px;">
          Your estimate from ${escapeHtml(companyName)}
        </h1>
        <p style="font-size:15px;line-height:1.6;margin:0 0 8px;">
          Hi ${escapeHtml(estimate.client_name || "there")},
        </p>
        <p style="font-size:15px;line-height:1.6;margin:0 0 16px;">
          ${escapeHtml(senderName)} has put together an estimate for
          ${escapeHtml(estimate.title || "your project")}:
          <strong>${money(Number(estimate.total_amount ?? 0))}</strong>${validUntil ? `, valid until ${escapeHtml(validUntil)}` : ""}.
        </p>
        ${payload.message ? `<p style="font-size:15px;line-height:1.6;margin:0 0 16px;">${escapeHtml(payload.message)}</p>` : ""}
        <p style="margin:24px 0;">
          <a href="${link}"
             style="display:inline-block;background:${siteConfig.primaryColor};color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-size:15px;font-weight:600;">
            Review and accept
          </a>
        </p>
        <p style="font-size:13px;line-height:1.6;color:#52606d;margin:0;">
          You can read the full breakdown and accept it there. No account needed.
          Questions? Just reply to this email.
        </p>
      </div>`;

    const text = [
      `Your estimate from ${companyName}`,
      "",
      `${senderName} has put together an estimate for ${estimate.title || "your project"}: ` +
      `${money(Number(estimate.total_amount ?? 0))}${validUntil ? `, valid until ${validUntil}` : ""}.`,
      payload.message ? `\n${payload.message}` : "",
      "",
      "Review and accept:",
      link,
    ].filter(Boolean).join("\n");

    const delivery = await sendEmail({
      to: recipient,
      subject: `Your estimate from ${companyName}`,
      html,
      text,
    }, siteConfig);

    if (!delivery.success) {
      // The link exists but nobody has it. Revoke rather than leave a live
      // credential nobody asked for.
      const { error: revokeError } = await serviceClient
        .from("estimate_share_links")
        .update({ revoked_at: new Date().toISOString() })
        .eq("token", token);

      if (revokeError) {
        // A live credential nobody was given. Loud, because it cannot be
        // cleaned up from the UI.
        logStep("ORPHANED LINK: send failed and the link could not be revoked", {
          token: token.slice(0, 8),
          error: revokeError.message,
        });
      }

      logStep("Send failed", delivery.error);
      return errorResponse(delivery.error || "The estimate email could not be sent", 502, req);
    }

    // The communications row this table was created for in 20250712210005 and
    // that nothing has ever written.
    const { error: commError } = await serviceClient
      .from("estimate_communications")
      .insert({
        estimate_id: estimate.id,
        communication_type: "sent",
        recipient_email: recipient,
        subject: `Your estimate from ${companyName}`,
        message: payload.message || null,
        sent_at: new Date().toISOString(),
        created_by: user.id,
      });

    // The email is already away, so this is not a failed send. It does mean
    // the estimator's history is missing an entry, which is worth knowing.
    if (commError) {
      logStep("Communication row not written", commError.message);
    }

    const { error: statusError } = await serviceClient
      .from("estimates")
      .update({
        status: estimate.status === "draft" ? "sent" : estimate.status,
        sent_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", estimate.id);

    if (statusError) {
      logStep("Status update failed after a successful send", statusError.message);
    }

    await writeAuditLog(serviceClient, {
      actorUserId: user.id,
      companyId: estimate.company_id,
      action: "estimate.sent",
      entityType: "estimate",
      entityId: estimate.id,
      after: { to: recipient, total: estimate.total_amount, version: estimate.version_number },
      description: `Sent estimate ${estimate.estimate_number} to ${recipient}`,
      riskLevel: "medium",
    });

    logStep("Estimate sent", { estimateId: estimate.id, to: recipient });
    return successResponse({ estimateId: estimate.id, to: recipient, link, sent: true }, req);
  } catch (err) {
    logStep("Unhandled error", err instanceof Error ? err.message : String(err));
    return errorResponse("An unexpected error occurred", 500, req);
  }
});
