import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

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
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
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
    
    // Verify the user can only disable MFA for themselves (or admin can disable for others)
    const { data: profile } = await supabaseClient
      .from("user_profiles")
      .select("role")
      .eq("id", userData.user.id)
      .single();

    const isAdmin = profile?.role === 'root_admin' || profile?.role === 'admin';
    
    if (userData.user.id !== user_id && !isAdmin) {
      throw new Error("Unauthorized");
    }

    // Disable MFA and clear secrets
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
      console.error("Error disabling MFA:", updateError);
      throw new Error("Failed to disable MFA");
    }

    // Log MFA disablement
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

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("MFA disable error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});