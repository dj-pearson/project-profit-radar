// Send Email Edge Function
// Generic email sending function used by impersonation notifications and dunning
import { initializeAuthContext, errorResponse, successResponse } from '../_shared/auth-helpers.ts';
import { getCorsHeaders } from '../_shared/secure-cors.ts';
import { sendEmail, type EmailOptions } from '../_shared/ses-email-service.ts';
import { enforceRateLimit, RATE_LIMITS } from '../_shared/rate-limiter.ts';
import { createServiceClient } from '../_shared/service-client.ts';
import { validateBody } from '../_shared/validate-body.ts';
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { captureException } from '../_shared/observability.ts';

// Request body (US-241), report mode by default - see _shared/validate-body.ts.
const recipient = z.string().email().max(320);
const SendEmailSchema = z.object({
  to: z.union([recipient, z.array(recipient).min(1).max(50)]),
  subject: z.string().min(1).max(500),
  message: z.string().max(100_000).nullish(),
  text: z.string().max(100_000).nullish(),
  template: z.string().max(100).nullish(),
}).passthrough();

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-EMAIL] ${step}${detailsStr}`);
};

// Basic HTML template for transactional emails
function buildHtmlBody(subject: string, message: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #F97316; padding: 20px; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 20px;">Brikly</h1>
  </div>
  <div style="padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <h2 style="margin-top: 0;">${subject}</h2>
    <div style="line-height: 1.6; color: #374151;">${message}</div>
  </div>
  <p style="text-align: center; color: #9CA3AF; font-size: 12px; margin-top: 24px;">
    &copy; ${new Date().getFullYear()} Brikly. All rights reserved.
  </p>
</body>
</html>`;
}

export default async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Auth used to be skipped when no Authorization header was sent, "for
    // internal edge-function-to-edge-function calls". There are none: the two
    // references are commented out, and a service-role bearer never passed
    // initializeAuthContext anyway. What the branch did do was let a request
    // with no header send arbitrary mail if verify_jwt were ever turned off.
    // A signed-in user is now required on every path (US-341).
    const authContext = await initializeAuthContext(req);
    if (!authContext) {
      return errorResponse('Unauthorized', 401, req);
    }
    const sender: string = authContext.user.id;

    // Rate limit (US-243). This is the generic sender, so an unbounded caller
    // burns SES reputation as well as quota. Keyed on the signed-in sender.
    const emailLimited = await enforceRateLimit(
      createServiceClient(), sender, 'send-email',
      RATE_LIMITS.AUTH, corsHeaders,
    );
    if (emailLimited) return emailLimited;

    const parsed = await validateBody(req, SendEmailSchema, { name: 'send-email' });
    if (!parsed.ok) return parsed.response;
    const { to, subject, message, text, template } = parsed.data;

    if (!to || !subject) {
      return errorResponse('to and subject are required', 400, req);
    }

    const emailBody = message || text || '';
    logStep("Sending email", { to, subject, template });

    const emailOptions: EmailOptions = {
      to,
      subject,
      html: buildHtmlBody(subject, emailBody),
      text: emailBody,
    };

    const result = await sendEmail(emailOptions);

    if (!result.success) {
      logStep("Email send failed", { error: result.error });
      return errorResponse(result.error || 'Failed to send email', 500, req);
    }

    logStep("Email sent successfully", { messageId: result.messageId });
    return successResponse({ sent: true, messageId: result.messageId }, req);

  } catch (error) {
    await captureException(error, { fn: 'send-email', req });
    logStep("Error", { message: error.message });
    return errorResponse(error.message || 'Internal server error', 500, req);
  }
};
