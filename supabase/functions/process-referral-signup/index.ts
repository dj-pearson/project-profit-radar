// Process Referral Signup Edge Function
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import { validateBody } from '../_shared/validate-body.ts';
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

/**
 * The authorisation here is already right - the comments below record why
 * subscription_tier and duration are re-derived from the subscribers table
 * rather than trusted. What was missing is shape. referee_company_id reaches a
 * .eq() against a uuid column, and referee_email is the key the whole lookup
 * turns on.
 *
 * subscription_tier and subscription_duration_months stay in the schema, loose,
 * on purpose: the handler deliberately reads the caller's claimed values to LOG
 * the disagreement. Omitting them would strip the fields in enforce mode and
 * silently retire that check.
 */
const ReferralSignupSchema = z.object({
  referee_email: z.string().email().max(320),
  referee_company_id: z.string().uuid(),
  subscription_tier: z.string().max(64).optional(),
  subscription_duration_months: z.number().optional(),
});

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

    const parsed = await validateBody(req, ReferralSignupSchema, {
      name: 'process-referral-signup',
    });
    if (!parsed.ok) return parsed.response;
    const body = parsed.data as Record<string, unknown>;
    const { referee_email, referee_company_id } = body as {
      referee_email?: string;
      referee_company_id?: string;
    };

    if (!referee_email || !referee_company_id) {
      throw new Error("Missing referee_email or referee_company_id");
    }

    // SECURITY: this endpoint is verify_jwt = false and runs on the service
    // role, so everything in the body is attacker-controlled. It used to take
    // subscription_tier and subscription_duration_months from the caller and
    // use the duration as the ONLY gate on minting affiliate_rewards rows —
    // anyone who knew an email with a pending referral could claim rewards for
    // a subscription that never existed. Both facts now come from the
    // subscribers table. The body may still carry them; they are only logged
    // when they disagree, never trusted.
    const { data: subscriber } = await supabaseClient
      .from('subscribers')
      .select('user_id, subscribed, subscription_tier, billing_period')
      .eq('email', referee_email)
      .maybeSingle();

    const subscription_tier = subscriber?.subscribed ? subscriber.subscription_tier : null;
    const subscription_duration_months = subscriber?.subscribed
      ? (subscriber.billing_period === 'annual' ? 12 : 1)
      : null;

    if (body.subscription_tier && body.subscription_tier !== subscription_tier) {
      logStep("Ignoring caller-supplied subscription_tier", {
        claimed: body.subscription_tier, actual: subscription_tier
      });
    }

    // SECURITY: referee_company_id lands on the referral row and becomes the
    // company_id of the referee's reward, so it cannot be taken on trust
    // either. It must be the company the referee's own profile points at.
    if (subscriber?.user_id) {
      const { data: refereeProfile } = await supabaseClient
        .from('user_profiles')
        .select('company_id')
        .eq('id', subscriber.user_id)
        .maybeSingle();

      if (refereeProfile && refereeProfile.company_id !== referee_company_id) {
        logStep("referee_company_id does not match the referee's profile", {
          claimed: referee_company_id, actual: refereeProfile.company_id
        });
        throw new Error("referee_company_id does not match the referee account");
      }
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

      // The error was discarded, so a self-referral could be reported as
      // handled while the row stayed open and eligible for rewards later
      // (US-300).
      const { error: expireError } = await supabaseClient
        .from('affiliate_referrals')
        .update({
          referral_status: 'expired',
          updated_at: new Date().toISOString()
        })
        .eq('id', referral.id);

      if (expireError) {
        throw new Error(`Self-referral not marked invalid: ${expireError.message}`);
      }

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
          // Free months owed to the referrer. The error was discarded, so a
          // failure meant someone made a referral and was never paid for it,
          // while the run reported success (US-300).
          const { error: referrerRewardError } = await supabaseClient
            .from('affiliate_rewards')
            .insert({
              referral_id: referral.id,
              company_id: referral.referrer_company_id,
              reward_type: 'referrer',
              reward_months: referral.referrer_reward_months,
              reward_status: 'pending',
              expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year expiry
            });

          if (referrerRewardError) {
            throw new Error(`Referrer reward not granted: ${referrerRewardError.message}`);
          }
        }

        // Create reward for referee
        if (referral.referee_reward_months > 0) {
          const { error: refereeRewardError } = await supabaseClient
            .from('affiliate_rewards')
            .insert({
              referral_id: referral.id,
              company_id: referee_company_id,
              reward_type: 'referee',
              reward_months: referral.referee_reward_months,
              reward_status: 'pending',
              expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year expiry
            });

          if (refereeRewardError) {
            throw new Error(`Referee reward not granted: ${refereeRewardError.message}`);
          }
        }

        // Update referral status to rewarded. This is what stops the rewards
        // above being inserted a second time if this function runs again for
        // the same referral. The error was discarded (US-300).
        const { error: rewardedError } = await supabaseClient
          .from('affiliate_referrals')
          .update({
            referral_status: 'rewarded',
            referrer_rewarded_at: new Date().toISOString(),
            referee_rewarded_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', referral.id);

        if (rewardedError) {
          throw new Error(
            `Rewards were granted but the referral is still unrewarded, so a rerun would grant them again: ${rewardedError.message}`,
          );
        }

        // Update affiliate code successful referrals count. Counters, not
        // entitlements - log rather than throw, since the rewards above have
        // already landed. The error was discarded (US-300).
        const { error: counterError } = await supabaseClient
          .from('affiliate_codes')
          .update({
            successful_referrals: referral.affiliate_codes.successful_referrals + 1,
            total_rewards_earned: referral.affiliate_codes.total_rewards_earned + referral.referrer_reward_months,
            updated_at: new Date().toISOString()
          })
          .eq('id', referral.affiliate_code_id);

        if (counterError) {
          logStep("Affiliate code counters not updated", { error: counterError.message });
        }

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