import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SalesContactRequest {
  email: string;
  firstName: string;
  lastName: string;
  companyName: string;
  phone?: string;
  companySize?: string;
  industry?: string;
  inquiryType?: string;
  message: string;
  estimatedBudget?: string;
  timeline?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
}

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

    const requestData: SalesContactRequest = await req.json();
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

    // Validate required fields
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

    // Track activity
    await supabaseClient
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

    // Track conversion event
    await supabaseClient
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
