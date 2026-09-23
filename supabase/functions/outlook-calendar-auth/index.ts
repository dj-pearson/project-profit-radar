// Outlook Calendar Auth Edge Function
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { initializeAuthContext, errorResponse } from '../_shared/auth-helpers.ts';
import { getCorsHeaders } from '../_shared/secure-cors.ts';
import { validateBody } from '../_shared/validate-body.ts';
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// Request body (US-241), report mode by default - see _shared/validate-body.ts.
const CalendarAuthSchema = z.object({
  company_id: z.string().uuid(),
}).passthrough();

const logStep = (step: string, details?: any) => {
  console.log(`[OUTLOOK-CALENDAR-AUTH] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started", { method: req.method });

        const authContext = await initializeAuthContext(req);
    if (!authContext) {
      return errorResponse('Unauthorized', 401);
    }

    const { user, supabase: supabaseClient } = authContext;
    logStep("User authenticated", { userId: user.id });

    const clientId = Deno.env.get("MICROSOFT_CLIENT_ID");
    const clientSecret = Deno.env.get("MICROSOFT_CLIENT_SECRET");

    if (!clientId || !clientSecret) {
      throw new Error("Microsoft OAuth credentials not configured");
    }

    const url = new URL(req.url);
    const method = req.method;

    if (method === "POST") {
      const parsed = await validateBody(req, CalendarAuthSchema, { name: 'outlook-calendar-auth' });
      if (!parsed.ok) return parsed.response;
      const { company_id } = parsed.data;

      if (!company_id) {
        throw new Error("Company ID is required");
      }

            const redirectUri = `${url.origin}/functions/v1/outlook-calendar-callback`;
      const scope = "https://graph.microsoft.com/calendars.read";
      const state = btoa(JSON.stringify({ company_id, }));  
      const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
        `client_id=${clientId}&` +
        `response_type=code&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `scope=${encodeURIComponent(scope)}&` +
        `response_mode=query&` +
        `state=${encodeURIComponent(state)}`;

      logStep("Generated auth URL", { authUrl });

      return new Response(JSON.stringify({ success: true, timestamp: new Date().toISOString(), auth_url: authUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    return new Response(JSON.stringify({ success: false, timestamp: new Date().toISOString(), error: "Method not allowed" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 405,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ success: false, timestamp: new Date().toISOString(), error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});