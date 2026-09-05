/**
 * Estimate to Project Conversion Service (US-318)
 *
 * This is the hop the whole product turns on: an accepted estimate becomes a
 * job with a budget by cost code, and that budget is what every budget-vs-actual,
 * WIP and procurement screen compares against. It had never once completed.
 *
 * Three independent failures, and the dialog reported success over all of them:
 *
 *   1. The project insert sent `location`, `estimated_end_date` and
 *      `created_from_estimate_id`. The projects table has `site_address`,
 *      `end_date` and `created_from`; `created_from_estimate_id` appears in no
 *      migration at all. PostgREST rejects unknown columns, so every conversion
 *      returned "Failed to create project".
 *   2. Line items were read as `estimate.line_items` off a plain
 *      `select('*')` on estimates. Line items are a child table, not a column,
 *      so the array was always undefined and the transfer step never ran.
 *   3. The transfer wrote `company_id`, `cost_code` (text), `budgeted_amount`,
 *      `cost_type` and `unit` into job_costs, whose real shape is
 *      `project_id, cost_code_id, labor_cost, material_cost, equipment_cost,
 *      other_cost, date`. Every field was wrong, and the error was swallowed.
 *
 * And nothing anywhere inserted `project_budgets`, which is the table the
 * budget dashboards read. It is written here now, which is the point of the
 * story: job_costs holds ACTUALS and is not written at conversion time - an
 * estimate is a plan, and posting it as incurred cost would make every job
 * start out 100% spent.
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
  notes?: string;
  valid_until?: string;
}

export interface ProjectConversionData {
  name: string;
  client_name: string;
  budget: number;
  description?: string;
  /** Maps to projects.site_address. */
  location?: string;
  start_date: string;
  /** Maps to projects.end_date. */
  estimated_end_date?: string;
  status: string;
}

export interface ConversionResult {
  success: boolean;
  projectId?: string;
  error?: string;
  /** How many project_budgets rows were created, and what they total. */
  budgetLinesCreated?: number;
  budgetTotal?: number;
  /**
   * Line items that carried no cost code and so could not become a budget
   * line. Reported rather than silently dropped.
   */
  uncodedLineItems?: number;
}

interface EstimateLineItem {
  id: string;
  item_name: string;
  description: string | null;
  quantity: number;
  unit: string;
  unit_cost: number;
  cost_code_id: string | null;
  category: string | null;
  labor_cost: number | null;
  material_cost: number | null;
  equipment_cost: number | null;
  total_cost: number | null;
}

/** A line's contribution to the budget, preferring the stored total. */
function lineTotal(item: EstimateLineItem): number {
  if (typeof item.total_cost === 'number' && item.total_cost > 0) return item.total_cost;
  return (item.quantity || 0) * (item.unit_cost || 0);
}

class EstimateToProjectConversionService {
  /**
   * Converts an accepted estimate into a project with a cost-coded budget.
   */
  async convertEstimateToProject(
    estimateId: string,
    companyId: string,
    customizations?: Partial<ProjectConversionData>
  ): Promise<ConversionResult> {
    try {
      const { data: estimate, error: estimateError } = await supabase
        .from('estimates')
        .select('*')
        .eq('id', estimateId)
        .single();

      if (estimateError || !estimate) {
        return { success: false, error: 'Failed to fetch estimate details' };
      }

      if (estimate.project_id) {
        return {
          success: false,
          error: 'This estimate has already been converted to a project',
        };
      }

      // Line items are a child table. Reading them off the estimate row was
      // failure (2) above.
      const { data: lineItemRows, error: lineItemsError } = await supabase
        .from('estimate_line_items')
        .select('*')
        .eq('estimate_id', estimateId)
        .order('sort_order', { ascending: true });

      if (lineItemsError) {
        return {
          success: false,
          error: `Could not read the estimate's line items: ${lineItemsError.message}`,
        };
      }

      const lineItems = (lineItemRows || []) as unknown as EstimateLineItem[];

      // Only columns projects actually has. `created_from` records the
      // provenance the old code tried to put in `created_from_estimate_id`;
      // site_id is filled by the trigger from US-317.
      const projectData = {
        company_id: companyId,
        name: customizations?.name || estimate.title,
        client_name: estimate.client_name,
        client_email: estimate.client_email,
        description: customizations?.description || estimate.description || '',
        site_address: customizations?.location || estimate.site_address || null,
        budget: customizations?.budget ?? estimate.total_amount,
        total_budget: customizations?.budget ?? estimate.total_amount,
        status: customizations?.status || 'planning',
        start_date: customizations?.start_date || new Date().toISOString().split('T')[0],
        end_date: customizations?.estimated_end_date || null,
        created_from: `estimate:${estimateId}`,
      };

      const { data: newProject, error: projectError } = await supabase
        .from('projects')
        .insert(projectData)
        .select()
        .single();

      if (projectError || !newProject) {
        return {
          success: false,
          error: projectError
            ? `Could not create the project: ${projectError.message}`
            : 'Could not create the project',
        };
      }

      // Seed the budget, one row per cost code, which is the grain
      // project_budgets uses and the grain job costing later compares against.
      const { budgetLinesCreated, budgetTotal, uncodedLineItems, budgetError } =
        await this.seedProjectBudget(lineItems, newProject.id);

      if (budgetError) {
        // The project exists. Say what did not come across rather than
        // pretending the whole conversion failed or that it fully worked.
        return {
          success: true,
          projectId: newProject.id,
          budgetLinesCreated: 0,
          budgetTotal: 0,
          uncodedLineItems,
          error: `The project was created, but its budget was not: ${budgetError}`,
        };
      }

      const { error: updateError } = await supabase
        .from('estimates')
        .update({
          project_id: newProject.id,
          status: 'accepted',
          accepted_date: new Date().toISOString(),
        })
        .eq('id', estimateId);

      if (updateError) {
        // Not fatal, but it means the estimate can be converted again and
        // produce a second project, so it must not pass unmentioned.
        return {
          success: true,
          projectId: newProject.id,
          budgetLinesCreated,
          budgetTotal,
          uncodedLineItems,
          error:
            'The project and its budget were created, but the estimate could not be ' +
            'marked as converted. Check it before converting again.',
        };
      }

      return {
        success: true,
        projectId: newProject.id,
        budgetLinesCreated,
        budgetTotal,
        uncodedLineItems,
      };
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      };
    }
  }

  /**
   * Groups the estimate's lines by cost code and writes project_budgets.
   *
   * The per-discipline columns (labor/material/equipment) are filled from the
   * line's own split where the estimator gave one, so budget vs actual can
   * compare like with like once US-321 and US-322 start posting real costs.
   * Where a line carries only a unit cost, the whole amount lands in
   * budgeted_amount and the splits stay null rather than being invented.
   */
  private async seedProjectBudget(
    lineItems: EstimateLineItem[],
    projectId: string
  ): Promise<{
    budgetLinesCreated: number;
    budgetTotal: number;
    uncodedLineItems: number;
    budgetError?: string;
  }> {
    const coded = lineItems.filter((i) => i.cost_code_id);
    const uncodedLineItems = lineItems.length - coded.length;

    if (coded.length === 0) {
      return { budgetLinesCreated: 0, budgetTotal: 0, uncodedLineItems };
    }

    const byCostCode = new Map<string, {
      budgeted_amount: number;
      labor_budget: number;
      material_budget: number;
      equipment_budget: number;
      names: string[];
    }>();

    for (const item of coded) {
      const key = item.cost_code_id as string;
      const bucket = byCostCode.get(key) || {
        budgeted_amount: 0,
        labor_budget: 0,
        material_budget: 0,
        equipment_budget: 0,
        names: [],
      };
      bucket.budgeted_amount += lineTotal(item);
      bucket.labor_budget += item.labor_cost || 0;
      bucket.material_budget += item.material_cost || 0;
      bucket.equipment_budget += item.equipment_cost || 0;
      if (item.item_name) bucket.names.push(item.item_name);
      byCostCode.set(key, bucket);
    }

    const rows = Array.from(byCostCode.entries()).map(([cost_code_id, b]) => ({
      project_id: projectId,
      cost_code_id,
      budgeted_amount: Number(b.budgeted_amount.toFixed(2)),
      labor_budget: b.labor_budget > 0 ? Number(b.labor_budget.toFixed(2)) : null,
      material_budget: b.material_budget > 0 ? Number(b.material_budget.toFixed(2)) : null,
      equipment_budget: b.equipment_budget > 0 ? Number(b.equipment_budget.toFixed(2)) : null,
      notes: `From estimate: ${b.names.slice(0, 5).join(', ')}${b.names.length > 5 ? ` and ${b.names.length - 5} more` : ''}`,
    }));

    const { error } = await supabase.from('project_budgets').insert(rows);

    if (error) {
      return {
        budgetLinesCreated: 0,
        budgetTotal: 0,
        uncodedLineItems,
        budgetError: error.message,
      };
    }

    return {
      budgetLinesCreated: rows.length,
      budgetTotal: rows.reduce((sum, r) => sum + r.budgeted_amount, 0),
      uncodedLineItems,
    };
  }

  /**
   * Gets conversion preview data, including whether the estimate's lines can
   * actually become a budget.
   */
  async getConversionPreview(estimateId: string): Promise<{
    estimate: EstimateData | null;
    canConvert: boolean;
    issues: string[];
    warnings: string[];
    lineItemCount: number;
    codedLineItemCount: number;
  }> {
    const empty = {
      estimate: null,
      canConvert: false,
      issues: ['Estimate not found'],
      warnings: [],
      lineItemCount: 0,
      codedLineItemCount: 0,
    };

    try {
      const { data: estimate, error } = await supabase
        .from('estimates')
        .select('*')
        .eq('id', estimateId)
        .single();

      if (error || !estimate) return empty;

      const { data: lineItemRows } = await supabase
        .from('estimate_line_items')
        .select('id, cost_code_id')
        .eq('estimate_id', estimateId);

      const lineItemCount = lineItemRows?.length || 0;
      const codedLineItemCount = (lineItemRows || []).filter((i) => i.cost_code_id).length;

      const issues: string[] = [];
      const warnings: string[] = [];

      if (estimate.project_id) issues.push('Estimate has already been converted to a project');
      if (estimate.status === 'rejected') issues.push('Cannot convert rejected estimates');
      if (estimate.status === 'expired') issues.push('Estimate has expired');
      if (!estimate.title) issues.push('Estimate must have a title');
      if (!estimate.client_name) issues.push('Estimate must have a client name');
      if (!estimate.total_amount || estimate.total_amount <= 0) {
        issues.push('Estimate must have a valid total amount');
      }

      // Warnings, not blockers: a project with no budget is still a project,
      // and refusing to create one would be worse than saying what is missing.
      if (lineItemCount === 0) {
        warnings.push('This estimate has no line items, so the project will start with no budget.');
      } else if (codedLineItemCount === 0) {
        warnings.push(
          'None of the line items carry a cost code, so no budget lines can be created. ' +
          'Add cost codes on the estimate first.'
        );
      } else if (codedLineItemCount < lineItemCount) {
        warnings.push(
          `${lineItemCount - codedLineItemCount} of ${lineItemCount} line items have no cost code ` +
          'and will not appear in the budget.'
        );
      }

      return {
        estimate: estimate as unknown as EstimateData,
        canConvert: issues.length === 0,
        issues,
        warnings,
        lineItemCount,
        codedLineItemCount,
      };
    } catch {
      return { ...empty, issues: ['Failed to load estimate data'] };
    }
  }
}

export const estimateConversionService = new EstimateToProjectConversionService();
