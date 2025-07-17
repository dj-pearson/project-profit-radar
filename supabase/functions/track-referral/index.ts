import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[TRACK-REFERRAL] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const { affiliate_code, referee_email } = await req.json();
    
    if (!affiliate_code || !referee_email) {
      throw new Error("Missing affiliate_code or referee_email");
    }

    logStep("Processing referral", { affiliate_code, referee_email });

    // Get affiliate code details
    const { data: affiliateCodeData, error: affiliateError } = await supabaseClient
      .from('affiliate_codes')
      .select(`
        *,
        affiliate_programs!inner(*),
        companies!inner(*)
      `)
      .eq('affiliate_code', affiliate_code)
      .eq('is_active', true)
      .single();

    if (affiliateError || !affiliateCodeData) {
      logStep("Invalid affiliate code", { error: affiliateError });
      throw new Error("Invalid affiliate code");
    }

    logStep("Found affiliate code", { 
      company: affiliateCodeData.companies.name,
      program: affiliateCodeData.affiliate_programs.name 
    });

    // Check if referral already exists for this email and affiliate code
    const { data: existingReferral } = await supabaseClient
      .from('affiliate_referrals')
      .select('*')
      .eq('affiliate_code_id', affiliateCodeData.id)
      .eq('referee_email', referee_email)
      .eq('referral_status', 'pending')
      .single();

    if (existingReferral) {
      logStep("Referral already exists", { referral_id: existingReferral.id });
      return new Response(JSON.stringify({ 
        success: true, 
        referral_id: existingReferral.id,
        message: "Referral already tracked" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Create new referral record
    const { data: referral, error: referralError } = await supabaseClient
      .from('affiliate_referrals')
      .insert({
        affiliate_code_id: affiliateCodeData.id,
        referrer_company_id: affiliateCodeData.company_id,
        referee_email: referee_email,
        referrer_reward_months: affiliateCodeData.affiliate_programs.referrer_reward_months,
        referee_reward_months: affiliateCodeData.affiliate_programs.referee_reward_months,
        referral_status: 'pending'
      })
      .select()
      .single();

    if (referralError) {
      logStep("Error creating referral", { error: referralError });
      throw new Error("Failed to create referral");
    }

    // Update affiliate code stats
    await supabaseClient
      .from('affiliate_codes')
      .update({ 
        total_referrals: affiliateCodeData.total_referrals + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', affiliateCodeData.id);

    logStep("Referral tracked successfully", { referral_id: referral.id });

    return new Response(JSON.stringify({ 
      success: true, 
      referral_id: referral.id,
      referrer_reward_months: referral.referrer_reward_months,
      referee_reward_months: referral.referee_reward_months
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in track-referral", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});