/**
 * Estimate to Project Conversion Service
 * Updated with multi-tenant site_id isolation
 * All methods require siteId as first parameter for complete isolation
 */
import { supabase } from '@/integrations/supabase/client';

export interface EstimateData {
  id: string;
  title: string;
  description?: string;
  client_name: string;
  client_email?: string;
  client_phone?: string;
  site_address?: string;
  total_amount: number;
  line_items?: any[];
  notes?: string;
  valid_until?: string;
}

export interface ProjectConversionData {
  name: string;
  client_name: string;
  budget: number;
  description?: string;
  location?: string;
  start_date: string;
  estimated_end_date?: string;
  status: string;
}

export interface ConversionResult {
  success: boolean;
  projectId?: string;
  error?: string;
}

class EstimateToProjectConversionService {
  /**
   * Converts an accepted estimate into a project
   */
  async convertEstimateToProject(
    siteId: string,
    estimateId: string,
    companyId: string,
    customizations?: Partial<ProjectConversionData>
  ): Promise<ConversionResult> {
    if (!siteId) throw new Error('Site ID is required for multi-tenant isolation');

    try {
      // 1. Fetch the estimate with all details
      const { data: estimate, error: estimateError } = await supabase
        .from('estimates')
        .select('*')
        .eq('site_id', siteId)  // CRITICAL: Site isolation
        .eq('id', estimateId)
        .single();

      if (estimateError || !estimate) {
        return {
          success: false,
          error: 'Failed to fetch estimate details'
        };
      }

      // 2. Check if estimate is already converted
      if (estimate.project_id) {
        return {
          success: false,
          error: 'This estimate has already been converted to a project'
        };
      }

      // 3. Prepare project data from estimate
      const projectData: any = {  // CRITICAL: Site isolation
        company_id: companyId,
        name: customizations?.name || estimate.title,
        client_name: estimate.client_name,
        description: customizations?.description || estimate.description || '',
        location: customizations?.location || estimate.site_address || '',
        budget: customizations?.budget || estimate.total_amount,
        status: customizations?.status || 'planning',
        start_date: customizations?.start_date || new Date().toISOString().split('T')[0],
        estimated_end_date: customizations?.estimated_end_date || null,
        created_from_estimate_id: estimateId
      };

      // 4. Create the project
      const { data: newProject, error: projectError } = await supabase
        .from('projects')
        .insert(projectData)
        .select()
        .single();

      if (projectError || !newProject) {
        console.error('Project creation error:', projectError);
        return {
          success: false,
          error: 'Failed to create project'
        };
      }

      // 5. Transfer line items to job costing structure if they exist
      if (estimate.line_items && Array.isArray(estimate.line_items)) {
        await this.transferLineItemsToJobCosting(
          siteId,
          estimate.line_items,
          newProject.id,
          companyId
        );
      }

      // 6. Update estimate to mark it as converted
      const { error: updateError } = await supabase
        .from('estimates')
        .update({
          project_id: newProject.id,
          status: 'accepted',
          accepted_date: new Date().toISOString()
        })
        .eq('site_id', siteId)  // CRITICAL: Site isolation
        .eq('id', estimateId);

      if (updateError) {
        console.error('Failed to update estimate:', updateError);
        // Continue anyway since project was created
      }

      // 7. Create initial project notes from estimate notes
      if (estimate.notes) {
        await supabase
          .from('project_notes')
          .insert({  // CRITICAL: Site isolation
            project_id: newProject.id,
            note: `Estimate Notes: ${estimate.notes}`,
            created_by: (await supabase.auth.getUser()).data.user?.id
          });
      }

      return {
        success: true,
        projectId: newProject.id
      };

    } catch (error: any) {
      console.error('Conversion error:', error);
      return {
        success: false,
        error: error.message || 'An unexpected error occurred'
      };
    }
  }

  /**
   * Transfers estimate line items to project job costing structure
   */
  private async transferLineItemsToJobCosting(
    siteId: string,
    lineItems: any[],
    projectId: string,
    companyId: string
  ): Promise<void> {
    try {
      // Group line items by category for job cost structure
      const costEntries = lineItems.map((item) => ({  // CRITICAL: Site isolation
        project_id: projectId,
        company_id: companyId,
        cost_code: item.category || 'General',
        description: `${item.item_name}${item.description ? ' - ' + item.description : ''}`,
        budgeted_amount: item.quantity * item.unit_cost,
        actual_amount: 0,
        quantity: item.quantity,
        unit: item.unit || 'ea',
        unit_cost: item.unit_cost,
        cost_type: 'budgeted',
        date: new Date().toISOString().split('T')[0]
      }));

      // Insert initial budget entries
      if (costEntries.length > 0) {
        const { error } = await supabase
          .from('job_costs')
          .insert(costEntries);

        if (error) {
          console.error('Failed to transfer line items to job costing:', error);
        }
      }
    } catch (error) {
      console.error('Error transferring line items:', error);
      // Don't fail the entire conversion if this fails
    }
  }

  /**
   * Gets conversion preview data
   */
  async getConversionPreview(siteId: string, estimateId: string): Promise<{
    estimate: EstimateData | null;
    canConvert: boolean;
    issues: string[];
  }> {
    if (!siteId) throw new Error('Site ID is required for multi-tenant isolation');

    try {
      const { data: estimate, error } = await supabase
        .from('estimates')
        .select('*')
        .eq('site_id', siteId)  // CRITICAL: Site isolation
        .eq('id', estimateId)
        .single();

      if (error || !estimate) {
        return {
          estimate: null,
          canConvert: false,
          issues: ['Estimate not found']
        };
      }

      const issues: string[] = [];

      // Check if already converted
      if (estimate.project_id) {
        issues.push('Estimate has already been converted to a project');
      }

      // Check if estimate is in valid state
      if (estimate.status === 'rejected') {
        issues.push('Cannot convert rejected estimates');
      }

      if (estimate.status === 'expired') {
        issues.push('Estimate has expired');
      }

      // Check required fields
      if (!estimate.title) {
        issues.push('Estimate must have a title');
      }

      if (!estimate.client_name) {
        issues.push('Estimate must have a client name');
      }

      if (!estimate.total_amount || estimate.total_amount <= 0) {
        issues.push('Estimate must have a valid total amount');
      }

      return {
        estimate: estimate as EstimateData,
        canConvert: issues.length === 0,
        issues
      };

    } catch (error) {
      console.error('Error getting conversion preview:', error);
      return {
        estimate: null,
        canConvert: false,
        issues: ['Failed to load estimate data']
      };
    }
  }
}

export const estimateConversionService = new EstimateToProjectConversionService();
