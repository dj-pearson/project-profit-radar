import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/secure-cors.ts';
import { initializeAuthContext, errorResponse } from '../_shared/auth-helpers.ts';
import { captureException } from '../_shared/observability.ts';
import { sendEmail } from '../_shared/ses-email-service.ts';


// Input validation schema
const notificationRequestSchema = z.object({
  type: z.string().min(1).max(50),
  to: z.string().email('Invalid email address'),
  subject: z.string().min(1).max(200),
  content: z.string().max(50000),
  template: z.string().max(100000).optional(),
  variables: z.record(z.string(), z.any()).optional(),
});

type NotificationRequest = z.infer<typeof notificationRequestSchema>;

/**
 * HTML-escape a string to prevent XSS attacks
 * SECURITY: All user-provided values must be escaped before insertion into HTML
 */
function escapeHtml(str: string): string {
  if (typeof str !== 'string') return String(str);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const handler = async (req: Request): Promise<Response> => {
  // Use secure CORS (whitelist-based)
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(req);
  }

  try {
    // Authenticate the caller.
    //
    // This handler validated its body carefully and never asked who was
    // calling. It sent through Resend (now SES, US-253) as "Brikly <...>" to a body-supplied
    // address, and being absent from supabase/config.toml gave it
    // verify_jwt = true - which only means a validly-signed project JWT is
    // present, and the publishable anon key is one, and it ships in the client
    // bundle. So it was an open mail relay on Brikly's Resend account and
    // sending reputation: arbitrary recipient, arbitrary body, Brikly's name on
    // it (US-241).
    //
    // Zod did not help here, and could not: every field was well-formed. The
    // missing check was who, not what.
    const authContext = await initializeAuthContext(req);
    if (!authContext) {
      return errorResponse('Unauthorized', 401, req);
    }

    const rawBody = await req.json();

    // Validate input
    const validation = notificationRequestSchema.safeParse(rawBody);
    if (!validation.success) {
      console.error("Validation error:", validation.error);
      return new Response(
        JSON.stringify({ success: false, timestamp: new Date().toISOString(), error: "Invalid request parameters" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { type, to, subject, content, template, variables } = validation.data;

    console.log("Sending notification:", { type, to, subject });

    let emailContent = content;

    // Apply template variables if provided
    // SECURITY: HTML-escape all variable values to prevent XSS
    if (template && variables) {
      emailContent = template;
      Object.entries(variables).forEach(([key, value]) => {
        // Escape the value to prevent HTML/script injection
        const escapedValue = escapeHtml(String(value));
        emailContent = emailContent.replace(new RegExp(`{{${key}}}`, 'g'), escapedValue);
      });
    }

    // The ledger row is scoped to the caller's company, read from their own
    // profile rather than the body.
    const { data: callerProfile } = await authContext.supabase
      .from('user_profiles')
      .select('company_id')
      .eq('id', authContext.user.id)
      .maybeSingle();

    // US-253: SES through the shared sender (retry, delivery log, Sentry).
    const delivery = await sendEmail({
      to,
      from: 'notifications@brikly.net',
      fromName: 'Brikly',
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          ${emailContent}
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">
            This is an automated notification from Brikly Construction Management Platform.
          </p>
        </div>
      `,
      companyId: (callerProfile?.company_id as string | undefined) ?? null,
      template: type ? `notification_${type}` : 'notification',
      source: 'send-notification',
    });

    if (!delivery.success) {
      throw new Error(`Notification email not sent: ${delivery.error ?? 'unknown error'}`);
    }

    // Same shape the Resend SDK returned, so a caller reading emailResponse.data.id keeps working.
    const emailResponse = { data: { id: delivery.messageId ?? delivery.deliveryId ?? null }, error: null };
    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ timestamp: new Date().toISOString(), success: true, emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    await captureException(error, { fn: 'send-notification', req });
    console.error("Error sending notification:", error);
    // SECURITY: Don't expose internal error details to clients
    return new Response(
      JSON.stringify({ success: false, timestamp: new Date().toISOString(), error: "Failed to send notification" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);