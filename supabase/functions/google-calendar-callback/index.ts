// Google Calendar Callback Edge Function
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import { escapeHtml } from "../_shared/html-escape.ts";
import { writeAuditLog } from "../_shared/audit-log.ts";
import {
  calendarTokenColumnsForWrite,
  getCalendarTokenKey,
  verifyOAuthState,
} from "../_shared/calendar-oauth.ts";
import { captureException } from '../_shared/observability.ts';
import { rejectBlockedIp } from '../_shared/ip-guard.ts';

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

    // US-205: an address an admin blacklisted in ip_access_control stops here.
    const blockedIp = await rejectBlockedIp(supabaseClient, req, 'google-calendar-callback', corsHeaders);
    if (blockedIp) return blockedIp;

    const clientId = Deno.env.get("GOOGLE_OAUTH_CLIENT_ID");
    const clientSecret = Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET");

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
            <p>Error: ${escapeHtml(error)}</p>
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

    // The state is HMAC-signed by google-calendar-auth and names the company
    // taken from the signed-in caller's profile. It used to be unsigned
    // base64(JSON), so anyone could attach a calendar to any company (US-395).
    const tokenKey = getCalendarTokenKey();
    const verifiedState = await verifyOAuthState(state, tokenKey, 'google');
    if (!verifiedState) {
      logStep("Rejected invalid or expired state");
      return new Response(`
        <html>
          <body>
            <h1>Authorization Failed</h1>
            <p>This connection link is invalid or has expired. Start the connection again from Brikly.</p>
            <script>window.close();</script>
          </body>
        </html>
      `, {
        headers: { "Content-Type": "text/html" },
        status: 400,
      });
    }
    const { company_id, user_id } = verifiedState;

    // The user may have changed company in the 15 minutes the state is valid.
    const { data: stateProfile, error: stateProfileError } = await supabaseClient
      .from('user_profiles')
      .select('company_id')
      .eq('id', user_id)
      .maybeSingle();
    if (stateProfileError || stateProfile?.company_id !== company_id) {
      throw new Error("The account that started this connection no longer belongs to that company");
    }
    logStep("State verified", { company_id });

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
    if (typeof tokens.access_token !== "string" || !tokens.access_token) {
      throw new Error("Token exchange returned no access token");
    }
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

    const accountEmail = userInfo.email;
    if (!accountEmail) {
      throw new Error("The provider did not return an account email address");
    }

    // Tokens are stored encrypted (US-395). A missing refresh_token leaves the
    // stored one in place rather than erasing it.
    const expiresIn = Number(tokens.expires_in);
    const tokenCols = await calendarTokenColumnsForWrite({
      accessToken: tokens.access_token,
      refreshToken: typeof tokens.refresh_token === "string" ? tokens.refresh_token : null,
      expiresAt: new Date(Date.now() + (Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn : 3600) * 1000).toISOString(),
    }, tokenKey);
    if (!tokens.refresh_token) {
      logStep("Provider returned no refresh token; sync will need a reconnect when this access token expires");
    }

    // Store integration in database
    const { error: dbError } = await supabaseClient
      .from('calendar_integrations')
      .upsert({
        company_id,
        provider: 'google',
        account_email: accountEmail,
        ...tokenCols,
        is_active: true,
        sync_enabled: true,
        reauth_required_at: null,
        last_sync_error: null,
      }, {
        onConflict: 'company_id,provider,account_email'
      });

    if (dbError) {
      logStep("Database error", { error: dbError });
      throw new Error(`Database error: ${dbError.message}`);
    }

    logStep("Integration saved successfully");
    await writeAuditLog(supabaseClient, {
      actorUserId: user_id,
      companyId: company_id,
      action: 'calendar_integration.connected',
      entityType: 'calendar_integration',
      after: { provider: 'google', account_email: accountEmail, has_refresh_token: !!tokens.refresh_token },
      riskLevel: 'low',
    });

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
    await captureException(error, { fn: 'google-calendar-callback', req });
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    
    return new Response(`
      <html>
        <body>
          <h1>Integration Failed</h1>
          <p>Error: ${escapeHtml(errorMessage)}</p>
          <script>window.close();</script>
        </body>
      </html>
    `, {
      headers: { "Content-Type": "text/html" },
      status: 500,
    });
  }
});