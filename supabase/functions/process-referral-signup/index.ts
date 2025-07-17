import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PROCESS-REFERRAL-SIGNUP] ${step}${detailsStr}`);
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

    const { referee_email, referee_company_id, subscription_tier, subscription_duration_months } = await req.json();
    
    if (!referee_email || !referee_company_id) {
      throw new Error("Missing referee_email or referee_company_id");
    }

    logStep("Processing signup", { referee_email, referee_company_id, subscription_tier });

    // Find pending referral for this email
    const { data: referrals, error: referralError } = await supabaseClient
      .from('affiliate_referrals')
      .select(`
        *,
        affiliate_codes!inner(*),
        affiliate_programs!inner(*)
      `)
      .eq('referee_email', referee_email)
      .eq('referral_status', 'pending')
      .gt('expires_at', new Date().toISOString());

    if (referralError || !referrals || referrals.length === 0) {
      logStep("No valid pending referrals found");
      return new Response(JSON.stringify({ 
        success: true, 
        message: "No referral to process" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const referral = referrals[0]; // Take the first valid referral
    logStep("Found referral to process", { referral_id: referral.id });

    // Check if referee company is different from referrer company
    if (referral.referrer_company_id === referee_company_id) {
      logStep("Self-referral detected, marking as invalid");
      
      await supabaseClient
        .from('affiliate_referrals')
        .update({ 
          referral_status: 'expired',
          updated_at: new Date().toISOString()
        })
        .eq('id', referral.id);

      return new Response(JSON.stringify({ 
        success: true, 
        message: "Self-referral not allowed" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Update referral with signup details
    const { error: updateError } = await supabaseClient
      .from('affiliate_referrals')
      .update({
        referee_company_id: referee_company_id,
        referral_status: subscription_tier ? 'subscribed' : 'signed_up',
        subscription_tier: subscription_tier,
        subscription_duration_months: subscription_duration_months,
        updated_at: new Date().toISOString()
      })
      .eq('id', referral.id);

    if (updateError) {
      logStep("Error updating referral", { error: updateError });
      throw new Error("Failed to update referral");
    }

    // If they subscribed (not just signed up), process rewards
    if (subscription_tier && subscription_duration_months) {
      logStep("Processing subscription rewards");

      // Check minimum subscription duration requirement
      const minDuration = referral.affiliate_programs?.min_subscription_duration_months || 1;
      if (subscription_duration_months >= minDuration) {
        
        // Create reward for referrer
        if (referral.referrer_reward_months > 0) {
          await supabaseClient
            .from('affiliate_rewards')
            .insert({
              referral_id: referral.id,
              company_id: referral.referrer_company_id,
              reward_type: 'referrer',
              reward_months: referral.referrer_reward_months,
              reward_status: 'pending',
              expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year expiry
            });
        }

        // Create reward for referee
        if (referral.referee_reward_months > 0) {
          await supabaseClient
            .from('affiliate_rewards')
            .insert({
              referral_id: referral.id,
              company_id: referee_company_id,
              reward_type: 'referee',
              reward_months: referral.referee_reward_months,
              reward_status: 'pending',
              expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year expiry
            });
        }

        // Update referral status to rewarded
        await supabaseClient
          .from('affiliate_referrals')
          .update({
            referral_status: 'rewarded',
            referrer_rewarded_at: new Date().toISOString(),
            referee_rewarded_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', referral.id);

        // Update affiliate code successful referrals count
        await supabaseClient
          .from('affiliate_codes')
          .update({ 
            successful_referrals: referral.affiliate_codes.successful_referrals + 1,
            total_rewards_earned: referral.affiliate_codes.total_rewards_earned + referral.referrer_reward_months,
            updated_at: new Date().toISOString()
          })
          .eq('id', referral.affiliate_code_id);

        logStep("Rewards created successfully");
      } else {
        logStep("Subscription duration too short for rewards", { 
          duration: subscription_duration_months, 
          required: minDuration 
        });
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      referral_processed: true,
      rewards_created: subscription_tier && subscription_duration_months,
      referrer_reward_months: referral.referrer_reward_months,
      referee_reward_months: referral.referee_reward_months
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in process-referral-signup", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});