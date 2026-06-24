/**
 * SAML SSO Initiation Edge Function
 *
 * Initiates SAML 2.0 authentication flow with IdP (Okta, Azure AD, OneLogin)
 * Returns the SAML AuthnRequest URL for redirect
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { validateRequest, createErrorResponse, sanitizeError } from "../_shared/validation.ts";
import { encode as base64Encode } from "https://deno.land/std@0.190.0/encoding/base64.ts";
import { compress } from "https://deno.land/x/compress@v0.4.5/zlib/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation schema
const InitSAMLSchema = z.object({
  connectionId: z.string().uuid("Invalid connection ID"),
  returnUrl: z.string().url("Invalid return URL").optional(),
});

// Generate SAML AuthnRequest
function generateAuthnRequest(
  entityId: string,
  assertionConsumerServiceUrl: string,
  requestId: string
): string {
  const issueInstant = new Date().toISOString();

  return `<?xml version="1.0" encoding="UTF-8"?>
<samlp:AuthnRequest
  xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
  xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
  ID="${requestId}"
  Version="2.0"
  IssueInstant="${issueInstant}"
  AssertionConsumerServiceURL="${assertionConsumerServiceUrl}"
  ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST">
  <saml:Issuer>${entityId}</saml:Issuer>
  <samlp:NameIDPolicy
    Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress"
    AllowCreate="true"/>
</samlp:AuthnRequest>`;
}

// Generate unique request ID
function generateRequestId(): string {
  return "_" + crypto.randomUUID().replace(/-/g, "");
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

    const validation = validateRequest(InitSAMLSchema, requestBody);
    if (!validation.success) {
      return createErrorResponse(400, validation.error, corsHeaders);
    }

    const { connectionId, returnUrl } = validation.data;

    // Get SSO connection configuration
    const { data: ssoConnection, error: fetchError } = await supabaseClient
      .from("sso_connections")
      .select("*")
      .eq("id", connectionId)
      .eq("is_enabled", true)
      .eq("provider", "saml")
      .single();

    if (fetchError || !ssoConnection) {
      console.error("[SAML] Connection not found:", fetchError);
      return createErrorResponse(404, "SSO connection not found or disabled", corsHeaders);
    }

    // Extract SAML configuration
    const samlConfig = ssoConnection.config as {
      entity_id: string;
      sso_url: string;
      certificate: string;
      sign_request?: boolean;
    };

    if (!samlConfig.sso_url || !samlConfig.entity_id) {
      return createErrorResponse(400, "Invalid SAML configuration", corsHeaders);
    }

    // Generate AuthnRequest
    const requestId = generateRequestId();
    const assertionConsumerServiceUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/sso-saml-callback`;

    const authnRequest = generateAuthnRequest(
      samlConfig.entity_id,
      assertionConsumerServiceUrl,
      requestId
    );

    // Compress and encode the request
    const compressedRequest = compress(new TextEncoder().encode(authnRequest));
    const encodedRequest = base64Encode(compressedRequest);
    const urlEncodedRequest = encodeURIComponent(encodedRequest);

    // Store pending request for validation
    const { error: storeError } = await supabaseClient
      .from("saml_pending_requests")
      .insert({
        request_id: requestId,
        connection_id: connectionId,
        return_url: returnUrl || "/dashboard",
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes
        ip_address: req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for"),
        user_agent: req.headers.get("user-agent"),
      });

    if (storeError) {
      console.error("[SAML] Failed to store pending request:", storeError);
      // Continue anyway - we'll validate other ways
    }

    // Build redirect URL
    const redirectUrl = `${samlConfig.sso_url}?SAMLRequest=${urlEncodedRequest}`;

    // Log SAML initiation
    await supabaseClient.from("security_logs").insert({
      event_type: "saml_auth_initiated",
      ip_address: req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for"),
      user_agent: req.headers.get("user-agent"),
      details: {
        connection_id: connectionId,
        provider: ssoConnection.display_name,
        request_id: requestId,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        redirectUrl,
        requestId,
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
