import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface CrossModuleOperation {
  id: string;
  operation_type: 'opportunity_to_project' | 'project_to_invoice' | 'contact_sync' | 'material_cost_update';
  source_module: string;
  target_module: string;
  source_id: string;
  target_id?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  data: any;
  error_message?: string;
  created_at: string;
  completed_at?: string;
}

export interface ProjectFromOpportunity {
  opportunityId: string;
  projectName?: string;
  clientContactId?: string;
  estimatedBudget?: number;
  startDate?: string;
  projectType?: string;
}

export interface ContactSyncData {
  contactId: string;
  syncToModules: string[];
  contactData: any;
}

export interface MaterialCostUpdate {
  materialId: string;
  projectIds: string[];
  newUnitCost: number;
  updateJobCosting: boolean;
}

class IntegrationService {
  /**
   * Create a project from a won opportunity
   */
  async createProjectFromOpportunity(params: ProjectFromOpportunity): Promise<{ success: boolean; projectId?: string; error?: string }> {
    try {
      // 1. Get opportunity details
      const { data: opportunity, error: oppError } = await supabase
        .from('opportunities')
        .select(`
          *,
          contacts(*)
        `)
        .eq('id', params.opportunityId)
        .single();

      if (oppError) throw oppError;

      if (!opportunity) {
        throw new Error('Opportunity not found');
      }

      // 2. Create project with opportunity data
      const projectData = {
        company_id: opportunity.company_id,
        name: params.projectName || opportunity.name,
        description: opportunity.description || `Project created from opportunity: ${opportunity.name}`,
        client_name: opportunity.contacts?.company_name || opportunity.contacts?.name || 'Unknown Client',
        client_contact_info: {
          name: opportunity.contacts?.name,
          email: opportunity.contacts?.email,
          phone: opportunity.contacts?.phone,
          company: opportunity.contacts?.company_name
        },
        budget: params.estimatedBudget || opportunity.estimated_value || 0,
        start_date: params.startDate || new Date().toISOString().split('T')[0],
        project_type: params.projectType || opportunity.project_type || 'general',
        status: 'planning',
        opportunity_id: opportunity.id, // Link back to opportunity
        created_from: 'opportunity'
      };

      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert([projectData])
        .select()
        .single();

      if (projectError) throw projectError;

      // 3. Update opportunity status to indicate project created
      await supabase
        .from('opportunities')
        .update({ 
          status: 'won',
          project_id: project.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', params.opportunityId);

      // 4. Create project contact if contact exists
      if (opportunity.contacts && project.id) {
        await this.createProjectContactFromCRMContact(project.id, opportunity.contacts.id);
      }

      // 5. Log the cross-module operation
      await this.logCrossModuleOperation({
        operation_type: 'opportunity_to_project',
        source_module: 'crm',
        target_module: 'projects',
        source_id: params.opportunityId,
        target_id: project.id,
        status: 'completed',
        data: { projectData }
      });

      // 6. Trigger project setup workflows
      await this.triggerProjectSetupWorkflows(project.id);

      toast({
        title: "Success",
        description: `Project "${project.name}" created from opportunity successfully!`,
      });

      return { success: true, projectId: project.id };

    } catch (error: any) {
      console.error('Error creating project from opportunity:', error);
      
      // Log failed operation
      await this.logCrossModuleOperation({
        operation_type: 'opportunity_to_project',
        source_module: 'crm',
        target_module: 'projects',
        source_id: params.opportunityId,
        status: 'failed',
        data: params,
        error_message: error.message
      });

      toast({
        title: "Error",
        description: `Failed to create project: ${error.message}`,
        variant: "destructive"
      });

      return { success: false, error: error.message };
    }
  }

  /**
   * Create project contact from CRM contact
   */
  async createProjectContactFromCRMContact(projectId: string, crmContactId: string): Promise<void> {
    try {
      // Get CRM contact data
      const { data: crmContact, error: contactError } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', crmContactId)
        .single();

      if (contactError || !crmContact) return;

      // Create project contact
      const projectContactData = {
        project_id: projectId,
        company_id: crmContact.company_id,
        contact_name: crmContact.name,
        contact_role: 'Client Representative',
        organization: crmContact.company_name,
        email: crmContact.email,
        phone: crmContact.phone,
        is_primary_contact: true,
        notes: `Imported from CRM contact: ${crmContact.name}`,
        crm_contact_id: crmContactId // Link back to CRM
      };

      await supabase
        .from('project_contacts')
        .insert([projectContactData]);

    } catch (error) {
      console.error('Error creating project contact:', error);
    }
  }

  /**
   * Sync contact data across modules
   */
  async syncContactAcrossModules(params: ContactSyncData): Promise<{ success: boolean; error?: string }> {
    try {
      const { contactId, syncToModules, contactData } = params;

      for (const module of syncToModules) {
        switch (module) {
          case 'projects':
            // Update all project contacts linked to this CRM contact
            await supabase
              .from('project_contacts')
              .update({
                contact_name: contactData.name,
                email: contactData.email,
                phone: contactData.phone,
                organization: contactData.company_name,
                updated_at: new Date().toISOString()
              })
              .eq('crm_contact_id', contactId);
            break;

          case 'crm':
            // Update CRM contact
            await supabase
              .from('contacts')
              .update({
                name: contactData.name,
                email: contactData.email,
                phone: contactData.phone,
                company_name: contactData.company_name,
                updated_at: new Date().toISOString()
              })
              .eq('id', contactId);
            break;
        }
      }

      await this.logCrossModuleOperation({
        operation_type: 'contact_sync',
        source_module: 'integration',
        target_module: syncToModules.join(','),
        source_id: contactId,
        status: 'completed',
        data: { syncToModules, contactData }
      });

      return { success: true };

    } catch (error: any) {
      console.error('Error syncing contact:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update job costing when material costs change
   */
  async updateJobCostingFromMaterialCosts(params: MaterialCostUpdate): Promise<{ success: boolean; error?: string }> {
    try {
      const { materialId, projectIds, newUnitCost, updateJobCosting } = params;

      if (!updateJobCosting) return { success: true };

      // Update material usage records with new costs
      const { data: usageRecords } = await supabase
        .from('material_usage')
        .select('id, quantity_used')
        .eq('material_id', materialId)
        .in('project_id', projectIds);

      if (usageRecords && usageRecords.length > 0) {
        // Update each usage record with new total cost
        for (const usage of usageRecords) {
          const newTotalCost = usage.quantity_used * newUnitCost;
          
          await supabase
            .from('material_usage')
            .update({
              unit_cost: newUnitCost,
              total_cost: newTotalCost,
              updated_at: new Date().toISOString()
            })
            .eq('id', usage.id);
        }

        // Log the operation
        await this.logCrossModuleOperation({
          operation_type: 'material_cost_update',
          source_module: 'materials',
          target_module: 'job_costing',
          source_id: materialId,
          status: 'completed',
          data: { projectIds, newUnitCost, updatedRecords: usageRecords.length }
        });
      }

      return { success: true };

    } catch (error: any) {
      console.error('Error updating job costing from material costs:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Trigger project setup workflows
   */
  private async triggerProjectSetupWorkflows(projectId: string): Promise<void> {
    try {
      // Create initial project phases
      const defaultPhases = [
        { name: 'Planning', status: 'active', start_date: new Date().toISOString().split('T')[0] },
        { name: 'Design', status: 'pending' },
        { name: 'Construction', status: 'pending' },
        { name: 'Completion', status: 'pending' }
      ];

      for (const phase of defaultPhases) {
        await supabase
          .from('project_phases')
          .insert([{
            project_id: projectId,
            ...phase
          }]);
      }

      // Create initial tasks
      const initialTasks = [
        { name: 'Project Kickoff Meeting', priority: 'high', status: 'pending' },
        { name: 'Site Survey', priority: 'medium', status: 'pending' },
        { name: 'Permit Applications', priority: 'medium', status: 'pending' }
      ];

      for (const task of initialTasks) {
        await supabase
          .from('tasks')
          .insert([{
            project_id: projectId,
            ...task
          }]);
      }

    } catch (error) {
      console.error('Error triggering project setup workflows:', error);
    }
  }

  /**
   * Log cross-module operations for tracking and debugging
   */
  private async logCrossModuleOperation(operation: Omit<CrossModuleOperation, 'id' | 'created_at' | 'completed_at'>): Promise<void> {
    try {
      const logData = {
        ...operation,
        created_at: new Date().toISOString(),
        completed_at: operation.status === 'completed' ? new Date().toISOString() : null
      };

      // Store in activity feed or dedicated operations log table
      await supabase
        .from('activity_feed')
        .insert([{
          activity_type: 'cross_module_operation',
          title: `${operation.operation_type.replace('_', ' ').toUpperCase()}`,
          description: `${operation.source_module} → ${operation.target_module}`,
          metadata: logData,
          created_at: new Date().toISOString()
        }]);

    } catch (error) {
      console.error('Error logging cross-module operation:', error);
    }
  }

  /**
   * Get cross-module operation history
   */
  async getOperationHistory(filters?: {
    operation_type?: string;
    source_module?: string;
    target_module?: string;
    status?: string;
    limit?: number;
  }): Promise<CrossModuleOperation[]> {
    try {
      let query = supabase
        .from('activity_feed')
        .select('*')
        .eq('activity_type', 'cross_module_operation')
        .order('created_at', { ascending: false });

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map(item => item.metadata as CrossModuleOperation);

    } catch (error) {
      console.error('Error getting operation history:', error);
      return [];
    }
  }

  /**
   * Create invoice from project milestone
   */
  async createInvoiceFromProject(projectId: string, milestoneId?: string): Promise<{ success: boolean; invoiceId?: string; error?: string }> {
    try {
      // Get project details
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (projectError) throw projectError;

      // Get job costing data for accurate invoice amounts
      const { data: costEntries } = await supabase
        .from('project_cost_entries')
        .select(`
          *,
          project_cost_codes(code, description)
        `)
        .in('cost_code_id', 
          await supabase
            .from('project_cost_codes')
            .select('id')
            .eq('project_id', projectId)
            .then(res => (res.data || []).map(cc => cc.id))
        );

      const totalCosts = (costEntries || []).reduce((sum, entry) => sum + entry.amount, 0);
      const invoiceAmount = totalCosts * 1.2; // Add 20% markup as example

      // Create invoice
      const invoiceData = {
        company_id: project.company_id,
        project_id: projectId,
        client_name: project.client_name,
        amount: invoiceAmount,
        status: 'draft',
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days
        description: `Invoice for project: ${project.name}`,
        line_items: costEntries?.map(entry => ({
          description: entry.project_cost_codes?.description || entry.description,
          amount: entry.amount * 1.2 // Apply markup
        })) || []
      };

      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert([invoiceData])
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Log the operation
      await this.logCrossModuleOperation({
        operation_type: 'project_to_invoice',
        source_module: 'projects',
        target_module: 'financial',
        source_id: projectId,
        target_id: invoice.id,
        status: 'completed',
        data: { invoiceAmount, totalCosts }
      });

      toast({
        title: "Success",
        description: `Invoice created for project "${project.name}"`,
      });

      return { success: true, invoiceId: invoice.id };

    } catch (error: any) {
      console.error('Error creating invoice from project:', error);
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance
export const integrationService = new IntegrationService();
export default integrationService;
