// Execute Workflow Edge Function
// Updated with multi-tenant site_id isolation
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WorkflowStep {
  name: string
  type: string
  config: Record<string, any>
}

interface WorkflowExecution {
  id: string
  workflow_id: string
  company_id: string
  status: string
  trigger_data: Record<string, any>
  execution_log: any[]
  started_at: string
  total_steps: number
  completed_steps: number
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { workflowId, triggerData = {}, executionId } = await req.json()

    if (executionId) {
      // Continue existing execution
      const execution = await continueExecution(supabase, executionId)
      return new Response(JSON.stringify(execution), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    } else {
      // Start new execution
      const execution = await startExecution(supabase, workflowId, triggerData)
      return new Response(JSON.stringify(execution), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
  } catch (error) {
    console.error('Error in execute-workflow:', error)
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

async function startExecution(supabase: any, workflowId: string, triggerData: Record<string, any>) {
  // Get workflow definition with site_id
  const { data: workflow, error: workflowError } = await supabase
    .from('workflow_definitions')
    .select('*, site_id')  // Include site_id
    .eq('id', workflowId)
    .single()

  if (workflowError) throw workflowError
  if (!workflow.is_active) throw new Error('Workflow is not active')

  const steps = workflow.workflow_steps as WorkflowStep[]
  const siteId = workflow.site_id

  console.log('[EXECUTE-WORKFLOW] Starting execution', { workflowId, siteId, companyId: workflow.company_id })

  // Create execution record with site isolation
  const { data: execution, error: executionError } = await supabase
    .from('workflow_executions')
    .insert({
      site_id: siteId,  // CRITICAL: Site isolation
      company_id: workflow.company_id,
      workflow_id: workflowId,
      trigger_data: triggerData,
      total_steps: steps.length,
      execution_log: [{
        timestamp: new Date().toISOString(),
        message: 'Workflow execution started',
        step: 'initialization'
      }]
    })
    .select()
    .single()

  if (executionError) throw executionError

  // Execute steps (pass siteId)
  await executeSteps(supabase, execution, steps, 0, siteId)

  return execution
}

async function continueExecution(supabase: any, executionId: string) {
  const { data: execution, error } = await supabase
    .from('workflow_executions')
    .select('*, site_id, workflow_definitions(*)')
    .eq('id', executionId)
    .single()

  if (error) throw error

  const steps = execution.workflow_definitions.workflow_steps as WorkflowStep[]
  const siteId = execution.site_id

  console.log('[EXECUTE-WORKFLOW] Continuing execution', { executionId, siteId })

  await executeSteps(supabase, execution, steps, execution.completed_steps, siteId)

  return execution
}

async function executeSteps(supabase: any, execution: any, steps: WorkflowStep[], startIndex: number = 0, siteId?: string) {
  for (let i = startIndex; i < steps.length; i++) {
    const step = steps[i]

    try {
      // Create step execution record with site isolation
      const stepInsertData: any = {
        company_id: execution.company_id,
        execution_id: execution.id,
        step_index: i,
        step_name: step.name,
        step_type: step.type,
        step_config: step.config,
        started_at: new Date().toISOString()
      }

      if (siteId) {
        stepInsertData.site_id = siteId  // CRITICAL: Site isolation
      }

      const { data: stepExecution, error: stepError } = await supabase
        .from('workflow_step_executions')
        .insert(stepInsertData)
        .select()
        .single()

      if (stepError) throw stepError

      // Execute the step
      const result = await executeStep(supabase, step, execution, stepExecution)

      // Update step execution
      await supabase
        .from('workflow_step_executions')
        .update({
          status: result.success ? 'completed' : 'failed',
          output_data: result.output,
          error_message: result.success ? null : (result as any).error,
          completed_at: new Date().toISOString()
        })
        .eq('id', stepExecution.id)

      if (!result.success) {
        // Mark execution as failed
        await supabase
          .from('workflow_executions')
          .update({
            status: 'failed',
            error_message: result.success ? null : (result as any).error,
            completed_at: new Date().toISOString(),
            execution_log: [
              ...execution.execution_log,
              {
                timestamp: new Date().toISOString(),
                message: `Step ${i + 1} failed: ${result.success ? 'Unknown error' : (result as any).error}`,
                step: step.name,
                level: 'error'
              }
            ]
          })
          .eq('id', execution.id)
        
        throw new Error(result.success ? 'Unknown error' : ((result as { error?: string }).error || 'Unknown error'));
      }

      // Update execution progress
      await supabase
        .from('workflow_executions')
        .update({
          completed_steps: i + 1,
          execution_log: [
            ...execution.execution_log,
            {
              timestamp: new Date().toISOString(),
              message: `Step ${i + 1} completed: ${step.name}`,
              step: step.name,
              level: 'info',
              output: result.output
            }
          ]
        })
        .eq('id', execution.id)

      execution.completed_steps = i + 1
      execution.execution_log.push({
        timestamp: new Date().toISOString(),
        message: `Step ${i + 1} completed: ${step.name}`,
        step: step.name,
        level: 'info'
      })

    } catch (error) {
      console.error(`Error executing step ${i}:`, error)
      
        await supabase
          .from('workflow_executions')
          .update({
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error',
            completed_at: new Date().toISOString()
          })
          .eq('id', execution.id)
      
      throw error
    }
  }

  // Mark execution as completed
  await supabase
    .from('workflow_executions')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      execution_log: [
        ...execution.execution_log,
        {
          timestamp: new Date().toISOString(),
          message: 'Workflow execution completed successfully',
          step: 'completion',
          level: 'success'
        }
      ]
    })
    .eq('id', execution.id)
}

async function executeStep(supabase: any, step: WorkflowStep, execution: any, stepExecution: any) {
  try {
    switch (step.type) {
      case 'notification':
        return await executeNotificationStep(supabase, step, execution)

      case 'send_email':
        return await executeEmailStep(supabase, step, execution)

      case 'send_sms':
        return await executeSMSStep(supabase, step, execution)

      case 'task_creation':
        return await executeTaskCreationStep(supabase, step, execution)

      case 'status_update':
        return await executeStatusUpdateStep(supabase, step, execution)

      case 'field_update':
        return await executeFieldUpdateStep(supabase, step, execution)

      case 'calculation':
        return await executeCalculationStep(supabase, step, execution)

      case 'report_generation':
        return await executeReportGenerationStep(supabase, step, execution)

      case 'condition':
        return await executeConditionStep(supabase, step, execution)

      case 'webhook':
        return await executeWebhookStep(supabase, step, execution)

      case 'create_activity':
        return await executeCreateActivityStep(supabase, step, execution)

      case 'enroll_campaign':
        return await executeEnrollCampaignStep(supabase, step, execution)

      case 'delay':
        return await executeDelayStep(supabase, step, execution)

      default:
        return {
          success: false,
          error: `Unknown step type: ${step.type}`,
          output: null
        }
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      output: null
    }
  }
}

async function executeNotificationStep(supabase: any, step: WorkflowStep, execution: any) {
  const { method, recipients, template, message } = step.config
  
  // Mock notification - in real implementation, integrate with email/SMS services
  console.log(`Sending ${method} notification to ${recipients}:`, message || template)
  
  return {
    success: true,
    output: {
      method,
      recipients,
      message: message || `Notification sent via ${template} template`,
      sent_at: new Date().toISOString()
    }
  }
}

async function executeTaskCreationStep(supabase: any, step: WorkflowStep, execution: any) {
  const { task_type, assign_to, priority, title, description } = step.config
  
  // Create a task record (assuming tasks table exists)
  const taskData = {
    company_id: execution.company_id,
    title: title || `Automated Task: ${task_type}`,
    description: description || `Task created by workflow automation`,
    priority: priority || 'medium',
    status: 'pending',
    created_by: null, // System created
    workflow_execution_id: execution.id
  }
  
  console.log('Creating task:', taskData)
  
  return {
    success: true,
    output: {
      task_created: true,
      task_type,
      priority,
      assigned_to: assign_to
    }
  }
}

async function executeStatusUpdateStep(supabase: any, step: WorkflowStep, execution: any) {
  const { resource_type, resource_id, new_status } = step.config
  
  console.log(`Updating ${resource_type} ${resource_id} status to ${new_status}`)
  
  return {
    success: true,
    output: {
      resource_type,
      resource_id,
      old_status: 'unknown',
      new_status,
      updated_at: new Date().toISOString()
    }
  }
}

async function executeCalculationStep(supabase: any, step: WorkflowStep, execution: any) {
  const { calculate, include_projections } = step.config
  
  let result = {}
  
  switch (calculate) {
    case 'budget_variance':
      // Mock budget calculation
      result = {
        budget_variance: 15.5,
        variance_percentage: 12.3,
        projected_overrun: 25000,
        include_projections
      }
      break
    
    default:
      result = { calculation_type: calculate, value: 0 }
  }
  
  return {
    success: true,
    output: result
  }
}

async function executeReportGenerationStep(supabase: any, step: WorkflowStep, execution: any) {
  const { report_type, include_metrics } = step.config
  
  // Mock report generation
  const report = {
    report_type,
    generated_at: new Date().toISOString(),
    include_metrics,
    summary: `${report_type} report generated successfully`,
    metrics_included: include_metrics ? ['completion', 'budget', 'timeline'] : []
  }
  
  return {
    success: true,
    output: report
  }
}

async function executeConditionStep(supabase: any, step: WorkflowStep, execution: any) {
  const { condition, if_true_action, if_false_action } = step.config

  // Mock condition evaluation - in real implementation, evaluate actual conditions
  const conditionMet = Math.random() > 0.5 // Random for demo
  const action = conditionMet ? if_true_action : if_false_action

  return {
    success: true,
    output: {
      condition_evaluated: condition,
      condition_met: conditionMet,
      action_taken: action,
      evaluated_at: new Date().toISOString()
    }
  }
}

// ============================================================================
// EMAIL AUTOMATION STEP FUNCTIONS
// ============================================================================

async function executeEmailStep(supabase: any, step: WorkflowStep, execution: any) {
  const {
    to,
    subject,
    template_id,
    html_content,
    text_content,
    from_email,
    from_name,
    reply_to,
    delay_minutes,
    variables
  } = step.config

  const siteId = execution.site_id
  const companyId = execution.company_id
  const triggerData = execution.trigger_data || {}

  // Resolve recipient email
  let recipientEmail = to
  if (to === '{{trigger.email}}' || to === '{{entity.email}}') {
    recipientEmail = triggerData.email || triggerData.entity?.email
  }

  if (!recipientEmail) {
    return {
      success: false,
      error: 'No recipient email specified or found in trigger data',
      output: null
    }
  }

  // Get template if specified
  let emailHtml = html_content || ''
  let emailSubject = subject
  let emailText = text_content

  if (template_id) {
    const { data: template } = await supabase
      .from('email_templates')
      .select('*')
      .eq('id', template_id)
      .eq('site_id', siteId)
      .single()

    if (template) {
      emailHtml = template.content || emailHtml
      emailSubject = template.subject || emailSubject
    }
  }

  // Prepare variables for substitution
  const allVariables = {
    ...variables,
    ...triggerData,
    ...(triggerData.entity || {}),
    current_date: new Date().toLocaleDateString(),
    current_year: new Date().getFullYear(),
    company_id: companyId,
    site_id: siteId,
  }

  // Substitute variables in content
  emailHtml = substituteVariables(emailHtml, allVariables)
  emailSubject = substituteVariables(emailSubject, allVariables)
  if (emailText) {
    emailText = substituteVariables(emailText, allVariables)
  }

  // Calculate scheduled time
  const scheduledFor = delay_minutes
    ? new Date(Date.now() + delay_minutes * 60 * 1000).toISOString()
    : new Date().toISOString()

  // Queue the email
  const { data: queuedEmail, error: queueError } = await supabase
    .from('email_queue')
    .insert({
      site_id: siteId,
      company_id: companyId,
      recipient_email: recipientEmail,
      subject: emailSubject,
      html_content: emailHtml,
      text_content: emailText,
      from_email: from_email || 'noreply@build-desk.com',
      from_name: from_name || 'BuildDesk',
      reply_to: reply_to,
      scheduled_for: scheduledFor,
      status: 'pending',
      priority: 1,
      queue_metadata: {
        workflow_id: execution.workflow_id,
        execution_id: execution.id,
        step_name: step.name,
      }
    })
    .select()
    .single()

  if (queueError) {
    return {
      success: false,
      error: `Failed to queue email: ${queueError.message}`,
      output: null
    }
  }

  console.log(`[WORKFLOW] Email queued: ${queuedEmail.id} to ${recipientEmail}`)

  return {
    success: true,
    output: {
      email_queued: true,
      queue_id: queuedEmail.id,
      recipient: recipientEmail,
      subject: emailSubject,
      scheduled_for: scheduledFor
    }
  }
}

async function executeSMSStep(supabase: any, step: WorkflowStep, execution: any) {
  const { to, message, variables } = step.config
  const triggerData = execution.trigger_data || {}

  // Resolve recipient phone
  let recipientPhone = to
  if (to === '{{trigger.phone}}' || to === '{{entity.phone}}') {
    recipientPhone = triggerData.phone || triggerData.entity?.phone
  }

  if (!recipientPhone) {
    return {
      success: false,
      error: 'No recipient phone specified or found in trigger data',
      output: null
    }
  }

  // Substitute variables
  const allVariables = { ...variables, ...triggerData, ...(triggerData.entity || {}) }
  const smsMessage = substituteVariables(message, allVariables)

  // TODO: Integrate with SMS provider (Twilio, etc.)
  console.log(`[WORKFLOW] Would send SMS to ${recipientPhone}: ${smsMessage}`)

  return {
    success: true,
    output: {
      sms_sent: true,
      recipient: recipientPhone,
      message: smsMessage,
      sent_at: new Date().toISOString()
    }
  }
}

async function executeFieldUpdateStep(supabase: any, step: WorkflowStep, execution: any) {
  const { table, record_id, field, value, use_trigger_id } = step.config
  const siteId = execution.site_id
  const companyId = execution.company_id
  const triggerData = execution.trigger_data || {}

  // Resolve record ID
  const targetId = use_trigger_id ? triggerData.entity_id || triggerData.id : record_id

  if (!targetId) {
    return {
      success: false,
      error: 'No record ID specified',
      output: null
    }
  }

  // Update the field
  const { data, error } = await supabase
    .from(table)
    .update({ [field]: value, updated_at: new Date().toISOString() })
    .eq('id', targetId)
    .eq('site_id', siteId)
    .select()
    .single()

  if (error) {
    return {
      success: false,
      error: `Failed to update field: ${error.message}`,
      output: null
    }
  }

  console.log(`[WORKFLOW] Updated ${table}.${field} = ${value} for record ${targetId}`)

  return {
    success: true,
    output: {
      updated: true,
      table,
      record_id: targetId,
      field,
      new_value: value,
      updated_at: new Date().toISOString()
    }
  }
}

async function executeWebhookStep(supabase: any, step: WorkflowStep, execution: any) {
  const { url, method, headers, body, include_trigger_data } = step.config
  const triggerData = execution.trigger_data || {}

  // Prepare request body
  let requestBody = body || {}
  if (include_trigger_data) {
    requestBody = {
      ...requestBody,
      trigger_data: triggerData,
      execution_id: execution.id,
      workflow_id: execution.workflow_id,
      company_id: execution.company_id,
      timestamp: new Date().toISOString()
    }
  }

  try {
    const response = await fetch(url, {
      method: method || 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: JSON.stringify(requestBody)
    })

    const responseData = await response.text()

    if (!response.ok) {
      return {
        success: false,
        error: `Webhook failed with status ${response.status}: ${responseData}`,
        output: { status: response.status, response: responseData }
      }
    }

    console.log(`[WORKFLOW] Webhook sent to ${url}, status: ${response.status}`)

    return {
      success: true,
      output: {
        webhook_sent: true,
        url,
        method: method || 'POST',
        status: response.status,
        response: responseData,
        sent_at: new Date().toISOString()
      }
    }
  } catch (error) {
    return {
      success: false,
      error: `Webhook request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      output: null
    }
  }
}

async function executeCreateActivityStep(supabase: any, step: WorkflowStep, execution: any) {
  const { activity_type, description, lead_id, opportunity_id, outcome, duration_minutes } = step.config
  const siteId = execution.site_id
  const companyId = execution.company_id
  const triggerData = execution.trigger_data || {}

  // Resolve entity IDs from trigger data if not specified
  const resolvedLeadId = lead_id === '{{trigger.id}}' ? triggerData.entity_id : lead_id
  const resolvedOppId = opportunity_id === '{{trigger.id}}' ? triggerData.entity_id : opportunity_id

  // Substitute variables in description
  const allVariables = { ...triggerData, ...(triggerData.entity || {}) }
  const activityDescription = substituteVariables(description, allVariables)

  const { data: activity, error } = await supabase
    .from('crm_activities')
    .insert({
      site_id: siteId,
      company_id: companyId,
      activity_type: activity_type || 'workflow',
      description: activityDescription,
      lead_id: resolvedLeadId || null,
      opportunity_id: resolvedOppId || null,
      outcome: outcome || 'automated',
      duration_minutes: duration_minutes || null,
      activity_date: new Date().toISOString(),
      created_by: null // System created
    })
    .select()
    .single()

  if (error) {
    return {
      success: false,
      error: `Failed to create activity: ${error.message}`,
      output: null
    }
  }

  console.log(`[WORKFLOW] Activity created: ${activity.id}`)

  return {
    success: true,
    output: {
      activity_created: true,
      activity_id: activity.id,
      activity_type,
      description: activityDescription
    }
  }
}

async function executeEnrollCampaignStep(supabase: any, step: WorkflowStep, execution: any) {
  const { campaign_id, entity_type, use_trigger_entity } = step.config
  const siteId = execution.site_id
  const companyId = execution.company_id
  const triggerData = execution.trigger_data || {}

  // Get entity ID
  const entityId = use_trigger_entity ? (triggerData.entity_id || triggerData.id) : step.config.entity_id

  if (!entityId) {
    return {
      success: false,
      error: 'No entity ID specified for campaign enrollment',
      output: null
    }
  }

  // Get entity data for email
  const tableName = entity_type === 'lead' ? 'leads' : entity_type === 'contact' ? 'contacts' : entity_type
  const { data: entity } = await supabase
    .from(tableName)
    .select('*')
    .eq('id', entityId)
    .eq('site_id', siteId)
    .single()

  if (!entity || !entity.email) {
    return {
      success: false,
      error: 'Entity not found or has no email',
      output: null
    }
  }

  // Check if already enrolled
  const { data: existing } = await supabase
    .from('campaign_enrollments')
    .select('id')
    .eq('campaign_id', campaign_id)
    .eq('entity_id', entityId)
    .eq('site_id', siteId)
    .single()

  if (existing) {
    return {
      success: true,
      output: {
        enrolled: false,
        reason: 'already_enrolled',
        enrollment_id: existing.id
      }
    }
  }

  // Create enrollment
  const { data: enrollment, error } = await supabase
    .from('campaign_enrollments')
    .insert({
      site_id: siteId,
      company_id: companyId,
      campaign_id,
      entity_type,
      entity_id: entityId,
      recipient_email: entity.email,
      status: 'active',
      current_step: 0,
      enrolled_at: new Date().toISOString()
    })
    .select()
    .single()

  if (error) {
    return {
      success: false,
      error: `Failed to enroll in campaign: ${error.message}`,
      output: null
    }
  }

  console.log(`[WORKFLOW] Enrolled entity ${entityId} in campaign ${campaign_id}`)

  return {
    success: true,
    output: {
      enrolled: true,
      enrollment_id: enrollment.id,
      campaign_id,
      entity_id: entityId,
      entity_type
    }
  }
}

async function executeDelayStep(supabase: any, step: WorkflowStep, execution: any) {
  const { delay_minutes, delay_until } = step.config

  // For now, delays are handled by scheduling - mark as completed
  // In a production system, you'd pause execution and resume later

  const delayUntil = delay_until
    ? new Date(delay_until)
    : new Date(Date.now() + (delay_minutes || 0) * 60 * 1000)

  console.log(`[WORKFLOW] Delay step: would wait until ${delayUntil.toISOString()}`)

  return {
    success: true,
    output: {
      delayed: true,
      delay_minutes,
      delay_until: delayUntil.toISOString(),
      note: 'Delay step completed - in production, execution would pause and resume'
    }
  }
}

// Helper function to substitute variables in templates
function substituteVariables(template: string, variables: Record<string, any>): string {
  let result = template

  // Replace {{variable}} patterns
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'gi')
    result = result.replace(regex, String(value ?? ''))
  }

  // Replace ${variable} patterns
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\$\\{\\s*${key}\\s*\\}`, 'gi')
    result = result.replace(regex, String(value ?? ''))
  }

  // Replace nested patterns like {{entity.field}}
  const nestedPattern = /\{\{\s*(\w+)\.(\w+)\s*\}\}/g
  result = result.replace(nestedPattern, (match, obj, field) => {
    if (variables[obj] && typeof variables[obj] === 'object') {
      return String(variables[obj][field] ?? '')
    }
    return ''
  })

  return result
}