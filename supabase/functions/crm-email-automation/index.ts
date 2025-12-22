/**
 * CRM Email Automation Edge Function
 * Handles automated email workflows for CRM activities
 * - Trigger-based emails (new lead, status change, follow-up reminders)
 * - Drip campaigns with sequences
 * - Template-based personalized emails
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CRM-EMAIL-AUTOMATION] ${step}${detailsStr}`);
};

// Email trigger types
type TriggerType =
  | 'lead_created'
  | 'lead_status_changed'
  | 'lead_assigned'
  | 'lead_score_changed'
  | 'contact_created'
  | 'opportunity_created'
  | 'opportunity_stage_changed'
  | 'deal_won'
  | 'deal_lost'
  | 'follow_up_reminder'
  | 'inactivity_reminder'
  | 'campaign_enrollment'
  | 'manual';

interface AutomationRequest {
  trigger: TriggerType;
  entityType: 'lead' | 'contact' | 'opportunity' | 'deal';
  entityId: string;
  companyId?: string;
  metadata?: Record<string, unknown>;
}

interface EmailConfig {
  templateId?: string;
  subject: string;
  htmlContent?: string;
  textContent?: string;
  fromEmail: string;
  fromName: string;
  replyTo?: string;
  variables?: Record<string, unknown>;
  delay?: number; // Minutes to wait before sending
  campaignId?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json() as AutomationRequest;
    const { trigger, entityType, entityId, companyId, metadata } = body;

    logStep('Processing automation request', { trigger, entityType, entityId });

    // Find matching automation rules
    const automations = await findMatchingAutomations(supabase, trigger, entityType, companyId);

    if (automations.length === 0) {
      logStep('No matching automations found');
      return new Response(JSON.stringify({
        success: true,
        message: 'No matching automations',
        processed: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    logStep(`Found ${automations.length} matching automations`);

    // Get entity data
    const entityData = await getEntityData(supabase, entityType, entityId, companyId);
    if (!entityData) {
      throw new Error(`Entity not found: ${entityType}/${entityId}`);
    }

    // Process each automation
    const results = [];
    for (const automation of automations) {
      try {
        const result = await processAutomation(
          supabase,
          automation,
          entityData,
          companyId,
          metadata
        );
        results.push({ automationId: automation.id, ...result });
      } catch (error) {
        logStep(`Error processing automation ${automation.id}`, {
          error: error instanceof Error ? error.message : String(error)
        });
        results.push({
          automationId: automation.id,
          success: false,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      processed: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep('ERROR', { message: errorMessage });

    return new Response(JSON.stringify({
      success: false,
      error: errorMessage
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function findMatchingAutomations(
  supabase: ReturnType<typeof createClient>,
  trigger: TriggerType,
  entityType: string,
  companyId?: string
) {
  let query = supabase
    .from('email_automations')
    .select('*')
    .eq('trigger_type', trigger)
    .eq('entity_type', entityType)
    .eq('is_active', true);

  if (companyId) {
    query = query.eq('company_id', companyId);
  }

  const { data, error } = await query;

  if (error) {
    logStep('Error finding automations', { error: error.message });
    return [];
  }

  return data || [];
}

async function getEntityData(
  supabase: ReturnType<typeof createClient>,
  entityType: string,
  entityId: string,
  companyId?: string
) {
  const tableName = getTableName(entityType);

  let query = supabase
    .from(tableName)
    .select('*')
    .eq('id', entityId);

  if (companyId) {
    query = query.eq('company_id', companyId);
  }

  const { data, error } = await query.single();

  if (error) {
    logStep('Error getting entity data', { error: error.message });
    return null;
  }

  return data;
}

function getTableName(entityType: string): string {
  const tableMap: Record<string, string> = {
    lead: 'leads',
    contact: 'contacts',
    opportunity: 'opportunities',
    deal: 'deals'
  };
  return tableMap[entityType] || entityType;
}

async function processAutomation(
  supabase: ReturnType<typeof createClient>,
  automation: Record<string, unknown>,
  entityData: Record<string, unknown>,
  companyId?: string,
  additionalMetadata?: Record<string, unknown>
) {
  const config = automation.config as EmailConfig;

  // Get recipient email
  const recipientEmail = getRecipientEmail(entityData);
  if (!recipientEmail) {
    return { success: false, error: 'No recipient email found' };
  }

  // Check if user is unsubscribed
  const isUnsubscribed = await checkUnsubscribed(supabase, recipientEmail);
  if (isUnsubscribed) {
    logStep('Recipient is unsubscribed', { email: recipientEmail });
    return { success: true, skipped: true, reason: 'unsubscribed' };
  }

  // Get email template if specified
  let htmlContent = config.htmlContent || '';
  let subject = config.subject;

  if (config.templateId) {
    const template = await getEmailTemplate(supabase, config.templateId, companyId);
    if (template) {
      htmlContent = template.content;
      subject = template.subject || subject;
    }
  }

  // Prepare variables for template
  const variables = {
    ...config.variables,
    ...additionalMetadata,
    ...prepareEntityVariables(entityData),
    unsubscribe_url: `https://build-desk.com/unsubscribe?email=${encodeURIComponent(recipientEmail)}`,
    current_date: new Date().toLocaleDateString(),
    current_year: new Date().getFullYear(),
  };

  // Apply variable substitution
  htmlContent = substituteVariables(htmlContent, variables);
  subject = substituteVariables(subject, variables);
  const textContent = config.textContent ? substituteVariables(config.textContent, variables) : undefined;

  // Calculate send time (with optional delay)
  const scheduledFor = config.delay
    ? new Date(Date.now() + config.delay * 60 * 1000).toISOString()
    : new Date().toISOString();

  // Queue the email
  const { data: queuedEmail, error: queueError } = await supabase
    .from('email_queue')
    .insert({
      company_id: companyId,
      campaign_id: config.campaignId,
      automation_id: automation.id as string,
      recipient_email: recipientEmail,
      subject,
      html_content: htmlContent,
      text_content: textContent,
      from_email: config.fromEmail || 'noreply@build-desk.com',
      from_name: config.fromName || 'BuildDesk',
      reply_to: config.replyTo,
      scheduled_for: scheduledFor,
      status: 'pending',
      priority: 1,
      queue_metadata: {
        entity_type: automation.entity_type,
        entity_id: entityData.id,
        trigger_type: automation.trigger_type,
        variables,
      }
    })
    .select()
    .single();

  if (queueError) {
    logStep('Error queueing email', { error: queueError.message });
    return { success: false, error: queueError.message };
  }

  // Log the automation activity
  await supabase
    .from('crm_activities')
    .insert({
      company_id: companyId,
      activity_type: 'email',
      description: `Automated email "${subject}" queued for ${recipientEmail}`,
      lead_id: automation.entity_type === 'lead' ? entityData.id as string : null,
      opportunity_id: automation.entity_type === 'opportunity' ? entityData.id as string : null,
      outcome: 'queued',
      activity_date: new Date().toISOString(),
    });

  logStep('Email queued successfully', {
    email: recipientEmail,
    subject,
    scheduledFor,
    queueId: queuedEmail.id
  });

  return {
    success: true,
    queueId: queuedEmail.id,
    scheduledFor,
    recipient: recipientEmail
  };
}

function getRecipientEmail(entityData: Record<string, unknown>): string | null {
  // Check various email field names
  const emailFields = ['email', 'email_address', 'contact_email', 'primary_email'];
  for (const field of emailFields) {
    if (entityData[field] && typeof entityData[field] === 'string') {
      return entityData[field] as string;
    }
  }
  return null;
}

async function checkUnsubscribed(
  supabase: ReturnType<typeof createClient>,
  email: string
): Promise<boolean> {
  const { data } = await supabase
    .from('email_unsubscribes')
    .select('id')
    .eq('email', email)
    .eq('is_active', true)
    .single();

  return !!data;
}

async function getEmailTemplate(
  supabase: ReturnType<typeof createClient>,
  templateId: string,
  companyId?: string
) {
  let query = supabase
    .from('email_templates')
    .select('*')
    .eq('id', templateId);

  if (companyId) {
    query = query.eq('company_id', companyId);
  }

  const { data } = await query.single();
  return data;
}

function prepareEntityVariables(entityData: Record<string, unknown>): Record<string, unknown> {
  // Map common entity fields to template variables
  return {
    first_name: entityData.first_name || '',
    last_name: entityData.last_name || '',
    full_name: `${entityData.first_name || ''} ${entityData.last_name || ''}`.trim() || 'there',
    email: entityData.email || '',
    phone: entityData.phone || '',
    company_name: entityData.company_name || '',
    job_title: entityData.job_title || '',
    status: entityData.status || entityData.lead_status || '',
    source: entityData.lead_source || entityData.source || '',
    project_name: entityData.project_name || '',
    project_type: entityData.project_type || '',
    estimated_budget: entityData.estimated_budget || entityData.estimated_value || 0,
    notes: entityData.notes || '',
    created_at: entityData.created_at || '',
    updated_at: entityData.updated_at || '',
  };
}

function substituteVariables(template: string, variables: Record<string, unknown>): string {
  let result = template;

  // Replace {{variable}} and {{variable_name}} patterns
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'gi');
    result = result.replace(regex, String(value ?? ''));
  }

  // Also support ${variable} pattern
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\$\\{\\s*${key}\\s*\\}`, 'gi');
    result = result.replace(regex, String(value ?? ''));
  }

  return result;
}

// ============================================================================
// DRIP CAMPAIGN FUNCTIONS
// ============================================================================

export async function enrollInDripCampaign(
  supabase: ReturnType<typeof createClient>,
  campaignId: string,
  entityType: string,
  entityId: string,
  companyId?: string
) {
  // Get campaign details
  const { data: campaign, error: campaignError } = await supabase
    .from('email_campaigns')
    .select('*')
    .eq('id', campaignId)
    .single();

  if (campaignError || !campaign) {
    throw new Error('Campaign not found');
  }

  // Get entity data for recipient email
  const tableName = getTableName(entityType);
  const { data: entity, error: entityError } = await supabase
    .from(tableName)
    .select('*')
    .eq('id', entityId)
    .single();

  if (entityError || !entity) {
    throw new Error('Entity not found');
  }

  const recipientEmail = getRecipientEmail(entity);
  if (!recipientEmail) {
    throw new Error('No recipient email found');
  }

  // Check if already enrolled
  const { data: existing } = await supabase
    .from('campaign_enrollments')
    .select('id')
    .eq('campaign_id', campaignId)
    .eq('entity_id', entityId)
    .single();

  if (existing) {
    return { success: true, message: 'Already enrolled', enrollmentId: existing.id };
  }

  // Create enrollment
  const { data: enrollment, error: enrollError } = await supabase
    .from('campaign_enrollments')
    .insert({
      company_id: companyId,
      campaign_id: campaignId,
      entity_type: entityType,
      entity_id: entityId,
      recipient_email: recipientEmail,
      status: 'active',
      current_step: 0,
      enrolled_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (enrollError) {
    throw new Error(`Failed to enroll: ${enrollError.message}`);
  }

  // Schedule first email
  await scheduleNextCampaignEmail(supabase, enrollment, campaign, entity, companyId);

  return {
    success: true,
    enrollmentId: enrollment.id,
    message: 'Enrolled in drip campaign'
  };
}

async function scheduleNextCampaignEmail(
  supabase: ReturnType<typeof createClient>,
  enrollment: Record<string, unknown>,
  campaign: Record<string, unknown>,
  entity: Record<string, unknown>,
  companyId?: string
) {
  const steps = (campaign.sequence_steps as Array<{
    delay_minutes: number;
    subject: string;
    html_content: string;
    text_content?: string;
  }>) || [];

  const currentStep = (enrollment.current_step as number) || 0;

  if (currentStep >= steps.length) {
    // Campaign completed
    await supabase
      .from('campaign_enrollments')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', enrollment.id as string);
    return;
  }

  const step = steps[currentStep];
  const delayMinutes = step.delay_minutes || 0;
  const scheduledFor = new Date(Date.now() + delayMinutes * 60 * 1000).toISOString();

  // Prepare variables
  const variables = prepareEntityVariables(entity);

  // Queue the email
  await supabase
    .from('email_queue')
    .insert({
      company_id: companyId,
      campaign_id: campaign.id as string,
      enrollment_id: enrollment.id as string,
      recipient_email: enrollment.recipient_email as string,
      subject: substituteVariables(step.subject, variables),
      html_content: substituteVariables(step.html_content, variables),
      text_content: step.text_content ? substituteVariables(step.text_content, variables) : undefined,
      from_email: (campaign.from_email as string) || 'noreply@build-desk.com',
      from_name: (campaign.from_name as string) || 'BuildDesk',
      reply_to: campaign.reply_to as string,
      scheduled_for: scheduledFor,
      status: 'pending',
      priority: 2,
      queue_metadata: {
        step_index: currentStep,
        enrollment_id: enrollment.id,
        campaign_name: campaign.campaign_name,
      }
    });

  logStep('Scheduled campaign email', {
    campaign: campaign.campaign_name,
    step: currentStep,
    scheduledFor,
    recipient: enrollment.recipient_email
  });
}
