import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import { TOTP } from "https://deno.land/x/otpauth@v9.2.4/dist/otpauth.esm.js";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { validateRequest, uuidSchema, createErrorResponse } from "../_shared/validation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// SECURITY: Input validation schema
const VerifyMFASchema = z.object({
  user_id: uuidSchema,
  verification_code: z.string().length(6, 'Code must be exactly 6 digits').regex(/^\d{6}$/, 'Code must contain only digits')
});

function generateBackupCodes(count: number = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    // Generate 8-character alphanumeric codes
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    codes.push(code);
  }
  return codes;
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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return createErrorResponse(401, "Authentication required", corsHeaders);
    }

    // Verify the user is authenticated
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) {
      console.error("[MFA] Auth verification failed:", userError);
      return createErrorResponse(401, "Authentication failed", corsHeaders);
    }

    // SECURITY: Validate request body with Zod schema
    let requestBody;
    try {
      requestBody = await req.json();
    } catch {
      return createErrorResponse(400, "Invalid request body", corsHeaders);
    }

    const validation = validateRequest(VerifyMFASchema, requestBody);
    if (!validation.success) {
      console.error("[MFA] Validation failed:", validation.error);
      return createErrorResponse(400, "Invalid request parameters", corsHeaders);
    }

    const { user_id, verification_code } = validation.data;
    
    // Verify the user can only set up MFA for themselves
    if (userData.user.id !== user_id) {
      console.warn("[MFA] Unauthorized access attempt:", { requester: userData.user.id, target: user_id });
      return createErrorResponse(403, "Insufficient permissions", corsHeaders);
    }

    // Get the stored secret
    const { data: securityData, error: fetchError } = await supabaseClient
      .from("user_security")
      .select("two_factor_secret")
      .eq("user_id", user_id)
      .single();

    if (fetchError || !securityData?.two_factor_secret) {
      console.error("[MFA] Failed to fetch security data:", fetchError);
      return createErrorResponse(400, "MFA verification failed. Please try again.", corsHeaders);
    }

    // Verify the TOTP code
    const totp = new TOTP({
      issuer: "Project Profit Radar",
      label: userData.user.email,
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: securityData.two_factor_secret,
    });

    const isValid = totp.validate({ token: verification_code, window: 1 });
    
    if (!isValid) {
      // Log failed verification attempt
      await supabaseClient.from("security_logs").insert({
        user_id: user_id,
        event_type: "mfa_verification_failed",
        ip_address: req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for"),
        user_agent: req.headers.get("user-agent"),
        details: {
          timestamp: new Date().toISOString(),
        },
      });
      
      console.warn("[MFA] Invalid verification code provided");
      return createErrorResponse(400, "MFA verification failed. Please try again.", corsHeaders);
    }

    // Generate backup codes
    const backupCodes = generateBackupCodes();

    // Enable MFA and store backup codes
    const { error: updateError } = await supabaseClient
      .from("user_security")
      .update({
        two_factor_enabled: true,
        backup_codes: backupCodes,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user_id);

    if (updateError) {
      console.error("[MFA] Database update failed:", updateError);
      return createErrorResponse(500, "Failed to enable MFA", corsHeaders);
    }

    // Log successful MFA enablement
    await supabaseClient.from("security_logs").insert({
      user_id: user_id,
      event_type: "mfa_enabled",
      ip_address: req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for"),
      user_agent: req.headers.get("user-agent"),
      details: {
        timestamp: new Date().toISOString(),
        backup_codes_generated: backupCodes.length,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        backup_codes: backupCodes,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    // SECURITY: Never expose internal errors to clients
    console.error("[MFA] Unexpected error:", error);
    return createErrorResponse(500, "An unexpected error occurred", corsHeaders);
  }
});