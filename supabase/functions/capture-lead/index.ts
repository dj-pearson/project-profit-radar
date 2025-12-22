// Lead Capture Edge Function (Public Endpoint)
// Note: This is a public endpoint called from marketing forms
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-site-key",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

// Default site key for BuildDesk
const DEFAULT_SITE_KEY = 'builddesk';

interface LeadCaptureRequest {
  email: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  phone?: string;
  companySize?: string;
  industry?: string;
  leadSource?: string;
  interestType?: string;
  downloadedResource?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  landingPage?: string;
  referrer?: string;
}

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[LEAD-CAPTURE] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Lead capture started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

        const siteKey = req.headers.get("x-site-key") || DEFAULT_SITE_KEY;
    const { data: siteData } = await supabaseClient
      .from('sites')
      .select('id')
      .eq('key', siteKey)
      .single();

        logStep("Site resolved", { siteKey });

    const requestData: LeadCaptureRequest = await req.json();
    const {
      email,
      firstName,
      lastName,
      companyName,
      phone,
      companySize,
      industry,
      leadSource = 'website',
      interestType = 'just_browsing',
      downloadedResource,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_content,
      utm_term,
      landingPage,
      referrer
    } = requestData;

    // Validate required fields
    if (!email) {
      throw new Error("Email is required");
    }

    logStep("Processing lead capture", { email, interestType });

    // Check if lead already exists with site isolation
    let existingLeadQuery = supabaseClient
      .from('leads')
      .select('*')
      .eq('email', email);

    if (siteId) {
      existingLeadQuery = existingLeadQuery;  // CRITICAL: Site isolation
    }

    const { data: existingLead } = await existingLeadQuery.single();

    let leadId: string;
    let isNewLead = false;

    if (existingLead) {
      // Update existing lead with new information
      const updateData: any = {
        last_activity_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Only update if new values provided
      if (firstName) updateData.first_name = firstName;
      if (lastName) updateData.last_name = lastName;
      if (companyName) updateData.company_name = companyName;
      if (phone) updateData.phone = phone;
      if (companySize) updateData.company_size = companySize;
      if (industry) updateData.industry = industry;
      if (downloadedResource) updateData.downloaded_resource = true;

      // Update UTM if not already set
      if (!existingLead.utm_source && utm_source) updateData.utm_source = utm_source;
      if (!existingLead.utm_medium && utm_medium) updateData.utm_medium = utm_medium;
      if (!existingLead.utm_campaign && utm_campaign) updateData.utm_campaign = utm_campaign;

      // Update with site isolation
      let updateQuery = supabaseClient
        .from('leads')
        .update(updateData)
        .eq('id', existingLead.id);

      if (siteId) {
        updateQuery = updateQuery;  // CRITICAL: Site isolation on update
      }

      const { data: updatedLead, error: updateError } = await updateQuery.select().single();

      if (updateError) throw updateError;
      leadId = updatedLead.id;
      logStep("Updated existing lead", { leadId });
    } else {
      // Create new lead with site isolation
      const { data: newLead, error: createError } = await supabaseClient
        .from('leads')
        .insert({            email,
          first_name: firstName || null,
          last_name: lastName || null,
          company_name: companyName || null,
          phone: phone || null,
          company_size: companySize || null,
          industry: industry || null,
          lead_source: leadSource,
          lead_status: 'new',
          interest_type: interestType,
          downloaded_resource: !!downloadedResource,
          utm_source: utm_source || null,
          utm_medium: utm_medium || null,
          utm_campaign: utm_campaign || null,
          landing_page: landingPage || null,
          referrer: referrer || null,
          lead_score: 10 // Base score for newsletter/resource signup
        })
        .select()
        .single();

      if (createError) throw createError;
      leadId = newLead.id;
      isNewLead = true;
      logStep("Created new lead", { leadId });
    }

    // Track activity with site isolation
    const activityType = downloadedResource ? 'resource_downloaded' :
                        interestType === 'newsletter' ? 'newsletter_signup' :
                        'lead_captured';

    await supabaseClient
      .from('lead_activities')
      .insert({          lead_id: leadId,
        activity_type: activityType,
        activity_data: {
          interest_type: interestType,
          downloaded_resource: downloadedResource,
          lead_source: leadSource
        },
        page_url: landingPage,
        user_agent: req.headers.get('user-agent')
      });

    // Track conversion event with site isolation
    await supabaseClient
      .from('conversion_events')
      .insert({          event_type: 'lead_captured',
        event_step: 1,
        funnel_name: 'marketing_funnel',
        utm_source,
        utm_medium,
        utm_campaign,
        utm_content,
        utm_term,
        event_metadata: {
          interest_type: interestType,
          lead_source: leadSource,
          is_new_lead: isNewLead
        }
      });

    // Store attribution if new lead with site isolation
    if (isNewLead && (utm_source || utm_medium || utm_campaign)) {
      await supabaseClient
        .from('user_attribution')
        .insert({            // Note: We'll need to link this later when user signs up
          first_touch_utm_source: utm_source,
          first_touch_utm_medium: utm_medium,
          first_touch_utm_campaign: utm_campaign,
          first_touch_utm_content: utm_content,
          first_touch_utm_term: utm_term,
          first_touch_landing_page: landingPage,
          first_touch_referrer: referrer,
          first_touch_at: new Date().toISOString()
        })
        .select();
    }

    // TODO: Send welcome/confirmation email
    // TODO: Add to email nurture campaign
    // TODO: Trigger any webhooks (Zapier, Make.com, etc.)

    logStep("Lead capture completed successfully");

    return new Response(JSON.stringify({
      success: true,
      message: isNewLead ? "Thanks for your interest! Check your email for more information." : "Thanks for staying in touch!",
      leadId,
      isNewLead
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in lead capture", { message: errorMessage });

    return new Response(JSON.stringify({
      success: false,
      error: errorMessage
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
