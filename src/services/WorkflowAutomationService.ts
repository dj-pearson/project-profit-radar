import { toast } from 'sonner';

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

class WorkflowAutomationService {
  async createWorkflowRule(
    companyId: string,
    rule: Omit<WorkflowRule, 'id' | 'createdAt' | 'executionCount'>
  ): Promise<WorkflowRule> {
    try {
      const newRule: WorkflowRule = {
        ...rule,
        id: `rule-${Date.now()}`,
        createdAt: new Date().toISOString(),
        executionCount: 0
      };

      console.log('Created workflow rule:', newRule);
      toast.success('Workflow rule created successfully');
      return newRule;
    } catch (error: any) {
      console.error('Error creating workflow rule:', error);
      toast.error('Failed to create workflow rule');
      throw error;
    }
  }

  async getWorkflowRules(companyId: string): Promise<WorkflowRule[]> {
    try {
      // Mock workflow rules
      const mockRules: WorkflowRule[] = [
        {
          id: 'rule-1',
          name: 'Project Completion Notification',
          description: 'Send notification when project is completed',
          isActive: true,
          trigger: {
            type: 'project_status_change',
            conditions: { status: 'completed' }
          },
          conditions: [],
          actions: [
            {
              type: 'send_email',
              parameters: {
                to: 'project_manager',
                template: 'project_completion'
              }
            }
          ],
          priority: 1,
          createdBy: 'user-123',
          createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          executionCount: 5
        },
        {
          id: 'rule-2',
          name: 'Invoice Auto-Creation',
          description: 'Automatically create invoice when project reaches 50% completion',
          isActive: true,
          trigger: {
            type: 'project_status_change',
            conditions: { completion_percentage: 50 }
          },
          conditions: [
            {
              field: 'completion_percentage',
              operator: 'greater_than',
              value: 50
            }
          ],
          actions: [
            {
              type: 'create_invoice',
              parameters: {
                amount_percentage: 50,
                description: 'Progress billing - 50% completion'
              }
            }
          ],
          priority: 2,
          createdBy: 'user-456',
          createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
          executionCount: 12
        }
      ];

      return mockRules;
    } catch (error: any) {
      console.error('Error fetching workflow rules:', error);
      toast.error('Failed to load workflow rules');
      return [];
    }
  }

  async updateWorkflowRule(ruleId: string, updates: Partial<WorkflowRule>): Promise<boolean> {
    try {
      console.log('Updating workflow rule:', ruleId, updates);
      toast.success('Workflow rule updated successfully');
      return true;
    } catch (error: any) {
      console.error('Error updating workflow rule:', error);
      toast.error('Failed to update workflow rule');
      return false;
    }
  }

  async deleteWorkflowRule(ruleId: string): Promise<boolean> {
    try {
      console.log('Deleting workflow rule:', ruleId);
      toast.success('Workflow rule deleted successfully');
      return true;
    } catch (error: any) {
      console.error('Error deleting workflow rule:', error);
      toast.error('Failed to delete workflow rule');
      return false;
    }
  }

  async executeWorkflow(ruleId: string, triggerData: any): Promise<WorkflowExecution> {
    try {
      const execution: WorkflowExecution = {
        id: `exec-${Date.now()}`,
        ruleId,
        triggeredAt: new Date().toISOString(),
        status: 'success',
        executionData: triggerData
      };

      console.log('Executed workflow:', execution);
      return execution;
    } catch (error: any) {
      console.error('Error executing workflow:', error);
      throw error;
    }
  }

  async processProjectStatusChange(projectId: string, oldStatus: string, newStatus: string): Promise<void> {
    try {
      console.log('Processing project status change:', {
        projectId,
        oldStatus,
        newStatus
      });

      // Mock workflow execution
      if (newStatus === 'completed') {
        toast.success('Project completion workflows triggered');
      }
    } catch (error: any) {
      console.error('Error processing project status change:', error);
      throw error;
    }
  }

  async processTaskCompletion(taskId: string, projectId: string): Promise<void> {
    try {
      console.log('Processing task completion:', { taskId, projectId });
      
      // Mock task completion processing
      toast.info('Task completion workflows processed');
    } catch (error: any) {
      console.error('Error processing task completion:', error);
      throw error;
    }
  }

  async getWorkflowExecutions(ruleId?: string, limit: number = 50): Promise<WorkflowExecution[]> {
    try {
      // Mock workflow executions
      const mockExecutions: WorkflowExecution[] = [
        {
          id: 'exec-1',
          ruleId: 'rule-1',
          triggeredAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          status: 'success',
          executionData: { projectId: 'proj-123', newStatus: 'completed' }
        },
        {
          id: 'exec-2',
          ruleId: 'rule-2',
          triggeredAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          status: 'failed',
          errorMessage: 'Failed to create invoice',
          executionData: { projectId: 'proj-456', completion: 50 }
        }
      ];

      return ruleId 
        ? mockExecutions.filter(exec => exec.ruleId === ruleId).slice(0, limit)
        : mockExecutions.slice(0, limit);
    } catch (error: any) {
      console.error('Error fetching workflow executions:', error);
      toast.error('Failed to load workflow executions');
      return [];
    }
  }

  async toggleWorkflowRule(ruleId: string, isActive: boolean): Promise<boolean> {
    try {
      console.log(`${isActive ? 'Activating' : 'Deactivating'} workflow rule:`, ruleId);
      toast.success(`Workflow rule ${isActive ? 'activated' : 'deactivated'}`);
      return true;
    } catch (error: any) {
      console.error('Error toggling workflow rule:', error);
      toast.error('Failed to toggle workflow rule');
      return false;
    }
  }
}

export const workflowAutomationService = new WorkflowAutomationService();
export default workflowAutomationService;