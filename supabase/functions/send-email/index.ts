// Send Email Edge Function
// Generic email sending function used by impersonation notifications and dunning
import { initializeAuthContext, errorResponse, successResponse } from '../_shared/auth-helpers.ts';
import { getCorsHeaders } from '../_shared/secure-cors.ts';
import { sendEmail, type EmailOptions } from '../_shared/ses-email-service.ts';

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

    // Auth is optional for internal edge-function-to-edge-function calls
    // but required for direct client calls
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const authContext = await initializeAuthContext(req);
      if (!authContext) {
        return errorResponse('Unauthorized', 401, req);
      }
    }

    const body = await req.json();
    const { to, subject, message, text, template } = body;

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
    logStep("Error", { message: error.message });
    return errorResponse(error.message || 'Internal server error', 500, req);
  }
};
