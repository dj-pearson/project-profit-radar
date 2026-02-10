// Send Usage Alert Edge Function
// Sends an alert when a company approaches their usage limits
import { createClient } from "npm:@supabase/supabase-js@2";
import { errorResponse, successResponse } from '../_shared/auth-helpers.ts';
import { getCorsHeaders } from '../_shared/secure-cors.ts';
import { sendEmail } from '../_shared/ses-email-service.ts';

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-USAGE-ALERT] ${step}${detailsStr}`);
};

export default async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const body = await req.json();
    const { companyId, metricType, totalUsage, limit, usagePercentage } = body;

    if (!companyId || !metricType) {
      return errorResponse('companyId and metricType are required', 400, req);
    }

    logStep("Processing usage alert", { companyId, metricType, usagePercentage });

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get company admin emails
    const { data: company } = await serviceClient
      .from('companies')
      .select('name')
      .eq('id', companyId)
      .single();

    const { data: admins } = await serviceClient
      .from('user_profiles')
      .select('email')
      .eq('company_id', companyId)
      .in('role', ['admin', 'root_admin']);

    if (!admins || admins.length === 0) {
      logStep("No admin users found for company");
      return successResponse({ sent: false, reason: 'No admin users found' }, req);
    }

    const companyName = company?.name || 'Your company';
    const pct = Math.round(usagePercentage);
    const subject = `Usage Alert: ${metricType} at ${pct}% capacity`;
    const message = `
      <p>Hi,</p>
      <p><strong>${companyName}</strong> has reached <strong>${pct}%</strong> of the <strong>${metricType}</strong> usage limit.</p>
      <ul>
        <li>Current usage: <strong>${totalUsage}</strong></li>
        <li>Limit: <strong>${limit}</strong></li>
      </ul>
      <p>Consider upgrading your plan to avoid service interruptions.</p>
    `;

    let sentCount = 0;
    for (const admin of admins) {
      if (!admin.email) continue;
      try {
        await sendEmail({
          to: admin.email,
          subject,
          html: message,
          text: `${companyName} has reached ${pct}% of the ${metricType} usage limit. Current usage: ${totalUsage}/${limit}.`,
        });
        sentCount++;
      } catch (err) {
        logStep("Failed to send to admin", { email: admin.email, error: err.message });
      }
    }

    logStep("Usage alerts sent", { sentCount, totalAdmins: admins.length });
    return successResponse({ sent: true, sentCount }, req);

  } catch (error) {
    logStep("Error", { message: error.message });
    return errorResponse(error.message || 'Internal server error', 500, req);
  }
};
