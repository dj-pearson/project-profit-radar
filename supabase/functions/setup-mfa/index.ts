import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { TOTP } from "https://deno.land/x/otpauth@v9.2.4/dist/otpauth.esm.js";
import QRCode from "https://esm.sh/qrcode@1.5.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const { user_id } = await req.json();
    
    // Verify the user can only set up MFA for themselves
    if (userData.user.id !== user_id) {
      throw new Error("Unauthorized");
    }

    // Generate a secret for TOTP
    const secret = new TOTP({
      issuer: "Project Profit Radar",
      label: userData.user.email,
      algorithm: "SHA1",
      digits: 6,
      period: 30,
    });

    // Generate QR code
    const qrCodeDataUrl = await QRCode.toDataURL(secret.toString());

    // Store the secret (temporarily) in user_security table
    const { error: updateError } = await supabaseClient
      .from("user_security")
      .upsert({
        user_id: user_id,
        two_factor_secret: secret.secret,
        two_factor_enabled: false, // Not enabled until verified
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id'
      });

    if (updateError) {
      console.error("Error storing MFA secret:", updateError);
      throw new Error("Failed to initialize MFA setup");
    }

    // Log security event
    await supabaseClient.from("security_logs").insert({
      user_id: user_id,
      event_type: "mfa_setup_initiated",
      ip_address: req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for"),
      user_agent: req.headers.get("user-agent"),
      details: {
        timestamp: new Date().toISOString(),
      },
    });

    return new Response(
      JSON.stringify({
        qr_code_url: qrCodeDataUrl,
        secret: secret.secret,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("MFA setup error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});