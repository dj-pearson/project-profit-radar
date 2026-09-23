import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import type { Database, Json } from '@/integrations/supabase/types';

type DefinitionUpdate = Database['public']['Tables']['workflow_definitions']['Update'];

export interface WorkflowTrigger {
  type: 'project_status_change' | 'task_completion' | 'invoice_created' | 'deadline_approaching' | 'budget_threshold';
  conditions: Record<string, any>;
}

export interface WorkflowCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains';
  value: any;
}

export interface WorkflowAction {
  type: 'send_email' | 'create_task' | 'update_status' | 'send_notification' | 'create_invoice';
  parameters: Record<string, any>;
}

export interface WorkflowRule {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  trigger: WorkflowTrigger;
  conditions: WorkflowCondition[];
  actions: WorkflowAction[];
  priority: number;
  createdBy: string;
  createdAt: string;
  lastTriggered?: string;
  executionCount: number;
}

export interface WorkflowExecution {
  id: string;
  ruleId: string;
  triggeredAt: string;
  status: 'success' | 'failed' | 'pending';
  errorMessage?: string;
  executionData: any;
}

/** Update one workflow_definitions row; throws unless exactly that row came back. */
async function writeOneDefinition(ruleId: string, patch: DefinitionUpdate): Promise<void> {
  const { data, error } = await supabase
    .from('workflow_definitions')
    .update(patch)
    .eq('id', ruleId)
    .select('id');

  if (error) throw error;
  if (!data || data.length === 0) throw new Error('Workflow rule not found or not permitted');
}

class WorkflowAutomationService {
  /**
   * US-309: create, update, delete and toggle each toasted success and wrote
   * nothing - create even returned an invented `rule-<timestamp>` id. They now
   * write workflow_definitions, the table getWorkflowRules already reads, and
   * only report success when a row comes back (RLS denies an update or delete
   * it does not permit without returning an error).
   */
  async createWorkflowRule(
    companyId: string,
    rule: Omit<WorkflowRule, 'id' | 'createdAt' | 'executionCount'>
  ): Promise<WorkflowRule> {
    try {
      const { data, error } = await supabase
        .from('workflow_definitions')
        .insert({
          company_id: companyId,
          name: rule.name,
          description: rule.description,
          is_active: rule.isActive,
          trigger_type: rule.trigger.type,
          trigger_config: rule.trigger.conditions as Json,
          workflow_steps: { conditions: rule.conditions, actions: rule.actions, priority: rule.priority } as unknown as Json,
          created_by: rule.createdBy || null
        })
        .select('id, created_at')
        .single();

      if (error) throw error;

      toast.success('Workflow rule created successfully');
      return { ...rule, id: data.id, createdAt: data.created_at, executionCount: 0 };
    } catch (error: any) {
      logger.error('Error creating workflow rule:', error);
      toast.error('Failed to create workflow rule');
      throw error;
    }
  }

  async getWorkflowRules(companyId: string): Promise<WorkflowRule[]> {
    try {
      const { data, error } = await supabase
        .from('workflow_definitions')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Map database records to WorkflowRule interface
      return (data || []).map(wf => ({
        id: wf.id,
        name: wf.name,
        description: wf.description || '',
        isActive: wf.is_active,
        trigger: wf.trigger_config as WorkflowTrigger,
        conditions: [],
        actions: [],
        priority: 1,
        createdBy: wf.created_by,
        createdAt: wf.created_at,
        lastTriggered: wf.last_executed_at,
        executionCount: 0
      }));
    } catch (error: any) {
      logger.error('Error fetching workflow rules:', error);
      toast.error('Failed to load workflow rules');
      return [];
    }
  }

  async updateWorkflowRule(ruleId: string, updates: Partial<WorkflowRule>): Promise<boolean> {
    try {
      const patch: DefinitionUpdate = {};
      if (updates.name !== undefined) patch.name = updates.name;
      if (updates.description !== undefined) patch.description = updates.description;
      if (updates.isActive !== undefined) patch.is_active = updates.isActive;
      if (updates.trigger !== undefined) {
        patch.trigger_type = updates.trigger.type;
        patch.trigger_config = updates.trigger.conditions as Json;
      }

      await writeOneDefinition(ruleId, patch);
      toast.success('Workflow rule updated successfully');
      return true;
    } catch (error: any) {
      logger.error('Error updating workflow rule:', error);
      toast.error('Failed to update workflow rule');
      return false;
    }
  }

  async deleteWorkflowRule(ruleId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('workflow_definitions')
        .delete()
        .eq('id', ruleId)
        .select('id');

      if (error) throw error;
      if (!data || data.length === 0) throw new Error('Workflow rule not found or not permitted');

      toast.success('Workflow rule deleted successfully');
      return true;
    } catch (error: any) {
      logger.error('Error deleting workflow rule:', error);
      toast.error('Failed to delete workflow rule');
      return false;
    }
  }

  // This returned status 'success' for a run that never happened (US-309).
  async executeWorkflow(ruleId: string, triggerData: any): Promise<WorkflowExecution> {
    return {
      id: `not-run-${Date.now()}`,
      ruleId,
      triggeredAt: new Date().toISOString(),
      status: 'failed',
      errorMessage: 'Workflows are not executed from the client; nothing ran.',
      executionData: triggerData
    };
  }

  // Both of these toasted that workflows had run ("Project completion workflows
  // triggered") when nothing ran at all (US-309). No workflow engine runs from
  // the client, so they only log.
  async processProjectStatusChange(projectId: string, oldStatus: string, newStatus: string): Promise<void> {
    logger.debug('Project status change (no client-side workflow engine):', { projectId, oldStatus, newStatus });
  }

  async processTaskCompletion(taskId: string, projectId: string): Promise<void> {
    logger.debug('Task completion (no client-side workflow engine):', { taskId, projectId });
  }

  // Returned two invented executions (US-309); reads the real table now.
  async getWorkflowExecutions(ruleId?: string, limit: number = 50): Promise<WorkflowExecution[]> {
    try {
      let query = supabase
        .from('workflow_executions')
        .select('id, workflow_id, started_at, status, error_message, trigger_data')
        .order('started_at', { ascending: false })
        .limit(limit);
      if (ruleId) query = query.eq('workflow_id', ruleId);

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map(row => ({
        id: row.id,
        ruleId: row.workflow_id,
        triggeredAt: row.started_at,
        status: row.status === 'completed' || row.status === 'success'
          ? 'success'
          : row.status === 'failed' ? 'failed' : 'pending',
        errorMessage: row.error_message ?? undefined,
        executionData: row.trigger_data
      }));
    } catch (error: any) {
      logger.error('Error fetching workflow executions:', error);
      toast.error('Failed to load workflow executions');
      return [];
    }
  }

  async toggleWorkflowRule(ruleId: string, isActive: boolean): Promise<boolean> {
    try {
      await writeOneDefinition(ruleId, { is_active: isActive });
      toast.success(`Workflow rule ${isActive ? 'activated' : 'deactivated'}`);
      return true;
    } catch (error: any) {
      logger.error('Error toggling workflow rule:', error);
      toast.error('Failed to toggle workflow rule');
      return false;
    }
  }
}

export const workflowAutomationService = new WorkflowAutomationService();
export default workflowAutomationService;