import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { integrationService } from '@/services/IntegrationService';
import { aiConstructionService } from '@/services/AIConstructionService';

export interface WorkflowRule {
  id: string;
  name: string;
  description: string;
  trigger: WorkflowTrigger;
  conditions: WorkflowCondition[];
  actions: WorkflowAction[];
  isActive: boolean;
  priority: number;
  createdBy: string;
  createdAt: string;
  lastExecuted?: string;
  executionCount: number;
}

export interface WorkflowTrigger {
  type: 'data_change' | 'time_based' | 'manual' | 'ai_prediction' | 'external_event';
  table?: string;
  field?: string;
  operation?: 'insert' | 'update' | 'delete';
  schedule?: string; // cron expression
  aiThreshold?: number;
}

export interface WorkflowCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'in_range';
  value: any;
  logicalOperator?: 'AND' | 'OR';
}

export interface WorkflowAction {
  type: 'create_task' | 'send_notification' | 'update_field' | 'create_invoice' | 'send_email' | 'ai_analysis' | 'integrate_external';
  target?: string;
  data: any;
  delay?: number; // milliseconds
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  triggeredBy: string;
  triggeredAt: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: any;
  error?: string;
  duration?: number;
}

class WorkflowAutomationService {
  private executionQueue: WorkflowExecution[] = [];
  private isProcessing = false;

  /**
   * Create intelligent project workflows
   */
  async createProjectWorkflows(projectId: string): Promise<void> {
    try {
      const defaultWorkflows: Omit<WorkflowRule, 'id' | 'createdAt' | 'executionCount'>[] = [
        // Budget Alert Workflow
        {
          name: 'Budget Overrun Alert',
          description: 'Alert when project costs exceed 80% of budget',
          trigger: {
            type: 'data_change',
            table: 'project_cost_entries',
            operation: 'insert'
          },
          conditions: [
            {
              field: 'total_cost_percentage',
              operator: 'greater_than',
              value: 80
            }
          ],
          actions: [
            {
              type: 'send_notification',
              target: 'project_manager',
              data: {
                title: 'Budget Alert',
                message: 'Project costs have exceeded 80% of budget',
                priority: 'high'
              }
            },
            {
              type: 'ai_analysis',
              data: {
                analysisType: 'cost_prediction',
                projectId
              }
            }
          ],
          isActive: true,
          priority: 1,
          createdBy: 'system'
        },

        // Quality Issue Workflow
        {
          name: 'Quality Issue Detection',
          description: 'Automatically create tasks when quality issues are detected',
          trigger: {
            type: 'ai_prediction',
            aiThreshold: 70
          },
          conditions: [
            {
              field: 'defect_severity',
              operator: 'greater_than',
              value: 'medium'
            }
          ],
          actions: [
            {
              type: 'create_task',
              data: {
                name: 'Address Quality Issue',
                priority: 'high',
                category: 'quality_control'
              }
            },
            {
              type: 'send_notification',
              target: 'quality_manager',
              data: {
                title: 'Quality Issue Detected',
                message: 'AI has detected potential quality issues requiring attention'
              }
            }
          ],
          isActive: true,
          priority: 2,
          createdBy: 'system'
        },

        // Invoice Generation Workflow
        {
          name: 'Milestone Invoice Generation',
          description: 'Automatically create invoices when project milestones are reached',
          trigger: {
            type: 'data_change',
            table: 'projects',
            field: 'completion_percentage'
          },
          conditions: [
            {
              field: 'completion_percentage',
              operator: 'in_range',
              value: [25, 50, 75, 100]
            }
          ],
          actions: [
            {
              type: 'create_invoice',
              data: {
                type: 'milestone',
                percentage: 'completion_percentage'
              }
            },
            {
              type: 'send_notification',
              target: 'accounting',
              data: {
                title: 'Milestone Invoice Created',
                message: 'Invoice has been generated for project milestone'
              }
            }
          ],
          isActive: true,
          priority: 3,
          createdBy: 'system'
        },

        // Safety Compliance Workflow
        {
          name: 'Safety Incident Response',
          description: 'Automated response to safety incidents',
          trigger: {
            type: 'data_change',
            table: 'safety_incidents',
            operation: 'insert'
          },
          conditions: [
            {
              field: 'severity',
              operator: 'greater_than',
              value: 'low'
            }
          ],
          actions: [
            {
              type: 'send_notification',
              target: 'safety_manager',
              data: {
                title: 'Safety Incident Reported',
                message: 'Immediate attention required for safety incident',
                priority: 'critical'
              }
            },
            {
              type: 'create_task',
              data: {
                name: 'Investigate Safety Incident',
                priority: 'urgent',
                dueDate: '+1 day'
              }
            },
            {
              type: 'send_email',
              target: 'compliance_team',
              data: {
                subject: 'Safety Incident Notification',
                template: 'safety_incident'
              }
            }
          ],
          isActive: true,
          priority: 0, // Highest priority
          createdBy: 'system'
        },

        // Resource Optimization Workflow
        {
          name: 'Resource Optimization',
          description: 'Optimize resource allocation based on project progress',
          trigger: {
            type: 'time_based',
            schedule: '0 8 * * 1' // Every Monday at 8 AM
          },
          conditions: [
            {
              field: 'project_status',
              operator: 'equals',
              value: 'active'
            }
          ],
          actions: [
            {
              type: 'ai_analysis',
              data: {
                analysisType: 'resource_optimization',
                projectId
              }
            },
            {
              type: 'send_notification',
              target: 'project_manager',
              data: {
                title: 'Weekly Resource Review',
                message: 'AI-powered resource optimization recommendations available'
              }
            }
          ],
          isActive: true,
          priority: 4,
          createdBy: 'system'
        }
      ];

      // Insert workflows into database
      for (const workflow of defaultWorkflows) {
        await supabase
          .from('automation_rules')
          .insert([{
            project_id: projectId,
            name: workflow.name,
            description: workflow.description,
            trigger_config: workflow.trigger,
            conditions_config: workflow.conditions,
            actions_config: workflow.actions,
            is_active: workflow.isActive,
            priority: workflow.priority,
            created_by: workflow.createdBy
          }]);
      }

      toast({
        title: "Workflows Created",
        description: `${defaultWorkflows.length} intelligent workflows activated for this project`,
      });

    } catch (error: any) {
      console.error('Error creating project workflows:', error);
      throw new Error(`Failed to create workflows: ${error.message}`);
    }
  }

  /**
   * Execute workflow based on trigger
   */
  async executeWorkflow(
    workflowId: string, 
    triggerData: any, 
    triggeredBy: string
  ): Promise<WorkflowExecution> {
    const execution: WorkflowExecution = {
      id: crypto.randomUUID(),
      workflowId,
      triggeredBy,
      triggeredAt: new Date().toISOString(),
      status: 'pending'
    };

    try {
      // Get workflow configuration
      const { data: workflow, error } = await supabase
        .from('automation_rules')
        .select('*')
        .eq('id', workflowId)
        .single();

      if (error || !workflow) {
        throw new Error('Workflow not found');
      }

      if (!workflow.is_active) {
        throw new Error('Workflow is not active');
      }

      execution.status = 'running';
      const startTime = Date.now();

      // Check conditions
      const conditionsMet = await this.evaluateConditions(
        workflow.conditions_config,
        triggerData
      );

      if (!conditionsMet) {
        execution.status = 'completed';
        execution.result = { message: 'Conditions not met, workflow skipped' };
        return execution;
      }

      // Execute actions
      const actionResults = [];
      for (const action of workflow.actions_config) {
        try {
          const result = await this.executeAction(action, triggerData, workflow.project_id);
          actionResults.push({ action: action.type, result });
        } catch (actionError: any) {
          actionResults.push({ action: action.type, error: actionError.message });
        }
      }

      execution.status = 'completed';
      execution.result = { actions: actionResults };
      execution.duration = Date.now() - startTime;

      // Update workflow execution count
      await supabase
        .from('automation_rules')
        .update({ 
          execution_count: workflow.execution_count + 1,
          last_executed: new Date().toISOString()
        })
        .eq('id', workflowId);

      // Log execution
      await this.logWorkflowExecution(execution);

    } catch (error: any) {
      execution.status = 'failed';
      execution.error = error.message;
      console.error('Workflow execution error:', error);
    }

    return execution;
  }

  /**
   * Smart workflow suggestions based on project data
   */
  async suggestWorkflows(projectId: string): Promise<WorkflowRule[]> {
    try {
      // Analyze project data to suggest relevant workflows
      const { data: project } = await supabase
        .from('projects')
        .select(`
          *,
          tasks(status, priority),
          expenses(amount, category),
          safety_incidents(severity),
          quality_inspections(score)
        `)
        .eq('id', projectId)
        .single();

      if (!project) return [];

      const suggestions: Partial<WorkflowRule>[] = [];

      // Analyze task patterns
      const tasks = project.tasks || [];
      const overdueTasks = tasks.filter((t: any) => 
        t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed'
      );

      if (overdueTasks.length > 3) {
        suggestions.push({
          name: 'Overdue Task Alert',
          description: 'Automatically notify managers when tasks become overdue',
          trigger: {
            type: 'time_based',
            schedule: '0 9 * * *' // Daily at 9 AM
          },
          actions: [
            {
              type: 'send_notification',
              target: 'project_manager',
              data: {
                title: 'Overdue Tasks Alert',
                message: `${overdueTasks.length} tasks are overdue`
              }
            }
          ]
        });
      }

      // Analyze expense patterns
      const expenses = project.expenses || [];
      const recentExpenses = expenses.filter((e: any) => 
        new Date(e.expense_date) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      );

      if (recentExpenses.length > 10) {
        suggestions.push({
          name: 'Expense Approval Workflow',
          description: 'Route high-value expenses for approval',
          trigger: {
            type: 'data_change',
            table: 'expenses',
            operation: 'insert'
          },
          conditions: [
            {
              field: 'amount',
              operator: 'greater_than',
              value: 1000
            }
          ],
          actions: [
            {
              type: 'send_notification',
              target: 'finance_manager',
              data: {
                title: 'Expense Approval Required',
                message: 'High-value expense requires approval'
              }
            }
          ]
        });
      }

      // Analyze safety data
      const safetyIncidents = project.safety_incidents || [];
      if (safetyIncidents.length > 0) {
        suggestions.push({
          name: 'Safety Training Reminder',
          description: 'Schedule safety training after incidents',
          trigger: {
            type: 'data_change',
            table: 'safety_incidents',
            operation: 'insert'
          },
          actions: [
            {
              type: 'create_task',
              data: {
                name: 'Schedule Safety Training',
                priority: 'high',
                category: 'safety'
              }
            }
          ]
        });
      }

      return suggestions as WorkflowRule[];

    } catch (error: any) {
      console.error('Error suggesting workflows:', error);
      return [];
    }
  }

  /**
   * Process workflow queue
   */
  async processWorkflowQueue(): Promise<void> {
    if (this.isProcessing || this.executionQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      // Sort by priority (lower number = higher priority)
      this.executionQueue.sort((a, b) => {
        // Assuming we store priority in the workflow data
        return 0; // Simplified for now
      });

      const execution = this.executionQueue.shift();
      if (execution) {
        await this.executeWorkflow(execution.workflowId, {}, execution.triggeredBy);
      }

    } catch (error: any) {
      console.error('Error processing workflow queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  // Private helper methods
  private async evaluateConditions(
    conditions: WorkflowCondition[], 
    data: any
  ): Promise<boolean> {
    if (!conditions || conditions.length === 0) return true;

    let result = true;
    let currentLogicalOperator = 'AND';

    for (const condition of conditions) {
      const fieldValue = this.getNestedValue(data, condition.field);
      const conditionResult = this.evaluateCondition(condition, fieldValue);

      if (currentLogicalOperator === 'AND') {
        result = result && conditionResult;
      } else {
        result = result || conditionResult;
      }

      currentLogicalOperator = condition.logicalOperator || 'AND';
    }

    return result;
  }

  private evaluateCondition(condition: WorkflowCondition, fieldValue: any): boolean {
    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value;
      case 'not_equals':
        return fieldValue !== condition.value;
      case 'greater_than':
        return Number(fieldValue) > Number(condition.value);
      case 'less_than':
        return Number(fieldValue) < Number(condition.value);
      case 'contains':
        return String(fieldValue).includes(String(condition.value));
      case 'in_range':
        if (Array.isArray(condition.value) && condition.value.length === 2) {
          const [min, max] = condition.value;
          return Number(fieldValue) >= min && Number(fieldValue) <= max;
        }
        return Array.isArray(condition.value) && condition.value.includes(fieldValue);
      default:
        return false;
    }
  }

  private async executeAction(
    action: WorkflowAction, 
    triggerData: any, 
    projectId: string
  ): Promise<any> {
    // Add delay if specified
    if (action.delay) {
      await new Promise(resolve => setTimeout(resolve, action.delay));
    }

    switch (action.type) {
      case 'create_task':
        return await this.createTask(action.data, projectId);
      
      case 'send_notification':
        return await this.sendNotification(action.data, action.target);
      
      case 'update_field':
        return await this.updateField(action.data, triggerData);
      
      case 'create_invoice':
        return await this.createInvoice(action.data, projectId);
      
      case 'send_email':
        return await this.sendEmail(action.data, action.target);
      
      case 'ai_analysis':
        return await this.triggerAIAnalysis(action.data, projectId);
      
      case 'integrate_external':
        return await this.integrateExternal(action.data);
      
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  private async createTask(taskData: any, projectId: string): Promise<any> {
    const task = {
      project_id: projectId,
      name: taskData.name,
      description: taskData.description || 'Created by workflow automation',
      priority: taskData.priority || 'medium',
      status: 'pending',
      category: taskData.category || 'general',
      due_date: taskData.dueDate ? this.parseDueDate(taskData.dueDate) : null,
      created_by_automation: true
    };

    const { data, error } = await supabase
      .from('tasks')
      .insert([task])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  private async sendNotification(notificationData: any, target?: string): Promise<any> {
    // Integration with notification system
    const notification = {
      title: notificationData.title,
      message: notificationData.message,
      priority: notificationData.priority || 'medium',
      target_role: target,
      created_by_automation: true
    };

    // This would integrate with your notification service
    console.log('Sending notification:', notification);
    return { sent: true, notification };
  }

  private async updateField(updateData: any, triggerData: any): Promise<any> {
    const { table, field, value } = updateData;
    const recordId = triggerData.id;

    const { data, error } = await supabase
      .from(table)
      .update({ [field]: value })
      .eq('id', recordId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  private async createInvoice(invoiceData: any, projectId: string): Promise<any> {
    return await integrationService.createInvoiceFromProject(projectId);
  }

  private async sendEmail(emailData: any, target?: string): Promise<any> {
    // Integration with email service
    console.log('Sending email:', { emailData, target });
    return { sent: true, emailData };
  }

  private async triggerAIAnalysis(analysisData: any, projectId: string): Promise<any> {
    switch (analysisData.analysisType) {
      case 'cost_prediction':
        return await aiConstructionService.predictProjectCosts(projectId);
      case 'risk_assessment':
        return await aiConstructionService.analyzeProjectRisk(projectId);
      case 'quality_analysis':
        return await aiConstructionService.generateQualityInsights(projectId);
      default:
        throw new Error(`Unknown analysis type: ${analysisData.analysisType}`);
    }
  }

  private async integrateExternal(integrationData: any): Promise<any> {
    // Integration with external services
    console.log('External integration:', integrationData);
    return { integrated: true, integrationData };
  }

  private async logWorkflowExecution(execution: WorkflowExecution): Promise<void> {
    await supabase
      .from('workflow_executions')
      .insert([{
        workflow_id: execution.workflowId,
        triggered_by: execution.triggeredBy,
        triggered_at: execution.triggeredAt,
        status: execution.status,
        result: execution.result,
        error: execution.error,
        duration: execution.duration
      }]);
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private parseDueDate(dueDateString: string): string | null {
    if (dueDateString.startsWith('+')) {
      const days = parseInt(dueDateString.substring(1).split(' ')[0]);
      const date = new Date();
      date.setDate(date.getDate() + days);
      return date.toISOString().split('T')[0];
    }
    return dueDateString;
  }
}

// Export singleton instance
export const workflowAutomationService = new WorkflowAutomationService();
export default workflowAutomationService;
