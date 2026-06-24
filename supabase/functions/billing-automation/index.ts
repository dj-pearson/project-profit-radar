// Billing Automation Engine Edge Function
// Manages automated billing rules and scheduled actions
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import { initializeAuthContext, errorResponse } from '../_shared/auth-helpers.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[BILLING-AUTOMATION] ${step}${detailsStr}`);
};

interface AutomationRequest {
  action: 'create_rule' | 'update_rule' | 'delete_rule' | 'list_rules' | 'execute_rule' | 'run_scheduled' | 'get_logs';
  rule_id?: string;
  rule?: AutomationRule;
}

interface AutomationRule {
  name: string;
  description?: string;
  automation_type: 'invoice_generation' | 'payment_reminder' | 'late_fee' | 'discount_application' | 'subscription_renewal' | 'usage_billing' | 'recurring_charge';
  is_active?: boolean;
  trigger_conditions: TriggerConditions;
  actions: AutomationActions;
  schedule?: ScheduleConfig;
}

interface TriggerConditions {
  trigger_type: 'schedule' | 'event' | 'condition';
  event_type?: string; // e.g., 'invoice_created', 'payment_received', 'project_completed'
  conditions?: {
    field: string;
    operator: 'equals' | 'greater_than' | 'less_than' | 'contains' | 'days_before' | 'days_after';
    value: unknown;
  }[];
}

interface AutomationActions {
  action_type: 'send_email' | 'create_invoice' | 'apply_fee' | 'apply_discount' | 'update_status' | 'notify_admin' | 'webhook';
  email_template?: string;
  fee_percentage?: number;
  fee_fixed_amount?: number;
  discount_percentage?: number;
  status_update?: string;
  webhook_url?: string;
  custom_data?: Record<string, unknown>;
}

interface ScheduleConfig {
  frequency: 'once' | 'daily' | 'weekly' | 'monthly' | 'custom';
  time?: string; // HH:MM
  day_of_week?: number; // 0-6
  day_of_month?: number; // 1-31
  cron_expression?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create service role client for scheduled tasks
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseClient = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });

    // Check for authorization header for user-initiated requests
    const authHeader = req.headers.get('Authorization');
    let companyId: string | null = null;
    let userId: string | null = null;

    if (authHeader) {
      const authContext = await initializeAuthContext(req);
      if (authContext) {
        userId = authContext.user.id;
        const { data: profile } = await authContext.supabase
          .from('user_profiles')
          .select('company_id')
          .eq('id', userId)
          .single();
        companyId = profile?.company_id;
      }
    }

    const body: AutomationRequest = await req.json();
    const { action } = body;

    logStep('Processing action', { action, companyId });

    switch (action) {
      case 'create_rule':
        if (!companyId) return errorResponse('Unauthorized', 401);
        return await createRule(supabaseClient, companyId, body.rule!);

      case 'update_rule':
        if (!companyId) return errorResponse('Unauthorized', 401);
        return await updateRule(supabaseClient, companyId, body.rule_id!, body.rule!);

      case 'delete_rule':
        if (!companyId) return errorResponse('Unauthorized', 401);
        return await deleteRule(supabaseClient, companyId, body.rule_id!);

      case 'list_rules':
        if (!companyId) return errorResponse('Unauthorized', 401);
        return await listRules(supabaseClient, companyId);

      case 'execute_rule':
        if (!companyId) return errorResponse('Unauthorized', 401);
        return await executeRule(supabaseClient, companyId, body.rule_id!);

      case 'run_scheduled':
        return await runScheduledRules(supabaseClient);

      case 'get_logs':
        if (!companyId) return errorResponse('Unauthorized', 401);
        return await getExecutionLogs(supabaseClient, companyId, body.rule_id);

      default:
        return errorResponse('Invalid action', 400);
    }

  } catch (error) {
    const errorObj = error as Error;
    logStep('Error', { error: errorObj.message });
    return new Response(
      JSON.stringify({ success: false, error: errorObj.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

async function createRule(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  rule: AutomationRule
): Promise<Response> {
  if (!rule.name || !rule.automation_type || !rule.trigger_conditions || !rule.actions) {
    return errorResponse('name, automation_type, trigger_conditions, and actions are required', 400);
  }

  // Calculate next run time if scheduled
  let nextRunAt: string | null = null;
  if (rule.schedule && rule.trigger_conditions.trigger_type === 'schedule') {
    nextRunAt = calculateNextRunTime(rule.schedule);
  }

  const { data, error } = await supabase
    .from('billing_automation_rules')
    .insert({
      tenant_id: companyId,
      name: rule.name,
      description: rule.description,
      automation_type: rule.automation_type,
      is_active: rule.is_active ?? true,
      trigger_conditions: rule.trigger_conditions,
      actions: rule.actions,
      schedule: rule.schedule,
      next_run_at: nextRunAt,
      run_count: 0
    })
    .select()
    .single();

  if (error) {
    return errorResponse(`Failed to create rule: ${error.message}`, 500);
  }

  logStep('Rule created', { ruleId: data.id, name: rule.name });

  return new Response(
    JSON.stringify({
      success: true,
      rule: data,
      message: 'Automation rule created successfully'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
  );
}

async function updateRule(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  ruleId: string,
  rule: Partial<AutomationRule>
): Promise<Response> {
  if (!ruleId) {
    return errorResponse('rule_id is required', 400);
  }

  const updateData: Record<string, unknown> = {};
  if (rule.name) updateData.name = rule.name;
  if (rule.description !== undefined) updateData.description = rule.description;
  if (rule.automation_type) updateData.automation_type = rule.automation_type;
  if (rule.is_active !== undefined) updateData.is_active = rule.is_active;
  if (rule.trigger_conditions) updateData.trigger_conditions = rule.trigger_conditions;
  if (rule.actions) updateData.actions = rule.actions;
  if (rule.schedule) {
    updateData.schedule = rule.schedule;
    updateData.next_run_at = calculateNextRunTime(rule.schedule);
  }

  const { data, error } = await supabase
    .from('billing_automation_rules')
    .update(updateData)
    .eq('id', ruleId)
    .eq('tenant_id', companyId)
    .select()
    .single();

  if (error) {
    return errorResponse(`Failed to update rule: ${error.message}`, 500);
  }

  return new Response(
    JSON.stringify({
      success: true,
      rule: data,
      message: 'Automation rule updated successfully'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
  );
}

async function deleteRule(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  ruleId: string
): Promise<Response> {
  if (!ruleId) {
    return errorResponse('rule_id is required', 400);
  }

  const { error } = await supabase
    .from('billing_automation_rules')
    .delete()
    .eq('id', ruleId)
    .eq('tenant_id', companyId);

  if (error) {
    return errorResponse(`Failed to delete rule: ${error.message}`, 500);
  }

  return new Response(
    JSON.stringify({
      success: true,
      message: 'Automation rule deleted successfully'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
  );
}

async function listRules(
  supabase: ReturnType<typeof createClient>,
  companyId: string
): Promise<Response> {
  const { data: rules, error } = await supabase
    .from('billing_automation_rules')
    .select('*')
    .eq('tenant_id', companyId)
    .order('created_at', { ascending: false });

  if (error) {
    return errorResponse(`Failed to list rules: ${error.message}`, 500);
  }

  // Group by type
  const grouped = {
    invoice_generation: rules?.filter(r => r.automation_type === 'invoice_generation') || [],
    payment_reminder: rules?.filter(r => r.automation_type === 'payment_reminder') || [],
    late_fee: rules?.filter(r => r.automation_type === 'late_fee') || [],
    discount_application: rules?.filter(r => r.automation_type === 'discount_application') || [],
    subscription_renewal: rules?.filter(r => r.automation_type === 'subscription_renewal') || [],
    usage_billing: rules?.filter(r => r.automation_type === 'usage_billing') || [],
    recurring_charge: rules?.filter(r => r.automation_type === 'recurring_charge') || []
  };

  return new Response(
    JSON.stringify({
      success: true,
      rules,
      grouped,
      summary: {
        total: rules?.length || 0,
        active: rules?.filter(r => r.is_active).length || 0,
        inactive: rules?.filter(r => !r.is_active).length || 0
      }
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
  );
}

async function executeRule(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  ruleId: string
): Promise<Response> {
  if (!ruleId) {
    return errorResponse('rule_id is required', 400);
  }

  const { data: rule, error: fetchError } = await supabase
    .from('billing_automation_rules')
    .select('*')
    .eq('id', ruleId)
    .eq('tenant_id', companyId)
    .single();

  if (fetchError || !rule) {
    return errorResponse('Rule not found', 404);
  }

  const result = await executeRuleActions(supabase, companyId, rule);

  // Update run count and last run time
  await supabase
    .from('billing_automation_rules')
    .update({
      run_count: (rule.run_count || 0) + 1,
      last_run_at: new Date().toISOString(),
      next_run_at: rule.schedule ? calculateNextRunTime(rule.schedule) : null
    })
    .eq('id', ruleId);

  // Log execution
  await supabase
    .from('activity_feed')
    .insert({
      company_id: companyId,
      activity_type: 'billing_automation_executed',
      title: `Automation Rule Executed: ${rule.name}`,
      description: result.message,
      entity_type: 'billing_automation_rule',
      entity_id: ruleId,
      metadata: { result },
      user_id: '00000000-0000-0000-0000-000000000000' // System user
    });

  return new Response(
    JSON.stringify({
      success: result.success,
      result,
      message: result.message
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
  );
}

async function runScheduledRules(supabase: ReturnType<typeof createClient>): Promise<Response> {
  const now = new Date().toISOString();

  // Get all rules that are due to run
  const { data: rules, error } = await supabase
    .from('billing_automation_rules')
    .select('*, tenant_id')
    .eq('is_active', true)
    .lte('next_run_at', now)
    .not('next_run_at', 'is', null)
    .limit(50);

  if (error) {
    return errorResponse(`Failed to fetch rules: ${error.message}`, 500);
  }

  let executed = 0;
  let failed = 0;

  for (const rule of rules || []) {
    try {
      await executeRuleActions(supabase, rule.tenant_id, rule);

      // Update run count and schedule next run
      await supabase
        .from('billing_automation_rules')
        .update({
          run_count: (rule.run_count || 0) + 1,
          last_run_at: now,
          next_run_at: rule.schedule ? calculateNextRunTime(rule.schedule) : null
        })
        .eq('id', rule.id);

      executed++;
    } catch (err) {
      logStep('Rule execution failed', { ruleId: rule.id, error: (err as Error).message });
      failed++;
    }
  }

  logStep('Scheduled rules processed', { executed, failed });

  return new Response(
    JSON.stringify({
      success: true,
      executed,
      failed,
      total: rules?.length || 0,
      message: `Executed ${executed} rules, ${failed} failed`
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
  );
}

async function executeRuleActions(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  rule: Record<string, unknown>
): Promise<{ success: boolean; message: string; details?: unknown }> {
  const actions = rule.actions as AutomationActions;
  const automationType = rule.automation_type as string;

  logStep('Executing rule', { ruleId: rule.id, type: automationType, actionType: actions.action_type });

  switch (automationType) {
    case 'invoice_generation':
      return await executeInvoiceGeneration(supabase, companyId, rule);

    case 'payment_reminder':
      return await executePaymentReminder(supabase, companyId, rule);

    case 'late_fee':
      return await executeLateFeee(supabase, companyId, rule, actions);

    case 'discount_application':
      return await executeDiscountApplication(supabase, companyId, rule, actions);

    case 'usage_billing':
      return await executeUsageBilling(supabase, companyId, rule);

    default:
      return { success: true, message: `Rule type ${automationType} executed (no specific action)` };
  }
}

async function executeInvoiceGeneration(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  rule: Record<string, unknown>
): Promise<{ success: boolean; message: string; details?: unknown }> {
  // Get projects that need invoices
  const { data: projects } = await supabase
    .from('projects')
    .select('id, name, actual_cost, budget')
    .eq('company_id', companyId)
    .eq('status', 'active');

  // This would generate invoices based on rule conditions
  // For now, just return a summary
  return {
    success: true,
    message: `Invoice generation rule executed. Found ${projects?.length || 0} active projects.`,
    details: { projectsChecked: projects?.length || 0 }
  };
}

async function executePaymentReminder(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  rule: Record<string, unknown>
): Promise<{ success: boolean; message: string; details?: unknown }> {
  // Trigger payment reminder function
  try {
    const { data, error } = await supabase.functions.invoke('send-payment-reminder', {
      body: {
        action: 'schedule',
        company_id: companyId
      }
    });

    if (error) throw error;

    return {
      success: true,
      message: `Payment reminders scheduled: ${data?.scheduled || 0} reminders`,
      details: data
    };
  } catch (err) {
    return {
      success: false,
      message: `Failed to schedule reminders: ${(err as Error).message}`
    };
  }
}

async function executeLateFeee(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  rule: Record<string, unknown>,
  actions: AutomationActions
): Promise<{ success: boolean; message: string; details?: unknown }> {
  const feePercentage = actions.fee_percentage || 0;
  const feeFixed = actions.fee_fixed_amount || 0;

  // Get overdue invoices
  const today = new Date();
  const { data: overdueInvoices } = await supabase
    .from('invoices')
    .select('id, invoice_number, total_amount, due_date')
    .eq('company_id', companyId)
    .eq('status', 'overdue')
    .lt('due_date', today.toISOString());

  let feesApplied = 0;

  for (const invoice of overdueInvoices || []) {
    const fee = feeFixed > 0 ? feeFixed : (invoice.total_amount * feePercentage / 100);

    // Add late fee to invoice
    await supabase
      .from('invoices')
      .update({
        late_fee: fee,
        total_amount: invoice.total_amount + fee
      })
      .eq('id', invoice.id);

    feesApplied++;
  }

  return {
    success: true,
    message: `Applied late fees to ${feesApplied} overdue invoices`,
    details: { feesApplied, feePercentage, feeFixed }
  };
}

async function executeDiscountApplication(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  rule: Record<string, unknown>,
  actions: AutomationActions
): Promise<{ success: boolean; message: string; details?: unknown }> {
  const discountPercentage = actions.discount_percentage || 0;

  // Get eligible invoices based on conditions
  const { data: invoices } = await supabase
    .from('invoices')
    .select('id, invoice_number, total_amount')
    .eq('company_id', companyId)
    .eq('status', 'draft');

  let discountsApplied = 0;

  for (const invoice of invoices || []) {
    const discount = invoice.total_amount * discountPercentage / 100;

    await supabase
      .from('invoices')
      .update({
        discount_amount: discount,
        total_amount: invoice.total_amount - discount
      })
      .eq('id', invoice.id);

    discountsApplied++;
  }

  return {
    success: true,
    message: `Applied ${discountPercentage}% discount to ${discountsApplied} invoices`,
    details: { discountsApplied, discountPercentage }
  };
}

async function executeUsageBilling(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  rule: Record<string, unknown>
): Promise<{ success: boolean; message: string; details?: unknown }> {
  // Get unbilled usage records
  const { data: usageRecords } = await supabase
    .from('usage_billing_records')
    .select('*')
    .eq('company_id', companyId)
    .eq('billed', false);

  // This would create invoices for usage
  // For now, just return a summary
  return {
    success: true,
    message: `Found ${usageRecords?.length || 0} unbilled usage records`,
    details: { unbilledRecords: usageRecords?.length || 0 }
  };
}

async function getExecutionLogs(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  ruleId?: string
): Promise<Response> {
  let query = supabase
    .from('activity_feed')
    .select('*')
    .eq('company_id', companyId)
    .eq('activity_type', 'billing_automation_executed')
    .order('created_at', { ascending: false })
    .limit(100);

  if (ruleId) {
    query = query.eq('entity_id', ruleId);
  }

  const { data: logs, error } = await query;

  if (error) {
    return errorResponse(`Failed to fetch logs: ${error.message}`, 500);
  }

  return new Response(
    JSON.stringify({
      success: true,
      logs
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
  );
}

function calculateNextRunTime(schedule: ScheduleConfig): string {
  const now = new Date();

  switch (schedule.frequency) {
    case 'daily':
      const [hours, minutes] = (schedule.time || '09:00').split(':').map(Number);
      const nextDaily = new Date(now);
      nextDaily.setHours(hours, minutes, 0, 0);
      if (nextDaily <= now) {
        nextDaily.setDate(nextDaily.getDate() + 1);
      }
      return nextDaily.toISOString();

    case 'weekly':
      const nextWeekly = new Date(now);
      const targetDay = schedule.day_of_week || 1; // Monday
      const daysUntil = (targetDay - now.getDay() + 7) % 7 || 7;
      nextWeekly.setDate(now.getDate() + daysUntil);
      if (schedule.time) {
        const [h, m] = schedule.time.split(':').map(Number);
        nextWeekly.setHours(h, m, 0, 0);
      }
      return nextWeekly.toISOString();

    case 'monthly':
      const nextMonthly = new Date(now);
      nextMonthly.setDate(schedule.day_of_month || 1);
      if (nextMonthly <= now) {
        nextMonthly.setMonth(nextMonthly.getMonth() + 1);
      }
      if (schedule.time) {
        const [h, m] = schedule.time.split(':').map(Number);
        nextMonthly.setHours(h, m, 0, 0);
      }
      return nextMonthly.toISOString();

    case 'once':
    default:
      // No recurring schedule
      return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  }
}
