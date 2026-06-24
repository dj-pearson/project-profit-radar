import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// SECURITY: Input validation schema
const DisableMFARequestSchema = z.object({
  user_id: z.string().uuid('Invalid user ID format')
});

// SECURITY: Sanitize errors to prevent information disclosure
function createSafeErrorResponse(statusCode: number, message: string) {
  return new Response(
    JSON.stringify({ error: message }),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: statusCode,
    }
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return createSafeErrorResponse(401, "Authentication required");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !userData.user) {
      console.error("[MFA] Auth verification failed:", userError);
      return createSafeErrorResponse(401, "Invalid authentication");
    }

    // SECURITY: Validate input with Zod schema
    let requestBody;
    try {
      requestBody = await req.json();
    } catch {
      return createSafeErrorResponse(400, "Invalid request body");
    }

    const validation = DisableMFARequestSchema.safeParse(requestBody);
    if (!validation.success) {
      console.error("[MFA] Validation failed:", validation.error.errors);
      return createSafeErrorResponse(400, "Invalid request parameters");
    }

    const { user_id } = validation.data;
    
    // SECURITY: Check authorization using server-side role validation
    const { data: hasRole, error: roleError } = await supabaseClient
      .rpc('has_role', { 
        _user_id: userData.user.id, 
        _role: 'root_admin' 
      });

    if (roleError) {
      console.error("[MFA] Role check failed:", roleError);
      return createSafeErrorResponse(500, "Authorization check failed");
    }

    const isAdmin = hasRole === true;
    
    // User can only disable MFA for themselves unless they're an admin
    if (userData.user.id !== user_id && !isAdmin) {
      console.warn("[MFA] Unauthorized access attempt:", {
        requester: userData.user.id,
        target: user_id
      });
      return createSafeErrorResponse(403, "Insufficient permissions");
    }

    // Disable MFA
    const { error: updateError } = await supabaseClient
      .from("user_security")
      .update({
        two_factor_enabled: false,
        two_factor_secret: null,
        backup_codes: null,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user_id);

    if (updateError) {
      // SECURITY: Log detailed error server-side, return generic message to client
      console.error("[MFA] Database update failed:", updateError);
      return createSafeErrorResponse(500, "Failed to update MFA settings");
    }

    // Log security event
    await supabaseClient.from("security_logs").insert({
      user_id: user_id,
      event_type: "mfa_disabled",
      ip_address: req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for"),
      user_agent: req.headers.get("user-agent"),
      details: {
        timestamp: new Date().toISOString(),
        disabled_by: userData.user.id,
        is_admin_action: userData.user.id !== user_id,
      },
    });

    console.log("[MFA] Successfully disabled for user");

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    // SECURITY: Never expose internal errors to clients
    console.error("[MFA] Unexpected error:", error);
    return createSafeErrorResponse(500, "An unexpected error occurred");
  }
});