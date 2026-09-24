import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { getCorsHeaders } from '../_shared/secure-cors.ts';
import { initializeAuthContext, errorResponse } from '../_shared/auth-helpers.ts';
import { escapeHtml } from '../_shared/html-escape.ts';
import { validateBody } from "../_shared/validate-body.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { captureException } from '../_shared/observability.ts';
import { sendEmail } from '../_shared/ses-email-service.ts';

// Sent by src/components/support/CustomerSupportChat.tsx. customerEmail is the
// caller's own profile email there.
const SupportNotificationSchema = z.object({
  ticketId: z.string().max(100).nullish(),
  ticketNumber: z.union([z.string().max(100), z.number()]).nullish(),
  customerName: z.string().max(200).nullish(),
  customerEmail: z.string().max(320).nullish(),
  subject: z.string().max(500).nullish(),
  description: z.string().max(10000).nullish(),
  priority: z.string().max(50).nullish(),
  category: z.string().max(100).nullish(),
}).passthrough();

const str = (v: unknown): string => (v === null || v === undefined ? '' : String(v));
// Subject lines are headers, not HTML: unescaped, but on one line.
const oneLine = (v: unknown): string => str(v).replace(/[\r\n]+/g, ' ').slice(0, 200);

const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {

    // Authenticate the caller. This sends as Brikly to
    // support@brikly.net AND to a body-supplied customerEmail, and had no auth
    // of its own: verify_jwt = true only means a validly-signed project JWT is
    // present, and the anon key is one (US-241).
    const authContext = await initializeAuthContext(req);
    if (!authContext) {
      return errorResponse('Unauthorized', 401, req);
    }

    const parsed = await validateBody(req, SupportNotificationSchema, { name: 'send-support-notification' });
    if (!parsed.ok) return parsed.response;
    const body = parsed.data;

    // Everything below lands in HTML mail sent as support@brikly.net, so every
    // body value is escaped before interpolation.
    const ticketNumber = escapeHtml(str(body.ticketNumber));
    const customerName = escapeHtml(str(body.customerName));
    const subject = escapeHtml(str(body.subject));
    const description = escapeHtml(str(body.description));
    const rawPriority = str(body.priority) || 'medium';
    const priority = escapeHtml(rawPriority);
    const category = escapeHtml(str(body.category));

    // The confirmation goes to the caller's own address, never to a
    // body-supplied one. Taking `to` from the body let any signed-in user send
    // Brikly-branded mail, with their own HTML in it, to any address (US-241).
    // The only caller already sends the caller's profile email here.
    const callerEmail = authContext.user.email ?? '';
    const bodyEmail = str(body.customerEmail);
    if (bodyEmail && bodyEmail.toLowerCase() !== callerEmail.toLowerCase()) {
      console.warn('[send-support-notification] body customerEmail differs from the caller; using the caller address');
    }
    const customerEmail = escapeHtml(callerEmail);
    if (!callerEmail) {
      return errorResponse('Your account has no email address', 400, req);
    }

    console.log("Processing support notification for ticket:", ticketNumber);

    // US-253: both go through SES via the shared sender (retry, delivery log,
    // Sentry on failure).
    // Send notification to admin
    const adminEmailResponse = await sendEmail({
      from: "support@brikly.net",
      fromName: "Brikly Support",
      to: ["support@brikly.net"],
      template: 'support_ticket_admin',
      source: 'send-support-notification',
      subject: `New Support Ticket: ${oneLine(body.ticketNumber)} - ${oneLine(body.subject)}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1f2937; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">
            New Support Ticket Created
          </h2>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #3b82f6; margin-top: 0;">Ticket Details</h3>
            <p><strong>Ticket Number:</strong> ${ticketNumber}</p>
            <p><strong>Subject:</strong> ${subject}</p>
            <p><strong>Priority:</strong> <span style="color: ${getPriorityColor(rawPriority)}; font-weight: bold;">${escapeHtml(rawPriority.toUpperCase())}</span></p>
            <p><strong>Category:</strong> ${category}</p>
          </div>

          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #3b82f6; margin-top: 0;">Customer Information</h3>
            <p><strong>Name:</strong> ${customerName}</p>
            <p><strong>Email:</strong> ${customerEmail}</p>
          </div>

          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #3b82f6; margin-top: 0;">Description</h3>
            <p style="white-space: pre-wrap;">${description}</p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="https://brikly.net/support" 
               style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View Ticket in Dashboard
            </a>
          </div>
        </div>
      `,
    });

    // Send confirmation to customer
    const customerEmailResponse = await sendEmail({
      from: "support@brikly.net",
      fromName: "Brikly Support",
      to: [callerEmail],
      template: 'support_ticket_confirmation',
      source: 'send-support-notification',
      subject: `Support Ticket Created: ${oneLine(body.ticketNumber)}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1f2937; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">
            Support Ticket Confirmation
          </h2>
          
          <p>Dear ${customerName},</p>
          
          <p>Thank you for contacting Brikly support. We have received your support request and created ticket <strong>${ticketNumber}</strong>.</p>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #3b82f6; margin-top: 0;">Your Ticket Details</h3>
            <p><strong>Ticket Number:</strong> ${ticketNumber}</p>
            <p><strong>Subject:</strong> ${subject}</p>
            <p><strong>Priority:</strong> ${priority}</p>
            <p><strong>Status:</strong> Open</p>
          </div>
          
          <p>Our support team will review your request and respond within:</p>
          <ul>
            <li><strong>Urgent:</strong> 2 hours</li>
            <li><strong>High:</strong> 4 hours</li>
            <li><strong>Medium:</strong> 8 hours</li>
            <li><strong>Low:</strong> 24 hours</li>
          </ul>
          
          <p>You can reply to this email to add additional information to your ticket, or contact us directly at support@brikly.net.</p>
          
          <p>Best regards,<br>Brikly Support Team</p>
        </div>
      `,
    });

    if (!adminEmailResponse.success || !customerEmailResponse.success) {
      // This used to report success whatever the provider answered.
      throw new Error(
        `Support email not sent: ${adminEmailResponse.error ?? customerEmailResponse.error ?? 'unknown error'}`,
      );
    }

    console.log("Email notifications sent successfully");
    console.log("Admin email:", adminEmailResponse);
    console.log("Customer email:", customerEmailResponse);

    return new Response(
      JSON.stringify({
        timestamp: new Date().toISOString(), 
        success: true,
        adminEmailId: adminEmailResponse.messageId ?? adminEmailResponse.deliveryId,
        customerEmailId: customerEmailResponse.messageId ?? customerEmailResponse.deliveryId
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    await captureException(error, { fn: 'send-support-notification', req });
    console.error("Error in send-support-notification function:", error);
    return new Response(
      JSON.stringify({ success: false, timestamp: new Date().toISOString(), error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

function getPriorityColor(priority: string): string {
  switch (priority.toLowerCase()) {
    case 'urgent':
      return '#dc2626';
    case 'high':
      return '#ea580c';
    case 'medium':
      return '#d97706';
    case 'low':
      return '#059669';
    default:
      return '#6b7280';
  }
}

serve(handler);