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

/**
 * Sanitize string input to prevent injection attacks
 * Security: Removes potentially dangerous characters and limits length
 */
const sanitizeString = (input: string | undefined, maxLength: number = 255): string | null => {
  if (!input || typeof input !== 'string') return null;

  // Trim and limit length
  let sanitized = input.trim().substring(0, maxLength);

  // Remove null bytes and other control characters
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Remove or escape potentially dangerous SQL/HTML characters
  // Note: Supabase handles SQL injection, but this adds defense in depth
  sanitized = sanitized
    .replace(/[<>]/g, '') // Remove HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/data:/gi, ''); // Remove data: protocol

  return sanitized || null;
};

/**
 * Validate email format
 * Security: Ensures email is in valid format before processing
 */
const isValidEmail = (email: string): boolean => {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email) && email.length <= 255;
};

/**
 * Validate phone format (optional, allows common formats)
 * Security: Ensures phone contains only valid characters
 */
const sanitizePhone = (phone: string | undefined): string | null => {
  if (!phone || typeof phone !== 'string') return null;
  // Allow only digits, spaces, dashes, parentheses, plus sign
  const cleaned = phone.replace(/[^0-9\s\-\(\)\+]/g, '').trim();
  return cleaned.length > 0 && cleaned.length <= 20 ? cleaned : null;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Lead capture started");

    // SECURITY NOTE: Using SERVICE_ROLE_KEY to bypass RLS for public lead capture
    // This is necessary because:
    // 1. This is a public endpoint (no user authentication)
    // 2. Leads table requires company_id which unauthenticated users don't have
    // 3. Input validation and sanitization (below) provides security
    //
    // RECOMMENDATION: Consider migrating to anon key with RLS policies that allow
    // public inserts to leads table with null company_id for better security
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const requestData: LeadCaptureRequest = await req.json();

    // Security: Validate and sanitize all input fields
    const rawEmail = requestData.email;

    // Validate email format first
    if (!rawEmail || !isValidEmail(rawEmail)) {
      throw new Error("Valid email is required");
    }

    // Sanitize all string inputs
    const email = sanitizeString(rawEmail, 255) || rawEmail.toLowerCase().trim();
    const firstName = sanitizeString(requestData.firstName, 100);
    const lastName = sanitizeString(requestData.lastName, 100);
    const companyName = sanitizeString(requestData.companyName, 200);
    const phone = sanitizePhone(requestData.phone);
    const companySize = sanitizeString(requestData.companySize, 50);
    const industry = sanitizeString(requestData.industry, 100);
    const leadSource = sanitizeString(requestData.leadSource, 50) || 'website';
    const interestType = sanitizeString(requestData.interestType, 50) || 'just_browsing';
    const downloadedResource = sanitizeString(requestData.downloadedResource, 200);
    const utm_source = sanitizeString(requestData.utm_source, 100);
    const utm_medium = sanitizeString(requestData.utm_medium, 100);
    const utm_campaign = sanitizeString(requestData.utm_campaign, 200);
    const utm_content = sanitizeString(requestData.utm_content, 200);
    const utm_term = sanitizeString(requestData.utm_term, 100);
    const landingPage = sanitizeString(requestData.landingPage, 500);
    const referrer = sanitizeString(requestData.referrer, 500);

    logStep("Processing lead capture", { email, interestType });

    // Check if lead already exists
    const { data: existingLead } = await supabaseClient
      .from('leads')
      .select('*')
      .eq('email', email)
      .single();

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

      const { data: updatedLead, error: updateError } = await supabaseClient
        .from('leads')
        .update(updateData)
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

    // Track activity
    const activityType = downloadedResource ? 'resource_downloaded' :
                        interestType === 'newsletter' ? 'newsletter_signup' :
                        'lead_captured';

    await supabaseClient
      .from('lead_activities')
      .insert({
        lead_id: leadId,
        activity_type: activityType,
        activity_data: {
          interest_type: interestType,
          downloaded_resource: downloadedResource,
          lead_source: leadSource
        },
        page_url: landingPage,
        user_agent: req.headers.get('user-agent')
      });

    // Track conversion event
    await supabaseClient
      .from('conversion_events')
      .insert({
        event_type: 'lead_captured',
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

    // Store attribution if new lead
    if (isNewLead && (utm_source || utm_medium || utm_campaign)) {
      await supabaseClient
        .from('user_attribution')
        .insert({
          // Note: We'll need to link this later when user signs up
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
