// Track Referral Edge Function
// Note: This is a public endpoint for referral tracking
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import { checkRateLimit, rateLimitResponse, getClientIP, RATE_LIMITS } from "../_shared/rate-limiter.ts";
import { validateBody } from "../_shared/validate-body.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// US-241. Anonymous, two writes, and affiliate_code went straight into an
// .eq() lookup against affiliate_codes. A code is a short opaque token, so the
// bound is generous rather than tight - the point is that an unbounded string
// from the internet stops being what indexes that column.
const TrackReferralSchema = z.object({
  affiliate_code: z.string().min(1).max(64),
  referee_email: z.string().email().max(255),
});

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

    // Anonymous and it writes. capture-lead - the closest sibling, reached from
    // the same marketing forms - has limited by IP since it was written; these
    // three never did, so the leads, demo and referral tables were open to
    // anyone with a loop. AUTH's ceiling (10/min/IP) matches what capture-lead
    // chose for the same shape of form.
    const clientIP = getClientIP(req);
    const rl = await checkRateLimit(supabaseClient, {
      identifier: clientIP,
      endpoint: 'track-referral',
      ...RATE_LIMITS.AUTH,
    });
    if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

    const parsed = await validateBody(req, TrackReferralSchema, { name: 'track-referral' });
    if (!parsed.ok) return parsed.response;
    const { affiliate_code, referee_email } = parsed.data as {
      affiliate_code: string; referee_email: string;
    };

    // Kept: report mode hands through the raw body on a schema failure.
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
      program: affiliateCodeData.affiliate_programs.name });

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
        timestamp: new Date().toISOString(),
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

    // Update affiliate code stats. total_referrals is what an affiliate is paid
    // against, and the error was discarded - supabase-js returns it rather than
    // throwing - so a referral that really happened could go uncounted and
    // unpaid (US-300). The referral row above is stored and checked, so this
    // reports rather than fails: the count can be rebuilt from referrals, but
    // only if somebody knows to.
    const { error: statsError } = await supabaseClient
      .from('affiliate_codes')
      .update({
        total_referrals: affiliateCodeData.total_referrals + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', affiliateCodeData.id);

    if (statsError) {
      logStep("REFERRAL RECORDED BUT NOT COUNTED - affiliate total_referrals did not advance", {
        affiliate_code_id: affiliateCodeData.id,
        referral_id: referral.id,
        error: statsError.message,
      });
    }

    logStep("Referral tracked successfully", { referral_id: referral.id });

    return new Response(JSON.stringify({
      success: true,
      timestamp: new Date().toISOString(),
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
    // success and timestamp added, error left where it is (US-274). This one
    // had no `success` key at all, which is why the sweep that stamped the
    // other responses skipped it.
    //
    // NOTE, not fixed here: errorMessage is the raw caught error. US-242 says
    // a 500 must not carry internal detail to the client, and errorResponse()
    // exists for exactly that. Swapping it in changes the VALUE of `error`,
    // which is a different change from adding two keys, so it is left for that
    // story rather than folded in silently.
    return new Response(JSON.stringify({
      success: false,
      timestamp: new Date().toISOString(),
      error: errorMessage,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});