// Send an invoice to the client (US-324).
//
// generate-invoice creates the row with status 'draft' and never sets sent_at
// or moves the status, and nothing emails the client. So an invoice was raised
// and then sat in the app: the only delivery surface was the client portal,
// which until US-319 was not routed at all. The payment reminder functions key
// on a status that nothing ever set, so they never fired either.
//
// A link rather than a PDF attachment, deliberately. The PDF generator is
// client-side (src/utils/invoicePDFGenerator.ts) and rendering one here would
// mean a second implementation of the same document. The link lands on the
// portal, where the client sees the invoice and can pay it - which is the
// action the email exists to prompt.
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
  console.log(`[SEND-INVOICE] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

const FRONTEND_URL = Deno.env.get("FRONTEND_URL") || "https://brikly.net";

const SendInvoiceSchema = z.object({
  invoice_id: z.string().uuid("A valid invoice id is required"),
  /** Overrides the invoice's stored client email for a one-off resend. */
  to: z.string().email().optional().nullable(),
  message: z.string().trim().max(2000).optional().nullable(),
});

const CAN_SEND = new Set(["admin", "root_admin", "project_manager", "office_staff", "accounting"]);

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
      .select("role, company_id")
      .eq("id", user.id)
      .single();

    if (!profile?.company_id) {
      return errorResponse("Your account is not associated with a company", 403, req);
    }
    if (!CAN_SEND.has(profile.role)) {
      return errorResponse("You do not have permission to send invoices", 403, req);
    }

    let payload: z.infer<typeof SendInvoiceSchema>;
    try {
      payload = SendInvoiceSchema.parse(await req.json());
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

    const { data: invoice } = await serviceClient
      .from("invoices")
      .select("id, invoice_number, company_id, client_name, client_email, total_amount, amount_due, due_date, status, project_id")
      .eq("id", payload.invoice_id)
      .maybeSingle();

    if (!invoice || invoice.company_id !== profile.company_id) {
      return errorResponse("That invoice is not in your company", 404, req);
    }

    const recipient = (payload.to || invoice.client_email || "").trim();
    if (!recipient) {
      return errorResponse(
        "This invoice has no client email. Add one before sending it.",
        400,
        req,
      );
    }

    const { data: company } = await serviceClient
      .from("companies")
      .select("name, stripe_connect_charges_enabled")
      .eq("id", invoice.company_id)
      .maybeSingle();

    const companyName = company?.name || "Your contractor";
    const siteConfig = await getSiteEmailConfig();
    const portalLink = `${FRONTEND_URL}/client-portal`;
    const due = invoice.due_date
      ? new Date(invoice.due_date).toLocaleDateString("en-US", {
          year: "numeric", month: "long", day: "numeric",
        })
      : null;

    // Say what is true about paying online. Telling a client they can pay by
    // card when the contractor has not connected Stripe is the same class of
    // lie as the Pay button that could never be enabled.
    const canPayOnline = company?.stripe_connect_charges_enabled === true;

    const html = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#1f2933;">
        <h1 style="font-size:22px;font-weight:600;margin:0 0 16px;">
          Invoice ${escapeHtml(invoice.invoice_number ?? "")} from ${escapeHtml(companyName)}
        </h1>
        <p style="font-size:15px;line-height:1.6;margin:0 0 8px;">
          Hi ${escapeHtml(invoice.client_name || "there")},
        </p>
        <p style="font-size:15px;line-height:1.6;margin:0 0 16px;">
          ${money(Number(invoice.amount_due ?? invoice.total_amount ?? 0))} is due${due ? ` by ${escapeHtml(due)}` : ""}.
        </p>
        ${payload.message ? `<p style="font-size:15px;line-height:1.6;margin:0 0 16px;">${escapeHtml(payload.message)}</p>` : ""}
        <p style="margin:24px 0;">
          <a href="${portalLink}"
             style="display:inline-block;background:${siteConfig.primaryColor};color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-size:15px;font-weight:600;">
            ${canPayOnline ? "View and pay online" : "View this invoice"}
          </a>
        </p>
        <p style="font-size:13px;line-height:1.6;color:#52606d;margin:0;">
          Questions about this invoice? Reply to this email and it will reach ${escapeHtml(companyName)}.
        </p>
      </div>`;

    const text = [
      `Invoice ${invoice.invoice_number} from ${companyName}`,
      "",
      `${money(Number(invoice.amount_due ?? invoice.total_amount ?? 0))} is due${due ? ` by ${due}` : ""}.`,
      payload.message ? `\n${payload.message}` : "",
      "",
      canPayOnline ? "View and pay online:" : "View this invoice:",
      portalLink,
    ].filter(Boolean).join("\n");

    const delivery = await sendEmail({
      to: recipient,
      subject: `Invoice ${invoice.invoice_number} from ${companyName}`,
      html,
      text,
    }, siteConfig);

    if (!delivery.success) {
      logStep("Send failed", delivery.error);
      return errorResponse(
        delivery.error || "The invoice email could not be sent",
        502,
        req,
      );
    }

    // Only now: an invoice marked sent that was never delivered is what the
    // payment reminder functions would then chase the client about.
    const { error: updateError } = await serviceClient
      .from("invoices")
      .update({
        status: invoice.status === "draft" ? "sent" : invoice.status,
        sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", invoice.id);

    if (updateError) {
      logStep("Status update failed after a successful send", updateError.message);
      return errorResponse(
        "The invoice was emailed but could not be marked as sent. Check it before resending.",
        500,
        req,
      );
    }

    await writeAuditLog(serviceClient, {
      actorUserId: user.id,
      companyId: invoice.company_id,
      action: "invoice.sent",
      entityType: "invoice",
      entityId: invoice.id,
      after: { to: recipient, amount_due: invoice.amount_due },
      description: `Emailed invoice ${invoice.invoice_number} to ${recipient}`,
      riskLevel: "medium",
    });

    logStep("Invoice sent", { invoiceId: invoice.id, to: recipient });
    return successResponse({ invoiceId: invoice.id, to: recipient, sent: true }, req);
  } catch (err) {
    logStep("Unhandled error", err instanceof Error ? err.message : String(err));
    return errorResponse("An unexpected error occurred", 500, req);
  }
});
