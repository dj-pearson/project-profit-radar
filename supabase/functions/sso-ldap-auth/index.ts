/**
 * LDAP/Active Directory Authentication Edge Function
 *
 * Authenticates users against LDAP/Active Directory servers
 * Supports bind authentication and user attribute retrieval
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { validateRequest, createErrorResponse, sanitizeError } from "../_shared/validation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation schema
const LDAPAuthSchema = z.object({
  connectionId: z.string().uuid("Invalid connection ID"),
  username: z.string().min(1, "Username is required").max(256),
  password: z.string().min(1, "Password is required").max(256),
  returnUrl: z.string().url("Invalid return URL").optional(),
});

interface LDAPConfig {
  host: string;
  port: number;
  use_ssl: boolean;
  bind_dn: string;
  bind_password: string;
  user_search_base: string;
  user_search_filter: string;
  group_search_base?: string;
  email_attribute: string;
  name_attribute: string;
  first_name_attribute?: string;
  last_name_attribute?: string;
}

interface LDAPUser {
  dn: string;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  groups?: string[];
}

/**
 * LDAP Authentication
 *
 * NOTE: Deno doesn't have native LDAP support, so this implementation uses
 * a simplified HTTP-based LDAP proxy pattern. In production, you would either:
 * 1. Use an LDAP-to-REST proxy service
 * 2. Deploy a custom LDAP worker service
 * 3. Use a cloud identity provider that supports LDAP
 *
 * This implementation provides the structure for LDAP auth and can be
 * connected to a real LDAP backend service.
 */
async function authenticateLDAP(
  config: LDAPConfig,
  username: string,
  password: string
): Promise<{ success: boolean; user?: LDAPUser; error?: string }> {
  try {
    // Build the user DN using the search filter
    const userFilter = config.user_search_filter.replace("{username}", username);

    // In a real implementation, you would:
    // 1. Connect to LDAP server
    // 2. Bind with service account (bind_dn + bind_password)
    // 3. Search for user using userFilter in user_search_base
    // 4. Attempt to bind with user's DN and password
    // 5. Retrieve user attributes

    // For this implementation, we'll use an LDAP proxy service if available
    const ldapProxyUrl = Deno.env.get("LDAP_PROXY_URL");

    if (ldapProxyUrl) {
      // Use LDAP proxy service
      const response = await fetch(`${ldapProxyUrl}/authenticate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-LDAP-Host": config.host,
          "X-LDAP-Port": String(config.port),
          "X-LDAP-SSL": String(config.use_ssl),
        },
        body: JSON.stringify({
          bindDN: config.bind_dn,
          bindPassword: config.bind_password,
          searchBase: config.user_search_base,
          searchFilter: userFilter,
          username,
          password,
          attributes: [
            config.email_attribute,
            config.name_attribute,
            config.first_name_attribute || "givenName",
            config.last_name_attribute || "sn",
          ],
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error("[LDAP] Proxy authentication failed:", errorBody);
        return { success: false, error: "Authentication failed" };
      }

      const result = await response.json();

      if (result.authenticated) {
        return {
          success: true,
          user: {
            dn: result.userDN,
            email: result.attributes[config.email_attribute],
            name: result.attributes[config.name_attribute],
            firstName: result.attributes[config.first_name_attribute || "givenName"],
            lastName: result.attributes[config.last_name_attribute || "sn"],
            groups: result.groups,
          },
        };
      }

      return { success: false, error: result.error || "Invalid credentials" };
    }

    // Fallback: Direct LDAP validation would go here
    // Since Deno doesn't have native LDAP support, we'll simulate a response
    // In production, this should connect to an LDAP proxy or external service

    console.warn("[LDAP] No LDAP_PROXY_URL configured. LDAP authentication requires a proxy service.");

    return {
      success: false,
      error: "LDAP authentication service not configured",
    };
  } catch (error) {
    console.error("[LDAP] Authentication error:", error);
    return {
      success: false,
      error: "LDAP connection failed",
    };
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

    // Validate request body
    let requestBody;
    try {
      requestBody = await req.json();
    } catch {
      return createErrorResponse(400, "Invalid request body", corsHeaders);
    }

    const validation = validateRequest(LDAPAuthSchema, requestBody);
    if (!validation.success) {
      return createErrorResponse(400, validation.error, corsHeaders);
    }

    const { connectionId, username, password, returnUrl } = validation.data;

    // Get LDAP connection configuration
    const { data: ssoConnection, error: fetchError } = await supabaseClient
      .from("sso_connections")
      .select("*")
      .eq("id", connectionId)
      .eq("is_enabled", true)
      .eq("provider", "ldap")
      .single();

    if (fetchError || !ssoConnection) {
      console.error("[LDAP] Connection not found:", fetchError);
      return createErrorResponse(404, "LDAP connection not found or disabled", corsHeaders);
    }

    const ldapConfig = ssoConnection.config as LDAPConfig;

    // Authenticate against LDAP
    const authResult = await authenticateLDAP(ldapConfig, username, password);

    if (!authResult.success || !authResult.user) {
      // Log failed authentication
      await supabaseClient.from("security_logs").insert({
        event_type: "ldap_auth_failed",
        ip_address: req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for"),
        user_agent: req.headers.get("user-agent"),
        details: {
          connection_id: connectionId,
          username,
          error: authResult.error,
        },
      });

      return createErrorResponse(401, authResult.error || "Authentication failed", corsHeaders);
    }

    const ldapUser = authResult.user;

    // Validate email domain if restrictions exist
    if (ssoConnection.allowed_domains?.length > 0 && ldapUser.email) {
      const emailDomain = ldapUser.email.split("@")[1];
      if (!ssoConnection.allowed_domains.includes(emailDomain)) {
        console.error("[LDAP] Domain not allowed:", emailDomain);
        return createErrorResponse(403, "Email domain not allowed", corsHeaders);
      }
    }

    // Check if user exists
    const { data: existingUsers } = await supabaseClient.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find((u) => u.email === ldapUser.email);

    let userId: string;
    let isNewUser = false;

    if (existingUser) {
      userId = existingUser.id;

      // Update user metadata with latest LDAP info
      await supabaseClient.auth.admin.updateUserById(userId, {
        user_metadata: {
          ...existingUser.user_metadata,
          ldap_dn: ldapUser.dn,
          first_name: ldapUser.firstName || existingUser.user_metadata?.first_name,
          last_name: ldapUser.lastName || existingUser.user_metadata?.last_name,
          ldap_groups: ldapUser.groups,
        },
      });
    } else {
      // Create new user
      const { data: newUser, error: createError } = await supabaseClient.auth.admin.createUser({
        email: ldapUser.email,
        email_confirm: true,
        user_metadata: {
          first_name: ldapUser.firstName,
          last_name: ldapUser.lastName,
          full_name: ldapUser.name,
          ldap_dn: ldapUser.dn,
          ldap_groups: ldapUser.groups,
          sso_provider: "ldap",
        },
        app_metadata: {
          provider: "ldap",
          sso_connection_id: ssoConnection.id,
        },
      });

      if (createError || !newUser.user) {
        console.error("[LDAP] Failed to create user:", createError);
        return createErrorResponse(500, "Failed to create user account", corsHeaders);
      }

      userId = newUser.user.id;
      isNewUser = true;

      // Create user profile
      await supabaseClient.from("user_profiles").insert({
        id: userId,
        email: ldapUser.email,
        first_name: ldapUser.firstName || "",
        last_name: ldapUser.lastName || "",
        role: ssoConnection.default_role || "office_staff",
        is_active: true,
      });
    }

    // Create session via magic link
    const siteUrl = Deno.env.get("SITE_URL") || "https://build-desk.com";
    const { data: sessionData, error: sessionError } =
      await supabaseClient.auth.admin.generateLink({
        type: "magiclink",
        email: ldapUser.email,
        options: {
          redirectTo: returnUrl || `${siteUrl}/dashboard`,
        },
      });

    if (sessionError || !sessionData) {
      console.error("[LDAP] Failed to create session:", sessionError);
      return createErrorResponse(500, "Failed to create session", corsHeaders);
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
      event_type: isNewUser ? "ldap_user_created" : "ldap_auth_success",
      ip_address: req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for"),
      user_agent: req.headers.get("user-agent"),
      details: {
        connection_id: ssoConnection.id,
        provider: "ldap",
        email: ldapUser.email,
        ldap_dn: ldapUser.dn,
        is_new_user: isNewUser,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        redirectUrl: sessionData.properties?.action_link || `${siteUrl}/dashboard`,
        user: {
          email: ldapUser.email,
          firstName: ldapUser.firstName,
          lastName: ldapUser.lastName,
          isNewUser,
        },
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
