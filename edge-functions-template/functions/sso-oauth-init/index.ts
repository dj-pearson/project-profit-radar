/**
 * OAuth SSO Initiation Edge Function
 *
 * Initiates OAuth 2.0 authentication flow with various providers
 * (Microsoft, GitHub, custom OAuth)
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { validateRequest, createErrorResponse, sanitizeError } from "../_shared/validation.ts";
import { encode as base64Encode } from "https://deno.land/std@0.190.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// OAuth provider configurations
const OAUTH_PROVIDERS: Record<
  string,
  {
    authorizeUrl: string;
    tokenUrl: string;
    userinfoUrl: string;
    defaultScopes: string[];
  }
> = {
  oauth_microsoft: {
    authorizeUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    userinfoUrl: "https://graph.microsoft.com/v1.0/me",
    defaultScopes: ["openid", "email", "profile", "User.Read"],
  },
  oauth_github: {
    authorizeUrl: "https://github.com/login/oauth/authorize",
    tokenUrl: "https://github.com/login/oauth/access_token",
    userinfoUrl: "https://api.github.com/user",
    defaultScopes: ["read:user", "user:email"],
  },
};

// Input validation schema
const InitOAuthSchema = z.object({
  connectionId: z.string().uuid("Invalid connection ID").optional(),
  provider: z.enum(["oauth_microsoft", "oauth_github"]).optional(),
  returnUrl: z.string().url("Invalid return URL").optional(),
});

// Generate PKCE challenge
async function generatePKCE(): Promise<{ codeVerifier: string; codeChallenge: string }> {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  const codeVerifier = base64Encode(array)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");

  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const hash = await crypto.subtle.digest("SHA-256", data);
  const codeChallenge = base64Encode(new Uint8Array(hash))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");

  return { codeVerifier, codeChallenge };
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

    // Validate request body
    let requestBody;
    try {
      requestBody = await req.json();
    } catch {
      return createErrorResponse(400, "Invalid request body", corsHeaders);
    }

    const validation = validateRequest(InitOAuthSchema, requestBody);
    if (!validation.success) {
      return createErrorResponse(400, validation.error, corsHeaders);
    }

    const { connectionId, provider, returnUrl } = validation.data;

    let ssoConnection;
    let oauthConfig: {
      client_id: string;
      client_secret: string;
      authorize_url?: string;
      token_url?: string;
      scopes?: string[];
    };
    let providerType: string;

    if (connectionId) {
      // Get SSO connection configuration
      const { data, error: fetchError } = await supabaseClient
        .from("sso_connections")
        .select("*")
        .eq("id", connectionId)
        .eq("is_enabled", true)
        .single();

      if (fetchError || !data) {
        console.error("[OAuth] Connection not found:", fetchError);
        return createErrorResponse(404, "SSO connection not found or disabled", corsHeaders);
      }

      ssoConnection = data;
      oauthConfig = data.config as typeof oauthConfig;
      providerType = data.provider;
    } else if (provider) {
      // Use default provider configuration
      const providerConfig = OAUTH_PROVIDERS[provider];
      if (!providerConfig) {
        return createErrorResponse(400, "Invalid OAuth provider", corsHeaders);
      }

      // Look for enabled connection of this type
      const { data, error } = await supabaseClient
        .from("sso_connections")
        .select("*")
        .eq("provider", provider)
        .eq("is_enabled", true)
        .limit(1)
        .single();

      if (error || !data) {
        return createErrorResponse(404, `No ${provider} SSO configured`, corsHeaders);
      }

      ssoConnection = data;
      oauthConfig = data.config as typeof oauthConfig;
      providerType = provider;
    } else {
      return createErrorResponse(400, "Either connectionId or provider is required", corsHeaders);
    }

    // Get provider-specific URLs
    const providerDefaults = OAUTH_PROVIDERS[providerType];
    const authorizeUrl = oauthConfig.authorize_url || providerDefaults?.authorizeUrl;
    const scopes = oauthConfig.scopes || providerDefaults?.defaultScopes || ["openid", "email"];

    if (!authorizeUrl || !oauthConfig.client_id) {
      return createErrorResponse(400, "Invalid OAuth configuration", corsHeaders);
    }

    // Generate state and PKCE
    const state = crypto.randomUUID();
    const { codeVerifier, codeChallenge } = await generatePKCE();

    // Build callback URL
    const callbackUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/sso-oauth-callback`;

    // Store OAuth state for validation
    const { error: storeError } = await supabaseClient
      .from("oauth_pending_states")
      .insert({
        state,
        connection_id: ssoConnection.id,
        code_verifier: codeVerifier,
        return_url: returnUrl || "/dashboard",
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
        ip_address: req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for"),
        user_agent: req.headers.get("user-agent"),
      });

    if (storeError) {
      console.error("[OAuth] Failed to store state:", storeError);
      // Continue anyway - we'll validate other ways
    }

    // Build authorization URL
    const authParams = new URLSearchParams({
      client_id: oauthConfig.client_id,
      redirect_uri: callbackUrl,
      response_type: "code",
      scope: scopes.join(" "),
      state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    });

    // Add provider-specific parameters
    if (providerType === "oauth_microsoft") {
      authParams.set("response_mode", "query");
    }

    const redirectUrl = `${authorizeUrl}?${authParams.toString()}`;

    // Log OAuth initiation
    await supabaseClient.from("security_logs").insert({
      event_type: "oauth_auth_initiated",
      ip_address: req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for"),
      user_agent: req.headers.get("user-agent"),
      details: {
        connection_id: ssoConnection.id,
        provider: providerType,
        state,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        redirectUrl,
        state,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const safeMessage = sanitizeError(error);
    return createErrorResponse(500, safeMessage, corsHeaders);
  }
});
