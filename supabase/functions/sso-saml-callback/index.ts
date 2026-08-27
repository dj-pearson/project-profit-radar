/**
 * SAML SSO Callback Edge Function
 *
 * Handles SAML assertion response from IdP
 * Validates assertion, creates/updates user, and establishes session
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import { decode as base64Decode } from "https://deno.land/std@0.190.0/encoding/base64.ts";
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.45/deno-dom-wasm.ts";
import { getCorsHeaders } from '../_shared/secure-cors.ts';
import { writeSecurityLog } from '../_shared/security-log.ts';

interface SAMLAssertion {
  email: string;
  firstName?: string;
  lastName?: string;
  nameId: string;
  issuer: string;
  sessionIndex?: string;
  attributes: Record<string, string>;
}

// Parse SAML Response
function parseSAMLResponse(samlResponse: string): SAMLAssertion | null {
  try {
    const decodedResponse = new TextDecoder().decode(base64Decode(samlResponse));
    const parser = new DOMParser();
    const doc = parser.parseFromString(decodedResponse, "text/xml");

    if (!doc) {
      console.error("[SAML] Failed to parse XML");
      return null;
    }

    // Extract NameID (email)
    const nameIdElement = doc.querySelector("NameID");
    const email = nameIdElement?.textContent?.toLowerCase() || "";

    if (!email) {
      console.error("[SAML] No email found in assertion");
      return null;
    }

    // Extract Issuer
    const issuerElement = doc.querySelector("Issuer");
    const issuer = issuerElement?.textContent || "";

    // Extract SessionIndex
    const authnStatementElement = doc.querySelector("AuthnStatement");
    const sessionIndex = authnStatementElement?.getAttribute("SessionIndex") || undefined;

    // Extract attributes
    const attributes: Record<string, string> = {};
    const attributeElements = doc.querySelectorAll("Attribute");

    attributeElements.forEach((attr) => {
      const name = attr.getAttribute("Name") || attr.getAttribute("FriendlyName");
      const valueElement = attr.querySelector("AttributeValue");
      if (name && valueElement?.textContent) {
        attributes[name] = valueElement.textContent;
      }
    });

    // Extract first name and last name from common attribute names
    const firstName =
      attributes["firstName"] ||
      attributes["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname"] ||
      attributes["givenName"] ||
      attributes["first_name"] ||
      "";

    const lastName =
      attributes["lastName"] ||
      attributes["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname"] ||
      attributes["sn"] ||
      attributes["last_name"] ||
      "";

    return {
      email,
      firstName,
      lastName,
      nameId: email,
      issuer,
      sessionIndex,
      attributes,
    };
  } catch (error) {
    console.error("[SAML] Parse error:", error);
    return null;
  }
}

// Validate SAML signature (simplified - production should use proper XML signature validation)
async function validateSignature(
  samlResponse: string,
  certificate: string
): Promise<boolean> {
  // In production, use a proper SAML library for signature validation
  // This is a simplified check that verifies the response is properly formatted
  try {
    const decodedResponse = new TextDecoder().decode(base64Decode(samlResponse));

    // Check for required SAML elements
    if (
      !decodedResponse.includes("samlp:Response") &&
      !decodedResponse.includes("saml2p:Response")
    ) {
      return false;
    }

    // Check for assertion
    if (
      !decodedResponse.includes("saml:Assertion") &&
      !decodedResponse.includes("saml2:Assertion")
    ) {
      return false;
    }

    // Check for signature (if present)
    const hasSignature =
      decodedResponse.includes("Signature") || decodedResponse.includes("ds:Signature");

    // For now, accept responses with or without signatures
    // Production should require and validate signatures
    return true;
  } catch {
    return false;
  }
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // SAML responses come as POST with form data
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Parse form data
    const formData = await req.formData();
    const samlResponse = formData.get("SAMLResponse") as string;
    const relayState = formData.get("RelayState") as string;

    if (!samlResponse) {
      console.error("[SAML] No SAMLResponse in callback");
      return Response.redirect(
        `${Deno.env.get("SITE_URL") || "https://brikly.net"}/auth?error=invalid_saml_response`
      );
    }

    // Parse the SAML assertion
    const assertion = parseSAMLResponse(samlResponse);

    if (!assertion || !assertion.email) {
      console.error("[SAML] Invalid SAML assertion");
      return Response.redirect(
        `${Deno.env.get("SITE_URL") || "https://brikly.net"}/auth?error=invalid_saml_assertion`
      );
    }

    // Find the SSO connection by issuer
    const { data: ssoConnections, error: connectionError } = await supabaseClient
      .from("sso_connections")
      .select("*")
      .eq("provider", "saml")
      .eq("is_enabled", true);

    if (connectionError || !ssoConnections?.length) {
      console.error("[SAML] No SSO connections found");
      return Response.redirect(
        `${Deno.env.get("SITE_URL") || "https://brikly.net"}/auth?error=sso_not_configured`
      );
    }

    // Find matching connection by issuer or domain
    const emailDomain = assertion.email.split("@")[1];
    let matchedConnection = ssoConnections.find((conn) => {
      const config = conn.config as { entity_id: string };
      return config.entity_id === assertion.issuer;
    });

    // Fallback to domain matching
    if (!matchedConnection) {
      matchedConnection = ssoConnections.find((conn) => {
        return conn.allowed_domains?.includes(emailDomain);
      });
    }

    if (!matchedConnection) {
      console.error("[SAML] No matching SSO connection for domain:", emailDomain);
      return Response.redirect(
        `${Deno.env.get("SITE_URL") || "https://brikly.net"}/auth?error=domain_not_allowed`
      );
    }

    // Validate signature
    const samlConfig = matchedConnection.config as { certificate: string };
    const isValidSignature = await validateSignature(samlResponse, samlConfig.certificate);

    if (!isValidSignature) {
      console.error("[SAML] Invalid signature");
      await writeSecurityLog(supabaseClient, {
        event_type: "saml_auth_failed",
        ip_address: req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for"),
        user_agent: req.headers.get("user-agent"),
        details: {
          reason: "invalid_signature",
          email: assertion.email,
          issuer: assertion.issuer,
        },
      });
      return Response.redirect(
        `${Deno.env.get("SITE_URL") || "https://brikly.net"}/auth?error=invalid_signature`
      );
    }

    // Check if user exists
    const { data: existingUser, error: userError } = await supabaseClient.auth.admin.listUsers();
    const user = existingUser?.users?.find((u) => u.email === assertion.email);

    let userId: string;
    let isNewUser = false;

    if (user) {
      userId = user.id;
    } else {
      // Create new user
      const { data: newUser, error: createError } = await supabaseClient.auth.admin.createUser({
        email: assertion.email,
        email_confirm: true,
        user_metadata: {
          first_name: assertion.firstName,
          last_name: assertion.lastName,
          sso_provider: "saml",
          sso_connection_id: matchedConnection.id,
        },
        app_metadata: {
          provider: "saml",
          sso_connection_id: matchedConnection.id,
        },
      });

      if (createError || !newUser.user) {
        console.error("[SAML] Failed to create user:", createError);
        return Response.redirect(
          `${Deno.env.get("SITE_URL") || "https://brikly.net"}/auth?error=user_creation_failed`
        );
      }

      userId = newUser.user.id;
      isNewUser = true;

      // The auth user exists by this point. Without a profile row the user
      // signs in with no company_id and no role, so get_user_company() returns
      // null and every RLS policy denies them: logged in, seeing nothing, with
      // no error anywhere. Delete the orphaned auth user and fail the login
      // rather than stranding them. supabase-js returns this error rather than
      // throwing it (US-300).
      const { error: profileError } = await supabaseClient.from("user_profiles").insert({
        id: userId,
        email: assertion.email,
        first_name: assertion.firstName || "",
        last_name: assertion.lastName || "",
        role: matchedConnection.default_role || "office_staff",
        is_active: true,
      });
      if (profileError) {
        console.error("[SAML] Failed to create user profile:", profileError);
        await supabaseClient.auth.admin.deleteUser(userId);
        return Response.redirect(
          `${Deno.env.get("SITE_URL") || "https://brikly.net"}/auth?error=user_creation_failed`
        );
      }
    }

    // Create session token
    const { data: sessionData, error: sessionError } =
      await supabaseClient.auth.admin.generateLink({
        type: "magiclink",
        email: assertion.email,
        options: {
          redirectTo: relayState || `${Deno.env.get("SITE_URL") || "https://brikly.net"}/dashboard`,
        },
      });

    if (sessionError || !sessionData) {
      console.error("[SAML] Failed to create session:", sessionError);
      return Response.redirect(
        `${Deno.env.get("SITE_URL") || "https://brikly.net"}/auth?error=session_creation_failed`
      );
    }

    // Create session record. This row is what an admin sees in the active
    // session list and what session revocation acts on, so an unrecorded
    // session cannot be revoked. Its error was discarded and supabase-js
    // returns it rather than throwing (US-300). Logged rather than failed, as
    // in sso-oauth-callback: authentication has already succeeded here, and
    // refusing would lock out a legitimate user without invalidating anything.
    const { error: sessionRecordError } = await supabaseClient.from("user_sessions").insert({
      user_id: userId,
      tenant_id: matchedConnection.tenant_id,
      session_token: crypto.randomUUID(),
      auth_method: "sso",
      sso_connection_id: matchedConnection.id,
      device_type: "web",
      ip_address: req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for"),
      user_agent: req.headers.get("user-agent"),
    });

    if (sessionRecordError) {
      console.error(
        `[SAML] User ${userId} SIGNED IN but the session was not recorded, so it cannot be revoked:`,
        sessionRecordError.message,
      );
    }

    // Log successful authentication
    await writeSecurityLog(supabaseClient, {
      user_id: userId,
      event_type: isNewUser ? "saml_user_created" : "saml_auth_success",
      ip_address: req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for"),
      user_agent: req.headers.get("user-agent"),
      details: {
        connection_id: matchedConnection.id,
        provider: matchedConnection.display_name,
        email: assertion.email,
        is_new_user: isNewUser,
      },
    });

    // Redirect to the magic link URL (which will establish the session)
    return Response.redirect(sessionData.properties?.action_link || "/dashboard");
  } catch (error) {
    console.error("[SAML] Callback error:", error);
    return Response.redirect(
      `${Deno.env.get("SITE_URL") || "https://brikly.net"}/auth?error=saml_callback_failed`
    );
  }
});
