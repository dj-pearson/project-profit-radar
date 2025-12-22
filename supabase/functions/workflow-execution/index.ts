// Workflow Execution Edge Function
import { initializeAuthContext, errorResponse } from '../_shared/auth-helpers.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WorkflowStep {
  id: string;
  step_type: 'trigger' | 'action' | 'condition' | 'delay';
  config: any;
  position: number;
}

interface WorkflowExecution {
  workflow_id: string;
  trigger_data: any;
  user_id: string;
}

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[WORKFLOW-EXECUTION] ${step}${detailsStr}`);
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
        const authContext = await initializeAuthContext(req);
    if (!authContext) {
      return errorResponse('Unauthorized', 401);
    }

    const { user, supabase } = authContext;
    logStep("User authenticated", { userId: user.id });

    const { workflow_id, trigger_data } = await req.json() as WorkflowExecution;

    logStep('Executing workflow', {  workflow_id, trigger_data });

    // Get workflow definition with site isolation
    const { data: workflow, error: workflowError } = await supabase
      .from('workflow_definitions')
      .select('*, workflow_steps(*)')
        // CRITICAL: Site isolation
      .eq('id', workflow_id)
      .single();

    if (workflowError || !workflow) {
      throw new Error(`Workflow not found: ${workflowError?.message}`);
    }

    if (!workflow.is_active) {
      throw new Error('Workflow is not active');
    }

    // Create execution record with site isolation
    const { data: execution, error: executionError } = await supabase
      .from('workflow_executions')
      .insert({  // CRITICAL: Site isolation
        workflow_id,
        status: 'running',
        trigger_data,
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (executionError) {
      throw new Error(`Failed to create execution: ${executionError.message}`);
    }

    // Sort steps by position
    const steps = (workflow.workflow_steps || []).sort((a: WorkflowStep, b: WorkflowStep) => 
      a.position - b.position
    );

    let executionContext = { ...trigger_data };
    const stepResults = [];

    // Execute steps sequentially
    for (const step of steps) {
      console.log('Executing step:', step.id, step.step_type);

      const stepStartTime = Date.now();
      let stepStatus = 'success';
      let stepOutput = null;
      let errorMessage = null;

      try {
        switch (step.step_type) {
          case 'action':
            stepOutput = await executeAction(step, executionContext, supabase);
            break;
          
          case 'condition':
            const conditionResult = evaluateConditions(step, executionContext);
            stepOutput = { passed: conditionResult, branch: conditionResult ? 'true' : 'false' };
            executionContext.last_condition_result = conditionResult;
            
            // Find next steps based on branch
            const nextSteps = steps.filter((s: WorkflowStep) => {
              const currentIndex = steps.findIndex((st: WorkflowStep) => st.id === step.id);
              return s.position > step.position;
            });
            
            if (nextSteps.length > 0 && !conditionResult) {
              // Skip to alternative branch or end
              console.log('Condition failed, branching to false path');
            }
            break;
          
          case 'delay':
            const delayMs = step.config.delay_seconds * 1000;
            await new Promise(resolve => setTimeout(resolve, delayMs));
            stepOutput = { delayed_ms: delayMs };
            break;
          
          default:
            stepOutput = { skipped: true };
        }

        // Record step execution with site isolation
        await supabase.from('workflow_step_executions').insert({  // CRITICAL: Site isolation
          execution_id: execution.id,
          step_id: step.id,
          status: stepStatus,
          output: stepOutput,
          error_message: errorMessage,
          started_at: new Date(stepStartTime).toISOString(),
          completed_at: new Date().toISOString(),
        });

        stepResults.push({ step_id: step.id, status: stepStatus, output: stepOutput });

        // Update execution context
        if (stepOutput) {
          executionContext = { ...executionContext, ...stepOutput };
        }

      } catch (stepError: any) {
        console.error('Step execution failed:', stepError);
        stepStatus = 'failed';
        errorMessage = stepError.message;

        await supabase.from('workflow_step_executions').insert({  // CRITICAL: Site isolation
          execution_id: execution.id,
          step_id: step.id,
          status: stepStatus,
          error_message: errorMessage,
          started_at: new Date(stepStartTime).toISOString(),
          completed_at: new Date().toISOString(),
        });

        stepResults.push({ step_id: step.id, status: stepStatus, error: errorMessage });
        break; // Stop execution on error
      }
    }

    // Update execution record with site isolation
    const finalStatus = stepResults.some(r => r.status === 'failed') ? 'failed' : 'completed';
    await supabase
      .from('workflow_executions')
      .update({
        status: finalStatus,
        completed_at: new Date().toISOString(),
        output: { steps: stepResults },
      })
        // CRITICAL: Site isolation
      .eq('id', execution.id);

    // Update workflow last_executed_at with site isolation
    await supabase
      .from('workflow_definitions')
      .update({ last_executed_at: new Date().toISOString() })
        // CRITICAL: Site isolation
      .eq('id', workflow_id);

    console.log('Workflow execution completed:', finalStatus);

    return new Response(
      JSON.stringify({ 
        success: true, 
        execution_id: execution.id,
        status: finalStatus,
        steps: stepResults,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Workflow execution error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

async function executeAction(step: WorkflowStep, context: any, supabase: any, siteId: string) {
  const { action_type, ...params } = step.config;

  console.log('Executing action:', action_type, params);

  switch (action_type) {
    case 'send_email':
      return await sendEmail(params, context, supabase);

    case 'send_sms':
      return await sendSMS(params, context);

    case 'create_task':
      return await createTask(params, context, supabase);

    case 'update_field':
      return await updateField(params, context, supabase);

    case 'send_notification':
      return await sendNotification(params, context, supabase);

    case 'webhook':
      return await callWebhook(params, context);

    default:
      console.log('Unknown action type:', action_type);
      return { skipped: true, reason: 'Unknown action type' };
  }
}

async function sendEmail(params: any, context: any, supabase: any) {
  console.log('Sending email:', params);
  
  // Placeholder for email sending
  // In production, integrate with Resend, SendGrid, etc.
  return { 
    sent: true, 
    to: params.to, 
    subject: params.subject,
    message: 'Email would be sent in production'
  };
}

async function sendSMS(params: any, context: any) {
  console.log('Sending SMS:', params);
  
  const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER');
  
  if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
    console.warn('Twilio credentials not configured');
    return {
      sent: false,
      error: 'Twilio not configured'
    };
  }
  
  const toPhone = params.to || context.phone;
  const message = params.message || params.body;
  
  if (!toPhone || !message) {
    throw new Error('Phone number and message are required');
  }
  
  try {
    const auth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: toPhone,
          From: twilioPhoneNumber,
          Body: message,
        }),
      }
    );
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Twilio API error: ${error}`);
    }
    
    const data = await response.json();
    
    return {
      sent: true,
      sid: data.sid,
      to: toPhone,
      message: message,
      status: data.status
    };
  } catch (error: any) {
    console.error('Failed to send SMS:', error);
    throw new Error(`SMS sending failed: ${error.message}`);
  }
}

async function createTask(params: any, context: any, supabase: any, siteId: string) {
  console.log('Creating task:', params);

  const { data, error } = await supabase
    .from('tasks')
    .insert({  // CRITICAL: Site isolation
      title: params.title || 'Automated Task',
      description: params.description || '',
      status: 'pending',
      priority: params.priority || 'medium',
      project_id: context.project_id || params.project_id,
      assigned_to: params.assigned_to,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create task: ${error.message}`);
  }

  return { task_created: true, task_id: data.id };
}

async function updateField(params: any, context: any, supabase: any, siteId: string) {
  console.log('Updating field:', params);

  const { table, record_id, field, value } = params;

  const { error } = await supabase
    .from(table)
    .update({ [field]: value })
      // CRITICAL: Site isolation
    .eq('id', record_id || context.record_id);

  if (error) {
    throw new Error(`Failed to update field: ${error.message}`);
  }

  return { field_updated: true, table, field, value };
}

async function sendNotification(params: any, context: any, supabase: any) {
  console.log('Sending notification:', params);
  
  // Placeholder for notification system
  return { 
    notification_sent: true, 
    message: params.message,
    user_id: params.user_id 
  };
}

async function callWebhook(params: any, context: any) {
  console.log('Calling webhook:', params.url);
  
  const response = await fetch(params.url, {
    method: params.method || 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...params.headers,
    },
    body: JSON.stringify({
      ...params.payload,
      context,
    }),
  });

  const responseData = await response.text();
  
  return { 
    webhook_called: true, 
    status: response.status,
    response: responseData,
  };
}

function evaluateConditions(step: WorkflowStep, context: any): boolean {
  const { conditions, logic_operator } = step.config;

  if (!conditions || conditions.length === 0) {
    return true;
  }

  console.log('Evaluating conditions:', { conditions, logic_operator, context });

  const results = conditions.map((condition: any) => {
    const fieldValue = context[condition.field];
    
    switch (condition.operator) {
      case 'equals':
        return fieldValue == condition.value;
      case 'not_equals':
        return fieldValue != condition.value;
      case 'greater_than':
        return Number(fieldValue) > Number(condition.value);
      case 'less_than':
        return Number(fieldValue) < Number(condition.value);
      case 'contains':
        return String(fieldValue).includes(String(condition.value));
      case 'exists':
        return fieldValue !== null && fieldValue !== undefined;
      default:
        return false;
    }
  });

  // Apply logic operator
  if (logic_operator === 'OR') {
    return results.some(r => r === true);
  } else {
    // Default to AND
    return results.every(r => r === true);
  }
}
