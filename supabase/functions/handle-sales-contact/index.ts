import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import { checkRateLimit, rateLimitResponse, getClientIP, RATE_LIMITS } from "../_shared/rate-limiter.ts";
import { validateBody } from "../_shared/validate-body.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// US-241. Same shape as handle-demo-request: anonymous, five writes, every
// field straight from req.json() with a truthiness check on five of them.
// Lengths mirror capture-lead's sanitizer, which is reached from the same
// marketing forms and writes the same `leads` row.
//
// `message` is the one that mattered. It is written to sales_contact_requests
// AND its length is logged as message_length, which is a decent hint that
// somebody expected long input here; nothing bounded it. 5000 is the same
// ceiling the demo form's message now carries.
const SalesContactSchema = z.object({
  email: z.string().email().max(255),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  companyName: z.string().min(1).max(200),
  phone: z.string().max(20).optional(),
  companySize: z.string().max(50).optional(),
  industry: z.string().max(100).optional(),
  inquiryType: z.string().max(50).optional(),
  message: z.string().min(1).max(5000),
  estimatedBudget: z.string().max(50).optional(),
  timeline: z.string().max(100).optional(),
  utm_source: z.string().max(100).optional(),
  utm_medium: z.string().max(100).optional(),
  utm_campaign: z.string().max(200).optional(),
});

type SalesContactRequest = z.infer<typeof SalesContactSchema>;

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SALES-CONTACT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Sales contact request started");

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
      endpoint: 'handle-sales-contact',
      ...RATE_LIMITS.AUTH,
    });
    if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

    const parsed = await validateBody(req, SalesContactSchema, { name: 'handle-sales-contact' });
    if (!parsed.ok) return parsed.response;
    const requestData = parsed.data as SalesContactRequest;
    const {
      email,
      firstName,
      lastName,
      companyName,
      phone,
      companySize,
      industry,
      inquiryType = 'general',
      message,
      estimatedBudget,
      timeline,
      utm_source,
      utm_medium,
      utm_campaign
    } = requestData;

    // Kept deliberately: report mode (the default) hands the handler the RAW
    // body when the schema fails, so this is still what stops a blank form
    // writing five rows. It becomes redundant - and a 400 rather than a 500 -
    // when INPUT_VALIDATION_MODE=enforce.
    if (!email || !firstName || !lastName || !companyName || !message) {
      throw new Error("Missing required fields");
    }

    logStep("Processing sales contact", { email, companyName, inquiryType });

    // Check if lead already exists
    const { data: existingLead } = await supabaseClient
      .from('leads')
      .select('id')
      .eq('email', email)
      .single();

    let leadId: string;
    let leadScore = 40; // Base score for sales inquiry

    // Calculate lead score based on info provided
    if (companySize === '201-500' || companySize === '500+') leadScore += 20;
    if (inquiryType === 'enterprise' || inquiryType === 'pricing') leadScore += 15;
    if (estimatedBudget) leadScore += 10;
    if (phone) leadScore += 5;

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
          requested_sales_contact: true,
          lead_status: 'contacted',
          interest_type: 'sales_contact',
          utm_source: utm_source || null,
          utm_medium: utm_medium || null,
          utm_campaign: utm_campaign || null,
          lead_score: leadScore,
          priority: leadScore >= 70 ? 'hot' : leadScore >= 50 ? 'high' : 'medium',
          last_activity_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', existingLead.id)
        .select()
        .single();

      if (updateError) throw updateError;
      leadId = updatedLead.id;
      logStep("Updated existing lead", { leadId, leadScore });
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
          lead_status: 'new',
          interest_type: 'sales_contact',
          requested_sales_contact: true,
          lead_score: leadScore,
          priority: leadScore >= 70 ? 'hot' : leadScore >= 50 ? 'high' : 'medium',
          utm_source: utm_source || null,
          utm_medium: utm_medium || null,
          utm_campaign: utm_campaign || null
        })
        .select()
        .single();

      if (createError) throw createError;
      leadId = newLead.id;
      logStep("Created new lead", { leadId, leadScore });
    }

    // Create sales contact request record
    const { data: salesContact, error: salesError } = await supabaseClient
      .from('sales_contact_requests')
      .insert({
        lead_id: leadId,
        email,
        first_name: firstName,
        last_name: lastName,
        company_name: companyName,
        phone: phone || null,
        inquiry_type: inquiryType,
        message,
        estimated_budget: estimatedBudget || null,
        timeline: timeline || null,
        status: 'new'
      })
      .select()
      .single();

    if (salesError) throw salesError;

    logStep("Created sales contact request", { salesContactId: salesContact.id });

    // Track activity.
    // The sales contact is already stored - that write throws. These two are
    // the marketing record of it, and their errors were discarded; supabase-js
    // returns them rather than throwing, so a lost row meant a real conversion
    // never appeared in the funnel and the campaign that produced it got no
    // credit. Reported rather than failed: refusing the request would lose the
    // enquiry itself, which is worse (US-300).
    const { error: activityError } = await supabaseClient
      .from('lead_activities')
      .insert({
        lead_id: leadId,
        activity_type: 'sales_contact_request',
        activity_data: {
          inquiry_type: inquiryType,
          estimated_budget: estimatedBudget,
          timeline,
          message_length: message.length
        }
      });

    if (activityError) {
      logStep("Sales contact STORED but the activity was not recorded", {
        leadId,
        error: activityError.message,
      });
    }

    // Track conversion event
    const { error: conversionError } = await supabaseClient
      .from('conversion_events')
      .insert({
        event_type: 'sales_contact_requested',
        event_step: 2,
        funnel_name: 'sales_funnel',
        utm_source,
        utm_medium,
        utm_campaign,
        event_metadata: {
          inquiry_type: inquiryType,
          company_name: companyName,
          company_size: companySize,
          lead_score: leadScore
        }
      });

    if (conversionError) {
      logStep("Sales contact STORED but the conversion event was not recorded", {
        leadId,
        lead_score: leadScore,
        error: conversionError.message,
      });
    }

    // TODO: Send notification to sales team (Slack, email, etc.)
    // TODO: Send confirmation email to requester
    // TODO: Create task in CRM system

    logStep("Sales contact request completed successfully");

    return new Response(JSON.stringify({
      success: true,
      message: "Thank you for contacting us! Our sales team will reach out within 24 hours.",
      leadId,
      salesContactId: salesContact.id,
      priority: leadScore >= 70 ? 'hot' : leadScore >= 50 ? 'high' : 'medium'
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in sales contact request", { message: errorMessage });

    return new Response(JSON.stringify({
      success: false,
      error: errorMessage
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
