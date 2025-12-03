/**
 * OAuth SSO Callback Edge Function
 *
 * Handles OAuth 2.0 callback from identity providers
 * Exchanges code for tokens, creates/updates user, establishes session
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// OAuth provider token endpoints
const OAUTH_PROVIDERS: Record<
  string,
  {
    tokenUrl: string;
    userinfoUrl: string;
    emailEndpoint?: string;
  }
> = {
  oauth_microsoft: {
    tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    userinfoUrl: "https://graph.microsoft.com/v1.0/me",
  },
  oauth_github: {
    tokenUrl: "https://github.com/login/oauth/access_token",
    userinfoUrl: "https://api.github.com/user",
    emailEndpoint: "https://api.github.com/user/emails",
  },
};

interface UserInfo {
  email: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  avatarUrl?: string;
  providerId: string;
}

// Fetch user info from provider
async function fetchUserInfo(
  provider: string,
  accessToken: string,
  config: { userinfo_url?: string }
): Promise<UserInfo | null> {
  try {
    const providerConfig = OAUTH_PROVIDERS[provider];
    const userinfoUrl = config.userinfo_url || providerConfig?.userinfoUrl;

    if (!userinfoUrl) {
      console.error("[OAuth] No userinfo URL for provider:", provider);
      return null;
    }

    const response = await fetch(userinfoUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      console.error("[OAuth] Userinfo fetch failed:", await response.text());
      return null;
    }

    const userData = await response.json();

    // Provider-specific parsing
    switch (provider) {
      case "oauth_microsoft": {
        return {
          email: userData.mail || userData.userPrincipalName,
          firstName: userData.givenName,
          lastName: userData.surname,
          name: userData.displayName,
          providerId: userData.id,
        };
      }
      case "oauth_github": {
        let email = userData.email;

        // GitHub might not return email in profile - fetch from emails endpoint
        if (!email && providerConfig.emailEndpoint) {
          const emailResponse = await fetch(providerConfig.emailEndpoint, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: "application/json",
            },
          });

          if (emailResponse.ok) {
            const emails = await emailResponse.json();
            const primaryEmail = emails.find((e: { primary: boolean }) => e.primary);
            email = primaryEmail?.email || emails[0]?.email;
          }
        }

        const nameParts = (userData.name || "").split(" ");
        return {
          email,
          firstName: nameParts[0] || userData.login,
          lastName: nameParts.slice(1).join(" ") || "",
          name: userData.name || userData.login,
          avatarUrl: userData.avatar_url,
          providerId: String(userData.id),
        };
      }
      default: {
        // Generic OAuth userinfo parsing
        return {
          email: userData.email,
          firstName: userData.given_name || userData.first_name,
          lastName: userData.family_name || userData.last_name,
          name: userData.name,
          providerId: userData.sub || userData.id,
        };
      }
    }
  } catch (error) {
    console.error("[OAuth] Userinfo fetch error:", error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const siteUrl = Deno.env.get("SITE_URL") || "https://build-desk.com";

    // Parse callback parameters
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");
    const errorDescription = url.searchParams.get("error_description");

    if (error) {
      console.error("[OAuth] Provider returned error:", error, errorDescription);
      return Response.redirect(`${siteUrl}/auth?error=${encodeURIComponent(error)}`);
    }

    if (!code || !state) {
      console.error("[OAuth] Missing code or state");
      return Response.redirect(`${siteUrl}/auth?error=invalid_callback`);
    }

    // Retrieve and validate stored state
    const { data: storedState, error: stateError } = await supabaseClient
      .from("oauth_pending_states")
      .select("*")
      .eq("state", state)
      .single();

    if (stateError || !storedState) {
      console.error("[OAuth] Invalid or expired state");
      return Response.redirect(`${siteUrl}/auth?error=invalid_state`);
    }

    // Check expiration
    if (new Date(storedState.expires_at) < new Date()) {
      console.error("[OAuth] State expired");
      await supabaseClient.from("oauth_pending_states").delete().eq("state", state);
      return Response.redirect(`${siteUrl}/auth?error=state_expired`);
    }

    // Get SSO connection
    const { data: ssoConnection, error: connectionError } = await supabaseClient
      .from("sso_connections")
      .select("*")
      .eq("id", storedState.connection_id)
      .single();

    if (connectionError || !ssoConnection) {
      console.error("[OAuth] Connection not found");
      return Response.redirect(`${siteUrl}/auth?error=connection_not_found`);
    }

    const oauthConfig = ssoConnection.config as {
      client_id: string;
      client_secret: string;
      token_url?: string;
    };

    // Get provider-specific token URL
    const providerConfig = OAUTH_PROVIDERS[ssoConnection.provider];
    const tokenUrl = oauthConfig.token_url || providerConfig?.tokenUrl;

    if (!tokenUrl) {
      console.error("[OAuth] No token URL configured");
      return Response.redirect(`${siteUrl}/auth?error=misconfigured`);
    }

    // Exchange code for tokens
    const callbackUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/sso-oauth-callback`;

    const tokenParams = new URLSearchParams({
      client_id: oauthConfig.client_id,
      client_secret: oauthConfig.client_secret,
      code,
      grant_type: "authorization_code",
      redirect_uri: callbackUrl,
    });

    // Add PKCE verifier if stored
    if (storedState.code_verifier) {
      tokenParams.set("code_verifier", storedState.code_verifier);
    }

    const tokenResponse = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: tokenParams.toString(),
    });

    if (!tokenResponse.ok) {
      const errorBody = await tokenResponse.text();
      console.error("[OAuth] Token exchange failed:", errorBody);
      return Response.redirect(`${siteUrl}/auth?error=token_exchange_failed`);
    }

    const tokens = await tokenResponse.json();
    const accessToken = tokens.access_token;

    if (!accessToken) {
      console.error("[OAuth] No access token received");
      return Response.redirect(`${siteUrl}/auth?error=no_access_token`);
    }

    // Fetch user info
    const userInfo = await fetchUserInfo(ssoConnection.provider, accessToken, oauthConfig);

    if (!userInfo || !userInfo.email) {
      console.error("[OAuth] Failed to get user info");
      return Response.redirect(`${siteUrl}/auth?error=userinfo_failed`);
    }

    // Validate email domain if restrictions exist
    if (ssoConnection.allowed_domains?.length > 0) {
      const emailDomain = userInfo.email.split("@")[1];
      if (!ssoConnection.allowed_domains.includes(emailDomain)) {
        console.error("[OAuth] Domain not allowed:", emailDomain);
        await supabaseClient.from("security_logs").insert({
          event_type: "oauth_domain_rejected",
          ip_address: req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for"),
          user_agent: req.headers.get("user-agent"),
          details: {
            email: userInfo.email,
            domain: emailDomain,
            allowed_domains: ssoConnection.allowed_domains,
          },
        });
        return Response.redirect(`${siteUrl}/auth?error=domain_not_allowed`);
      }
    }

    // Check if user exists
    const { data: existingUsers } = await supabaseClient.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find((u) => u.email === userInfo.email);

    let userId: string;
    let isNewUser = false;

    if (existingUser) {
      userId = existingUser.id;

      // Update user metadata with latest provider info
      await supabaseClient.auth.admin.updateUserById(userId, {
        user_metadata: {
          ...existingUser.user_metadata,
          oauth_provider: ssoConnection.provider,
          oauth_provider_id: userInfo.providerId,
          avatar_url: userInfo.avatarUrl || existingUser.user_metadata?.avatar_url,
        },
      });
    } else {
      // Create new user
      const { data: newUser, error: createError } = await supabaseClient.auth.admin.createUser({
        email: userInfo.email,
        email_confirm: true,
        user_metadata: {
          first_name: userInfo.firstName,
          last_name: userInfo.lastName,
          full_name: userInfo.name,
          avatar_url: userInfo.avatarUrl,
          oauth_provider: ssoConnection.provider,
          oauth_provider_id: userInfo.providerId,
        },
        app_metadata: {
          provider: ssoConnection.provider,
          sso_connection_id: ssoConnection.id,
        },
      });

      if (createError || !newUser.user) {
        console.error("[OAuth] Failed to create user:", createError);
        return Response.redirect(`${siteUrl}/auth?error=user_creation_failed`);
      }

      userId = newUser.user.id;
      isNewUser = true;

      // Create user profile
      await supabaseClient.from("user_profiles").insert({
        id: userId,
        email: userInfo.email,
        first_name: userInfo.firstName || "",
        last_name: userInfo.lastName || "",
        role: ssoConnection.default_role || "office_staff",
        is_active: true,
        site_id: ssoConnection.tenant_id,
      });
    }

    // Clean up used state
    await supabaseClient.from("oauth_pending_states").delete().eq("state", state);

    // Create session via magic link
    const { data: sessionData, error: sessionError } =
      await supabaseClient.auth.admin.generateLink({
        type: "magiclink",
        email: userInfo.email,
        options: {
          redirectTo: storedState.return_url || `${siteUrl}/dashboard`,
        },
      });

    if (sessionError || !sessionData) {
      console.error("[OAuth] Failed to create session:", sessionError);
      return Response.redirect(`${siteUrl}/auth?error=session_creation_failed`);
    }

    // Create session record
    await supabaseClient.from("user_sessions").insert({
      user_id: userId,
      tenant_id: ssoConnection.tenant_id,
      session_token: crypto.randomUUID(),
      auth_method: "sso",
      sso_connection_id: ssoConnection.id,
      device_type: "web",
      ip_address: req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for"),
      user_agent: req.headers.get("user-agent"),
    });

    // Log successful authentication
    await supabaseClient.from("security_logs").insert({
      user_id: userId,
      event_type: isNewUser ? "oauth_user_created" : "oauth_auth_success",
      ip_address: req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for"),
      user_agent: req.headers.get("user-agent"),
      details: {
        connection_id: ssoConnection.id,
        provider: ssoConnection.provider,
        email: userInfo.email,
        is_new_user: isNewUser,
      },
    });

    // Redirect to magic link (establishes session)
    return Response.redirect(sessionData.properties?.action_link || `${siteUrl}/dashboard`);
  } catch (error) {
    console.error("[OAuth] Callback error:", error);
    const siteUrl = Deno.env.get("SITE_URL") || "https://build-desk.com";
    return Response.redirect(`${siteUrl}/auth?error=oauth_callback_failed`);
  }
});
