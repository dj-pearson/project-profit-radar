// Handle Demo Request Edge Function
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import { checkRateLimit, rateLimitResponse, getClientIP, RATE_LIMITS } from "../_shared/rate-limiter.ts";
import { validateBody } from "../_shared/validate-body.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// US-241. Every field below reached `leads`, `demo_requests`, `lead_activities`
// and `conversion_events` from an unauthenticated request with nothing but a
// truthiness check on four of them. The columns are all TEXT, so Postgres
// imposed no ceiling either.
//
// The lengths are capture-lead's, not invented: that function is reached from
// the same marketing forms and has sanitized to 100/200/20/50/100 since it was
// written. Two siblings writing the same `leads` row should agree on what fits.
//
// preferred_date is a DATE column and preferredDate went into it unchecked, so
// a non-date string was a Postgres error surfacing as a 500 on a form nobody
// could resubmit differently.
const DemoRequestSchema = z.object({
  email: z.string().email().max(255),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  companyName: z.string().min(1).max(200),
  phone: z.string().max(20).optional(),
  companySize: z.string().max(50).optional(),
  industry: z.string().max(100).optional(),
  demoType: z.string().max(50).optional(),
  preferredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD').optional(),
  preferredTime: z.string().max(50).optional(),
  timezone: z.string().max(100).optional(),
  message: z.string().max(5000).optional(),
  utm_source: z.string().max(100).optional(),
  utm_medium: z.string().max(100).optional(),
  utm_campaign: z.string().max(200).optional(),
});

type DemoRequest = z.infer<typeof DemoRequestSchema>;

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[DEMO-REQUEST] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Demo request started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Anonymous and it writes. capture-lead - the closest sibling, reached from
    // the same marketing forms - has limited by IP since it was written; these
    // three never did, so the leads, demo and referral tables were open to
    // anyone with a loop. AUTH's ceiling (10/min/IP) matches what capture-lead
    // chose for the same shape of form.
    const clientIP = getClientIP(req);
    const rl = await checkRateLimit(supabaseClient, {
      identifier: clientIP,
      endpoint: 'handle-demo-request',
      ...RATE_LIMITS.AUTH,
    });
    if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

    const parsed = await validateBody(req, DemoRequestSchema, { name: 'handle-demo-request' });
    if (!parsed.ok) return parsed.response;
    const requestData = parsed.data as DemoRequest;

    const {
      email,
      firstName,
      lastName,
      companyName,
      phone,
      companySize,
      industry,
      demoType = 'standard',
      preferredDate,
      preferredTime,
      timezone,
      message,
      utm_source,
      utm_medium,
      utm_campaign
    } = requestData;

    // Kept deliberately. In report mode (the default) validateBody hands the
    // handler the RAW body when the schema fails, so this is still the only
    // thing standing between a blank form and four inserts. It goes when
    // INPUT_VALIDATION_MODE=enforce, which is also when this stops being a 500
    // and becomes the 400 it always should have been.
    if (!email || !firstName || !lastName || !companyName) {
      throw new Error("Missing required fields");
    }

    logStep("Processing demo request", { email, companyName });

    // Check if lead already exists
    const { data: existingLead } = await supabaseClient
      .from('leads')
      .select('id')
      .eq('email', email)
      .single();

    let leadId: string;

    if (existingLead) {
      // Update existing lead
      const { data: updatedLead, error: updateError } = await supabaseClient
        .from('leads')
        .update({
          first_name: firstName,
          last_name: lastName,
          company_name: companyName,
          phone: phone || null,
          company_size: companySize || null,
          industry: industry || null,
          requested_demo: true,
          lead_status: 'demo_scheduled',
          interest_type: 'demo',
          utm_source: utm_source || null,
          utm_medium: utm_medium || null,
          utm_campaign: utm_campaign || null,
          last_activity_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', existingLead.id)
        .select()
        .single();

      if (updateError) throw updateError;
      leadId = updatedLead.id;
      logStep("Updated existing lead", { leadId });
    } else {
      // Create new lead
      const { data: newLead, error: createError } = await supabaseClient
        .from('leads')
        .insert({
          email,
          first_name: firstName,
          last_name: lastName,
          company_name: companyName,
          phone: phone || null,
          company_size: companySize || null,
          industry: industry || null,
          lead_source: 'website',
          lead_status: 'demo_scheduled',
          interest_type: 'demo',
          requested_demo: true,
          utm_source: utm_source || null,
          utm_medium: utm_medium || null,
          utm_campaign: utm_campaign || null,
          lead_score: 50 // Demo requests start with good score
        })
        .select()
        .single();

      if (createError) throw createError;
      leadId = newLead.id;
      logStep("Created new lead", { leadId });
    }

    // Create demo request record
    const { data: demoRequest, error: demoError } = await supabaseClient
      .from('demo_requests')
      .insert({
        lead_id: leadId,
        email,
        first_name: firstName,
        last_name: lastName,
        company_name: companyName,
        phone: phone || null,
        demo_type: demoType,
        preferred_date: preferredDate || null,
        preferred_time: preferredTime || null,
        timezone: timezone || 'America/New_York',
        message: message || null,
        status: 'requested'
      })
      .select()
      .single();

    if (demoError) throw demoError;

    logStep("Created demo request", { demoRequestId: demoRequest.id });

    // Track activity.
    // marketing record of it, and their errors were discarded; supabase-js
    // returns them rather than throwing, so a lost row meant a real conversion
    // simply never appeared in the funnel and the campaign that produced it got
    // no credit. Reported rather than failed: refusing the request would lose
    // the lead itself, which is worse (US-300).
    const { error: activityError } = await supabaseClient
      .from('lead_activities')
      .insert({
        lead_id: leadId,
        activity_type: 'demo_request',
        activity_data: {
          demo_type: demoType,
          preferred_date: preferredDate,
          preferred_time: preferredTime,
          message
        }
      });

    if (activityError) {
      logStep("Demo request STORED but the activity was not recorded", {
        leadId,
        error: activityError.message,
      });
    }

    // Track conversion event
    const { error: conversionError } = await supabaseClient
      .from('conversion_events')
      .insert({
        event_type: 'demo_requested',
        event_step: 2,
        funnel_name: 'sales_funnel',
        utm_source,
        utm_medium,
        utm_campaign,
        event_metadata: {
          demo_type: demoType,
          company_name: companyName,
          company_size: companySize
        }
      });

    if (conversionError) {
      logStep("Demo request STORED but the conversion event was not recorded", {
        leadId,
        error: conversionError.message,
      });
    }

    // TODO: Send notification to sales team
    // TODO: Send confirmation email to requester
    // TODO: Integrate with Calendly/Cal.com if needed

    logStep("Demo request completed successfully");

    return new Response(JSON.stringify({
      success: true,
      timestamp: new Date().toISOString(),
      message: "Demo request received! Our team will contact you shortly.",
      leadId,
      demoRequestId: demoRequest.id
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in demo request", { message: errorMessage });

    return new Response(JSON.stringify({
      success: false,
      timestamp: new Date().toISOString(),
      error: errorMessage
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
