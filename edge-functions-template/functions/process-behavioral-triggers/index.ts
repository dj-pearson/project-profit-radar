import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[TRIGGERS] ${step}${detailsStr}`);
};

/**
 * Process behavioral triggers for user events
 * Called automatically when tracked events occur
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Trigger processor started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get request body
    const { eventName, userId, eventData } = await req.json();

    if (!eventName || !userId) {
      throw new Error("Missing required fields: eventName and userId");
    }

    logStep("Processing triggers for event", { eventName, userId });

    // Get matching trigger rules for this event
    const { data: triggers, error: triggersError } = await supabaseClient
      .rpc('get_triggers_for_event', {
        p_event_name: eventName,
        p_user_id: userId,
      });

    if (triggersError) throw triggersError;

    if (!triggers || triggers.length === 0) {
      logStep("No matching triggers found");
      return new Response(JSON.stringify({
        success: true,
        message: 'No triggers matched',
        triggered: 0,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    logStep("Found matching triggers", { count: triggers.length });

    let triggeredCount = 0;
    const results = [];

    // Process each trigger
    for (const trigger of triggers) {
      const startTime = Date.now();

      try {
        // Create execution record
        const { data: execution, error: executionError } = await supabaseClient
          .from('behavioral_trigger_executions')
          .insert({
            rule_id: trigger.rule_id,
            user_id: userId,
            triggered_by: 'event',
            trigger_event_data: eventData,
            status: 'processing',
          })
          .select()
          .single();

        if (executionError) throw executionError;

        // Execute the action based on action_type
        let actionResult;
        let actionSuccess = false;

        switch (trigger.action_type) {
          case 'email':
            actionResult = await executeEmailAction(supabaseClient, userId, trigger.action_config);
            actionSuccess = actionResult.success;
            break;

          case 'modal':
            actionResult = await executeModalAction(supabaseClient, userId, trigger.action_config);
            actionSuccess = actionResult.success;
            break;

          case 'notification':
            actionResult = await executeNotificationAction(supabaseClient, userId, trigger.action_config);
            actionSuccess = actionResult.success;
            break;

          case 'webhook':
            actionResult = await executeWebhookAction(trigger.action_config, { userId, eventName, eventData });
            actionSuccess = actionResult.success;
            break;

          case 'function':
            actionResult = await executeFunctionAction(supabaseClient, trigger.action_config, { userId, eventName, eventData });
            actionSuccess = actionResult.success;
            break;

          default:
            throw new Error(`Unsupported action type: ${trigger.action_type}`);
        }

        const executionTime = Date.now() - startTime;

        // Update execution status
        await supabaseClient
          .from('behavioral_trigger_executions')
          .update({
            status: actionSuccess ? 'completed' : 'failed',
            result: actionResult,
            processed_at: new Date().toISOString(),
            execution_time_ms: executionTime,
          })
          .eq('id', execution.id);

        // Add to user trigger history
        await supabaseClient
          .from('user_trigger_history')
          .insert({
            user_id: userId,
            rule_id: trigger.rule_id,
            execution_id: execution.id,
            triggered_at: new Date().toISOString(),
          });

        if (actionSuccess) {
          triggeredCount++;
          results.push({
            rule: trigger.rule_name,
            action: trigger.action_type,
            status: 'success',
          });
          logStep("Trigger executed successfully", {
            rule: trigger.rule_name,
            executionTime: `${executionTime}ms`,
          });
        } else {
          results.push({
            rule: trigger.rule_name,
            action: trigger.action_type,
            status: 'failed',
            error: actionResult.error,
          });
          logStep("Trigger execution failed", {
            rule: trigger.rule_name,
            error: actionResult.error,
          });
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logStep("Trigger execution error", { rule: trigger.rule_name, error: errorMessage });

        results.push({
          rule: trigger.rule_name,
          action: trigger.action_type,
          status: 'error',
          error: errorMessage,
        });
      }
    }

    logStep("Trigger processing complete", { triggered: triggeredCount, total: triggers.length });

    return new Response(JSON.stringify({
      success: true,
      triggered: triggeredCount,
      results,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in trigger processor", { message: errorMessage });

    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

/**
 * Execute email action
 */
async function executeEmailAction(
  supabaseClient: any,
  userId: string,
  config: any
): Promise<{ success: boolean; error?: string }> {
  try {
    const { campaign_id, template, subject } = config;

    // Get user details
    const { data: user } = await supabaseClient
      .from('user_profiles')
      .select('email, first_name, last_name')
      .eq('id', userId)
      .single();

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Add email to queue (if using email queue system)
    const { data: campaign } = await supabaseClient
      .from('email_campaigns')
      .select('id')
      .eq('campaign_name', campaign_id)
      .single();

    if (campaign) {
      await supabaseClient
        .from('email_queue')
        .insert({
          campaign_id: campaign.id,
          user_id: userId,
          recipient_email: user.email,
          scheduled_for: new Date().toISOString(),
          priority: 3,
          status: 'pending',
        });
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Execute modal action
 */
async function executeModalAction(
  supabaseClient: any,
  userId: string,
  config: any
): Promise<{ success: boolean; error?: string }> {
  try {
    // Store modal config in user_events or a dedicated modal_queue table
    // The frontend will poll for pending modals to display
    await supabaseClient
      .from('user_events')
      .insert({
        user_id: userId,
        event_name: 'modal_triggered',
        event_category: 'engagement',
        event_properties: config,
      });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Execute notification action
 */
async function executeNotificationAction(
  supabaseClient: any,
  userId: string,
  config: any
): Promise<{ success: boolean; error?: string }> {
  try {
    const { title, message, action_url } = config;

    // Insert notification (assuming you have a notifications table)
    // If not, you can create user_events with notification type
    await supabaseClient
      .from('user_events')
      .insert({
        user_id: userId,
        event_name: 'notification_sent',
        event_category: 'engagement',
        event_properties: {
          title,
          message,
          action_url,
          read: false,
          created_at: new Date().toISOString(),
        },
      });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Execute webhook action
 */
async function executeWebhookAction(
  config: any,
  data: any
): Promise<{ success: boolean; error?: string }> {
  try {
    const { url, method = 'POST', headers = {} } = config;

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.statusText}`);
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Execute custom function action
 */
async function executeFunctionAction(
  supabaseClient: any,
  config: any,
  data: any
): Promise<{ success: boolean; error?: string }> {
  try {
    const { function_name, parameters = {} } = config;

    // Call Supabase Edge Function
    const { data: result, error } = await supabaseClient.functions.invoke(
      function_name,
      {
        body: { ...data, ...parameters },
      }
    );

    if (error) throw error;

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
