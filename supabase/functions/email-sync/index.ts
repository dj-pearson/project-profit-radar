// Email Sync Edge Function
// Triggers email synchronization for a connected email account
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import { initializeAuthContext, errorResponse, successResponse } from '../_shared/auth-helpers.ts';
import { getCorsHeaders } from '../_shared/secure-cors.ts';
import { validateBody } from '../_shared/validate-body.ts';
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// Request body (US-241), report mode by default - see _shared/validate-body.ts.
// The account is looked up on the caller's JWT client first, so RLS decides
// whether accountId is theirs before the service-role update runs.
const EmailSyncSchema = z.object({
  action: z.string().max(50),
  accountId: z.string().uuid(),
}).passthrough();

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[EMAIL-SYNC] ${step}${detailsStr}`);
};

export default async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const authContext = await initializeAuthContext(req);
    if (!authContext) {
      return errorResponse('Unauthorized', 401, req);
    }

    const { user, supabase } = authContext;
    const parsed = await validateBody(req, EmailSyncSchema, { name: 'email-sync' });
    if (!parsed.ok) return parsed.response;
    const body = parsed.data;
    const { action, accountId } = body;

    if (!action || !accountId) {
      return errorResponse('action and accountId are required', 400, req);
    }

    logStep("Processing email sync", { action, accountId, userId: user.id });

    // Use service role for writes
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Verify the email account belongs to the user
    const { data: account, error: accountError } = await supabase
      .from('email_accounts')
      .select('*')
      .eq('id', accountId)
      .single();

    if (accountError || !account) {
      return errorResponse('Email account not found', 404, req);
    }

    if (action === 'sync') {
      // Update the last_sync_at timestamp and set sync_enabled
      const { error: updateError } = await serviceClient
        .from('email_accounts')
        .update({
          sync_enabled: true,
          last_sync_at: new Date().toISOString(),
        })
        .eq('id', accountId);

      if (updateError) {
        logStep("Failed to update email account", { error: updateError.message });
        return errorResponse('Failed to initiate sync', 500, req);
      }

      logStep("Email sync initiated successfully");
      return successResponse({ synced: true, accountId }, req);
    }

    return errorResponse(`Unknown action: ${action}`, 400, req);

  } catch (error) {
    logStep("Error", { message: error.message });
    return errorResponse(error.message || 'Internal server error', 500, req);
  }
};
