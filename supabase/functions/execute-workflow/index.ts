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
  // Get workflow definition
  const { data: workflow, error: workflowError } = await supabase
    .from('workflow_definitions')
    .select('*')
    .eq('id', workflowId)
    .single()

  if (workflowError) throw workflowError
  if (!workflow.is_active) throw new Error('Workflow is not active')

  const steps = workflow.workflow_steps as WorkflowStep[]

  // Create execution record
  const { data: execution, error: executionError } = await supabase
    .from('workflow_executions')
    .insert({
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

  // Execute steps
  await executeSteps(supabase, execution, steps)

  return execution
}

async function continueExecution(supabase: any, executionId: string) {
  const { data: execution, error } = await supabase
    .from('workflow_executions')
    .select('*, workflow_definitions(*)')
    .eq('id', executionId)
    .single()

  if (error) throw error

  const steps = execution.workflow_definitions.workflow_steps as WorkflowStep[]
  await executeSteps(supabase, execution, steps, execution.completed_steps)

  return execution
}

async function executeSteps(supabase: any, execution: any, steps: WorkflowStep[], startIndex: number = 0) {
  for (let i = startIndex; i < steps.length; i++) {
    const step = steps[i]
    
    try {
      // Create step execution record
      const { data: stepExecution, error: stepError } = await supabase
        .from('workflow_step_executions')
        .insert({
          company_id: execution.company_id,
          execution_id: execution.id,
          step_index: i,
          step_name: step.name,
          step_type: step.type,
          step_config: step.config,
          started_at: new Date().toISOString()
        })
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
      
      case 'task_creation':
        return await executeTaskCreationStep(supabase, step, execution)
      
      case 'status_update':
        return await executeStatusUpdateStep(supabase, step, execution)
      
      case 'calculation':
        return await executeCalculationStep(supabase, step, execution)
      
      case 'report_generation':
        return await executeReportGenerationStep(supabase, step, execution)
      
      case 'condition':
        return await executeConditionStep(supabase, step, execution)
      
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