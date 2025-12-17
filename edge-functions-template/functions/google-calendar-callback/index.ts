// Google Calendar Callback Edge Function
// Updated with multi-tenant site_id isolation
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  console.log(`[GOOGLE-CALENDAR-CALLBACK] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

serve(async (req) => {
  try {
    logStep("Function started", { method: req.method });

    // Use service role for callback (no user JWT available)
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const clientId = Deno.env.get("GOOGLE_OAuth_CLIENT_ID");
    const clientSecret = Deno.env.get("GOOGLE_OAuth_CLIENT_SECRET");

    if (!clientId || !clientSecret) {
      throw new Error("Google OAuth credentials not configured");
    }

    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    if (error) {
      logStep("OAuth error", { error });
      return new Response(`
        <html>
          <body>
            <h1>Authorization Failed</h1>
            <p>Error: ${error}</p>
            <script>window.close();</script>
          </body>
        </html>
      `, {
        headers: { "Content-Type": "text/html" },
        status: 400,
      });
    }

    if (!code || !state) {
      throw new Error("Missing code or state parameter");
    }

    // Decode state to get company_id and site_id
    const stateData = JSON.parse(atob(state));
    const { company_id, site_id: siteId } = stateData;
    logStep("State decoded", { company_id, siteId });

    // Exchange code for tokens
    const redirectUri = `${url.origin}/functions/v1/google-calendar-callback`;
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error(`Token exchange failed: ${tokenResponse.statusText}`);
    }

    const tokens = await tokenResponse.json();
    logStep("Tokens received", { hasAccessToken: !!tokens.access_token });

    // Get user info from Google
    const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    if (!userInfoResponse.ok) {
      throw new Error(`Failed to get user info: ${userInfoResponse.statusText}`);
    }

    const userInfo = await userInfoResponse.json();
    logStep("User info received", { email: userInfo.email });

    // Store integration in database with site isolation
    const { error: dbError } = await supabaseClient
      .from('calendar_integrations')
      .upsert({
        site_id: siteId,  // CRITICAL: Site isolation
        company_id,
        provider: 'google',
        account_email: userInfo.email,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: new Date(Date.now() + (tokens.expires_in * 1000)).toISOString(),
        is_active: true,
        sync_enabled: true,
      }, {
        onConflict: 'site_id,company_id,provider,account_email'  // Updated conflict resolution
      });

    if (dbError) {
      logStep("Database error", { error: dbError });
      throw new Error(`Database error: ${dbError.message}`);
    }

    logStep("Integration saved successfully");

    return new Response(`
      <html>
        <body>
          <h1>Google Calendar Connected Successfully!</h1>
          <p>Your Google Calendar has been connected. You can now close this window.</p>
          <script>
            setTimeout(() => {
              window.close();
            }, 2000);
          </script>
        </body>
      </html>
    `, {
      headers: { "Content-Type": "text/html" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    
    return new Response(`
      <html>
        <body>
          <h1>Integration Failed</h1>
          <p>Error: ${errorMessage}</p>
          <script>window.close();</script>
        </body>
      </html>
    `, {
      headers: { "Content-Type": "text/html" },
      status: 500,
    });
  }
});