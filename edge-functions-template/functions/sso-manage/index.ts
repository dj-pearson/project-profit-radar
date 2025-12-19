/**
 * SSO Configuration Management Edge Function
 *
 * CRUD operations for SSO connections (SAML, OAuth, LDAP)
 * Admin-only access with tenant isolation
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { validateRequest, createErrorResponse, sanitizeError } from "../_shared/validation.ts";
import {
  initializeAuthContext,
  errorResponse,
  successResponse,
  isAdmin,
} from "../_shared/auth-helpers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// SAML Configuration Schema
const SAMLConfigSchema = z.object({
  entity_id: z.string().min(1, "Entity ID is required"),
  sso_url: z.string().url("Invalid SSO URL"),
  slo_url: z.string().url("Invalid SLO URL").optional(),
  certificate: z.string().min(1, "Certificate is required"),
  sign_request: z.boolean().default(false),
  want_assertions_signed: z.boolean().default(true),
  signature_algorithm: z.enum(["sha256", "sha512"]).default("sha256"),
});

// OAuth Configuration Schema
const OAuthConfigSchema = z.object({
  client_id: z.string().min(1, "Client ID is required"),
  client_secret: z.string().min(1, "Client Secret is required"),
  authorize_url: z.string().url("Invalid authorize URL"),
  token_url: z.string().url("Invalid token URL"),
  userinfo_url: z.string().url("Invalid userinfo URL").optional(),
  scopes: z.array(z.string()).default(["openid", "email", "profile"]),
});

// LDAP Configuration Schema
const LDAPConfigSchema = z.object({
  host: z.string().min(1, "Host is required"),
  port: z.number().int().min(1).max(65535).default(389),
  use_ssl: z.boolean().default(false),
  bind_dn: z.string().min(1, "Bind DN is required"),
  bind_password: z.string().min(1, "Bind password is required"),
  user_search_base: z.string().min(1, "User search base is required"),
  user_search_filter: z.string().default("(uid={username})"),
  group_search_base: z.string().optional(),
  email_attribute: z.string().default("mail"),
  name_attribute: z.string().default("cn"),
});

// Create SSO Connection Schema
const CreateSSOSchema = z.object({
  provider: z.enum(["saml", "oauth_google", "oauth_microsoft", "oauth_github", "ldap"]),
  display_name: z.string().min(1, "Display name is required").max(100),
  config: z.record(z.unknown()),
  allowed_domains: z.array(z.string().min(1)).optional(),
  default_role: z
    .enum(["admin", "project_manager", "field_supervisor", "office_staff", "accounting", "client_portal"])
    .default("office_staff"),
  is_enabled: z.boolean().default(false),
  is_default: z.boolean().default(false),
});

// Update SSO Connection Schema
const UpdateSSOSchema = CreateSSOSchema.partial().extend({
  id: z.string().uuid("Invalid connection ID"),
});

// Delete SSO Connection Schema
const DeleteSSOSchema = z.object({
  id: z.string().uuid("Invalid connection ID"),
});

// List SSO Connections Schema
const ListSSOSchema = z.object({
  provider: z.enum(["saml", "oauth_google", "oauth_microsoft", "oauth_github", "ldap"]).optional(),
  is_enabled: z.boolean().optional(),
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize auth context
    const authContext = await initializeAuthContext(req);
    if (!authContext) {
      return errorResponse("Unauthorized", 401);
    }

    const { user, siteId, supabase } = authContext;

    // Verify admin access
    const isUserAdmin = await isAdmin(supabase, user.id, siteId);
    if (!isUserAdmin) {
      return errorResponse("Admin access required", 403);
    }

    // Parse request body
    let requestBody;
    try {
      requestBody = await req.json();
    } catch {
      return createErrorResponse(400, "Invalid request body", corsHeaders);
    }

    const action = requestBody.action || "list";

    switch (action) {
      case "list": {
        const validation = validateRequest(ListSSOSchema, requestBody);
        if (!validation.success) {
          return createErrorResponse(400, validation.error, corsHeaders);
        }

        let query = supabase
          .from("sso_connections")
          .select("*")
          .order("created_at", { ascending: false });

        if (validation.data.provider) {
          query = query.eq("provider", validation.data.provider);
        }
        if (validation.data.is_enabled !== undefined) {
          query = query.eq("is_enabled", validation.data.is_enabled);
        }

        const { data, error } = await query;

        if (error) {
          console.error("[SSO] List error:", error);
          return createErrorResponse(500, "Failed to fetch SSO connections", corsHeaders);
        }

        // Remove sensitive config data before returning
        const sanitizedData = data?.map((conn) => ({
          ...conn,
          config: {
            ...(conn.config as Record<string, unknown>),
            client_secret: conn.config?.client_secret ? "***" : undefined,
            bind_password: conn.config?.bind_password ? "***" : undefined,
            certificate: conn.config?.certificate ? "[CERTIFICATE]" : undefined,
          },
        }));

        return successResponse({ connections: sanitizedData });
      }

      case "create": {
        const validation = validateRequest(CreateSSOSchema, requestBody);
        if (!validation.success) {
          return createErrorResponse(400, validation.error, corsHeaders);
        }

        // Validate provider-specific config
        let configValidation;
        switch (validation.data.provider) {
          case "saml":
            configValidation = validateRequest(SAMLConfigSchema, validation.data.config);
            break;
          case "oauth_google":
          case "oauth_microsoft":
          case "oauth_github":
            configValidation = validateRequest(OAuthConfigSchema, validation.data.config);
            break;
          case "ldap":
            configValidation = validateRequest(LDAPConfigSchema, validation.data.config);
            break;
        }

        if (configValidation && !configValidation.success) {
          return createErrorResponse(400, `Invalid ${validation.data.provider} config: ${configValidation.error}`, corsHeaders);
        }

        // If setting as default, unset other defaults
        if (validation.data.is_default) {
          await supabase
            .from("sso_connections")
            .update({ is_default: false })
            .neq("id", "00000000-0000-0000-0000-000000000000"); // Update all
        }

        const { data, error } = await supabase
          .from("sso_connections")
          .insert({
            tenant_id: siteId,
            provider: validation.data.provider,
            display_name: validation.data.display_name,
            config: validation.data.config,
            allowed_domains: validation.data.allowed_domains,
            default_role: validation.data.default_role,
            is_enabled: validation.data.is_enabled,
            is_default: validation.data.is_default,
            created_by: user.id,
          })
          .select()
          .single();

        if (error) {
          console.error("[SSO] Create error:", error);
          return createErrorResponse(500, "Failed to create SSO connection", corsHeaders);
        }

        // Log the action
        await supabase.from("security_logs").insert({
          site_id: siteId,
          user_id: user.id,
          event_type: "sso_connection_created",
          ip_address: req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for"),
          user_agent: req.headers.get("user-agent"),
          details: {
            connection_id: data.id,
            provider: validation.data.provider,
            display_name: validation.data.display_name,
          },
        });

        return successResponse({ connection: data });
      }

      case "update": {
        const validation = validateRequest(UpdateSSOSchema, requestBody);
        if (!validation.success) {
          return createErrorResponse(400, validation.error, corsHeaders);
        }

        const { id, ...updateData } = validation.data;

        // Validate provider-specific config if provided
        if (updateData.config && updateData.provider) {
          let configValidation;
          switch (updateData.provider) {
            case "saml":
              configValidation = validateRequest(SAMLConfigSchema, updateData.config);
              break;
            case "oauth_google":
            case "oauth_microsoft":
            case "oauth_github":
              configValidation = validateRequest(OAuthConfigSchema, updateData.config);
              break;
            case "ldap":
              configValidation = validateRequest(LDAPConfigSchema, updateData.config);
              break;
          }

          if (configValidation && !configValidation.success) {
            return createErrorResponse(400, `Invalid config: ${configValidation.error}`, corsHeaders);
          }
        }

        // If setting as default, unset other defaults
        if (updateData.is_default) {
          await supabase
            .from("sso_connections")
            .update({ is_default: false })
            .neq("id", id);
        }

        const { data, error } = await supabase
          .from("sso_connections")
          .update({
            ...updateData,
            updated_at: new Date().toISOString(),
          })
          .eq("id", id)
          .select()
          .single();

        if (error) {
          console.error("[SSO] Update error:", error);
          return createErrorResponse(500, "Failed to update SSO connection", corsHeaders);
        }

        // Log the action
        await supabase.from("security_logs").insert({
          site_id: siteId,
          user_id: user.id,
          event_type: "sso_connection_updated",
          ip_address: req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for"),
          user_agent: req.headers.get("user-agent"),
          details: {
            connection_id: id,
            updates: Object.keys(updateData),
          },
        });

        return successResponse({ connection: data });
      }

      case "delete": {
        const validation = validateRequest(DeleteSSOSchema, requestBody);
        if (!validation.success) {
          return createErrorResponse(400, validation.error, corsHeaders);
        }

        // Get connection info before deleting for logging
        const { data: existingConnection } = await supabase
          .from("sso_connections")
          .select("display_name, provider")
          .eq("id", validation.data.id)
          .single();

        const { error } = await supabase.from("sso_connections").delete().eq("id", validation.data.id);

        if (error) {
          console.error("[SSO] Delete error:", error);
          return createErrorResponse(500, "Failed to delete SSO connection", corsHeaders);
        }

        // Log the action
        await supabase.from("security_logs").insert({
          site_id: siteId,
          user_id: user.id,
          event_type: "sso_connection_deleted",
          ip_address: req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for"),
          user_agent: req.headers.get("user-agent"),
          details: {
            connection_id: validation.data.id,
            provider: existingConnection?.provider,
            display_name: existingConnection?.display_name,
          },
        });

        return successResponse({ deleted: true });
      }

      case "test": {
        // Test SSO connection (basic validation)
        const validation = validateRequest(z.object({ id: z.string().uuid() }), requestBody);
        if (!validation.success) {
          return createErrorResponse(400, validation.error, corsHeaders);
        }

        const { data: connection, error } = await supabase
          .from("sso_connections")
          .select("*")
          .eq("id", validation.data.id)
          .single();

        if (error || !connection) {
          return createErrorResponse(404, "Connection not found", corsHeaders);
        }

        // Perform basic config validation
        const tests: { name: string; passed: boolean; message: string }[] = [];

        switch (connection.provider) {
          case "saml": {
            const config = connection.config as { sso_url?: string; certificate?: string };
            tests.push({
              name: "SSO URL",
              passed: !!config.sso_url,
              message: config.sso_url ? "SSO URL is configured" : "SSO URL is missing",
            });
            tests.push({
              name: "Certificate",
              passed: !!config.certificate,
              message: config.certificate ? "Certificate is configured" : "Certificate is missing",
            });
            break;
          }
          case "ldap": {
            const config = connection.config as { host?: string; bind_dn?: string };
            tests.push({
              name: "LDAP Host",
              passed: !!config.host,
              message: config.host ? "Host is configured" : "Host is missing",
            });
            tests.push({
              name: "Bind DN",
              passed: !!config.bind_dn,
              message: config.bind_dn ? "Bind DN is configured" : "Bind DN is missing",
            });
            break;
          }
          default: {
            const config = connection.config as { client_id?: string; client_secret?: string };
            tests.push({
              name: "Client ID",
              passed: !!config.client_id,
              message: config.client_id ? "Client ID is configured" : "Client ID is missing",
            });
            tests.push({
              name: "Client Secret",
              passed: !!config.client_secret,
              message: config.client_secret ? "Client Secret is configured" : "Client Secret is missing",
            });
          }
        }

        const allPassed = tests.every((t) => t.passed);

        return successResponse({
          success: allPassed,
          tests,
          message: allPassed ? "All configuration tests passed" : "Some tests failed",
        });
      }

      default:
        return createErrorResponse(400, `Unknown action: ${action}`, corsHeaders);
    }
  } catch (error) {
    const safeMessage = sanitizeError(error);
    return createErrorResponse(500, safeMessage, corsHeaders);
  }
});
