import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface WorkflowTriggerData {
  record_id?: string;
  record_type?: string;
  old_value?: any;
  new_value?: any;
  user_id?: string;
  project_id?: string;
  [key: string]: any;
}

class WorkflowExecutionService {
  /**
   * Execute a workflow manually
   */
  async executeWorkflow(workflowId: string, triggerData: WorkflowTriggerData) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      console.log('Triggering workflow execution:', { workflowId, triggerData });

      const { data, error } = await supabase.functions.invoke('workflow-execution', {
        body: {
          workflow_id: workflowId,
          trigger_data: triggerData,
          user_id: user.id,
        },
      });

      if (error) {
        throw error;
      }

      toast.success('Workflow executed successfully');
      return data;
    } catch (error: any) {
      console.error('Failed to execute workflow:', error);
      toast.error(`Workflow execution failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get execution history for a workflow
   */
  async getExecutionHistory(workflowId: string, limit = 50) {
    try {
      const { data, error } = await supabase
        .from('workflow_executions')
        .select('*, workflow_step_executions(*)')
        .eq('workflow_id', workflowId)
        .order('started_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      return data;
    } catch (error: any) {
      console.error('Failed to fetch execution history:', error);
      toast.error('Failed to load execution history');
      return [];
    }
  }

  /**
   * Get recent executions across all workflows
   */
  async getRecentExecutions(limit = 100) {
    try {
      const { data, error } = await supabase
        .from('workflow_executions')
        .select('*, workflow_definitions(name)')
        .order('started_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      return data;
    } catch (error: any) {
      console.error('Failed to fetch recent executions:', error);
      toast.error('Failed to load recent executions');
      return [];
    }
  }

  /**
   * Trigger workflows based on an event
   */
  async triggerWorkflowsByEvent(
    triggerType: string,
    triggerData: WorkflowTriggerData
  ) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return;
      }

      // Find active workflows with matching trigger
      const { data: workflows, error } = await supabase
        .from('workflow_definitions')
        .select('id, name, trigger_config')
        .eq('is_active', true)
        .contains('trigger_config', { trigger_type: triggerType });

      if (error) {
        throw error;
      }

      if (!workflows || workflows.length === 0) {
        console.log('No workflows found for trigger:', triggerType);
        return;
      }

      console.log(`Found ${workflows.length} workflows for trigger:`, triggerType);

      // Execute each workflow
      const executions = workflows.map(workflow =>
        this.executeWorkflow(workflow.id, triggerData)
      );

      await Promise.allSettled(executions);
    } catch (error: any) {
      console.error('Failed to trigger workflows by event:', error);
      // Don't show error toast for automatic triggers
    }
  }

  /**
   * Cancel a running workflow execution
   */
  async cancelExecution(executionId: string) {
    try {
      const { error } = await supabase
        .from('workflow_executions')
        .update({
          status: 'cancelled',
          completed_at: new Date().toISOString(),
        })
        .eq('id', executionId)
        .eq('status', 'running');

      if (error) {
        throw error;
      }

      toast.success('Workflow execution cancelled');
    } catch (error: any) {
      console.error('Failed to cancel execution:', error);
      toast.error('Failed to cancel execution');
      throw error;
    }
  }
}

export const workflowExecutionService = new WorkflowExecutionService();
