import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DemoRequest {
  email: string;
  firstName: string;
  lastName: string;
  companyName: string;
  phone?: string;
  companySize?: string;
  industry?: string;
  demoType?: string;
  preferredDate?: string;
  preferredTime?: string;
  timezone?: string;
  message?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
}

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

    const requestData: DemoRequest = await req.json();
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

    // Validate required fields
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

    // Track activity
    await supabaseClient
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

    // Track conversion event
    await supabaseClient
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

    // TODO: Send notification to sales team
    // TODO: Send confirmation email to requester
    // TODO: Integrate with Calendly/Cal.com if needed

    logStep("Demo request completed successfully");

    return new Response(JSON.stringify({
      success: true,
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
      error: errorMessage
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
