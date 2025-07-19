import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { TOTP } from "https://deno.land/x/otpauth@v9.2.4/dist/otpauth.esm.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
      throw new Error("No authorization header");
    }

    // Verify the user is authenticated
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) {
      throw new Error("Invalid authentication");
    }

    const { user_id, verification_code } = await req.json();
    
    // Verify the user can only set up MFA for themselves
    if (userData.user.id !== user_id) {
      throw new Error("Unauthorized");
    }

    // Get the stored secret
    const { data: securityData, error: fetchError } = await supabaseClient
      .from("user_security")
      .select("two_factor_secret")
      .eq("user_id", user_id)
      .single();

    if (fetchError || !securityData?.two_factor_secret) {
      throw new Error("MFA setup not found. Please restart the setup process.");
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
          code_provided: verification_code,
        },
      });
      
      throw new Error("Invalid verification code");
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
      console.error("Error enabling MFA:", updateError);
      throw new Error("Failed to enable MFA");
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
    console.error("MFA verification error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});