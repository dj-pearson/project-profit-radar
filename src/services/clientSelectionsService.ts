import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { logAuditEvent } from '@/services/auditService';
import {
  computeOverAllowanceDelta,
  type SelectionBoardRow,
  type SelectionCategory,
  type SelectionOption,
  type ClientSelection,
} from '@/lib/client-selections';

/**
 * US-226: persistence for client selections + the financial automation that
 * fires when a builder approves an over-allowance pick (change order + budget).
 *
 * All reads/writes are company_id-scoped for site isolation (in addition to
 * RLS). Approvals are audit-logged.
 */

/**
 * Load the selection board for a project: every category with its options and
 * the client's current selection (if any).
 */
export async function fetchSelectionBoard(
  projectId: string,
  companyId?: string | null
): Promise<SelectionBoardRow[]> {
  if (!companyId) return [];

  const [categoriesRes, optionsRes, selectionsRes] = await Promise.all([
    supabase
      .from('selection_categories')
      .select('*')
      .eq('company_id', companyId)
      .eq('project_id', projectId)
      .order('created_at', { ascending: true }),
    supabase
      .from('selection_options')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: true }),
    supabase
      .from('client_selections')
      .select('*')
      .eq('company_id', companyId)
      .eq('project_id', projectId),
  ]);

  if (categoriesRes.error) throw new Error(categoriesRes.error.message);
  if (optionsRes.error) throw new Error(optionsRes.error.message);
  if (selectionsRes.error) throw new Error(selectionsRes.error.message);

  const categories = (categoriesRes.data ?? []) as unknown as SelectionCategory[];
  const options = (optionsRes.data ?? []) as unknown as SelectionOption[];
  const selections = (selectionsRes.data ?? []) as unknown as ClientSelection[];

  const optionsByCategory = new Map<string, SelectionOption[]>();
  for (const opt of options) {
    const list = optionsByCategory.get(opt.category_id) ?? [];
    list.push(opt);
    optionsByCategory.set(opt.category_id, list);
  }
  const selectionByCategory = new Map<string, ClientSelection>();
  for (const sel of selections) selectionByCategory.set(sel.category_id, sel);

  return categories.map((category) => ({
    category,
    options: optionsByCategory.get(category.id) ?? [],
    selection: selectionByCategory.get(category.id) ?? null,
  }));
}

// ---- Builder configuration (admin / project_manager) ----

export async function createCategory(params: {
  companyId: string;
  projectId: string;
  name: string;
  description?: string | null;
  allowance: number;
}): Promise<void> {
  const { error } = await supabase.from('selection_categories').insert([
    {
      company_id: params.companyId,
      project_id: params.projectId,
      name: params.name,
      description: params.description ?? null,
      allowance: params.allowance,
    },
  ]);
  if (error) throw new Error(error.message);
}

export async function deleteCategory(id: string, companyId: string): Promise<void> {
  const { error } = await supabase
    .from('selection_categories')
    .delete()
    .eq('id', id)
    .eq('company_id', companyId);
  if (error) throw new Error(error.message);
}

export async function createOption(params: {
  companyId: string;
  categoryId: string;
  name: string;
  description?: string | null;
  price: number;
  supplier?: string | null;
}): Promise<void> {
  const { error } = await supabase.from('selection_options').insert([
    {
      company_id: params.companyId,
      category_id: params.categoryId,
      name: params.name,
      description: params.description ?? null,
      price: params.price,
      supplier: params.supplier ?? null,
    },
  ]);
  if (error) throw new Error(error.message);
}

export async function deleteOption(id: string, companyId: string): Promise<void> {
  const { error } = await supabase
    .from('selection_options')
    .delete()
    .eq('id', id)
    .eq('company_id', companyId);
  if (error) throw new Error(error.message);
}

// ---- Client choice ----

/**
 * Record a client's chosen option for a category (status: pending). Upserts on
 * (project_id, category_id) so re-picking replaces the prior pending choice and
 * recomputes the delta. The over-allowance delta is derived server-trustably
 * from the category allowance and the option price, never sent by the client.
 */
export async function chooseOption(params: {
  companyId: string;
  projectId: string;
  category: SelectionCategory;
  option: SelectionOption;
  userId?: string | null;
}): Promise<void> {
  const delta = computeOverAllowanceDelta(params.category.allowance, params.option.price);
  const { error } = await supabase.from('client_selections').upsert(
    [
      {
        company_id: params.companyId,
        project_id: params.projectId,
        category_id: params.category.id,
        option_id: params.option.id,
        status: 'pending',
        delta_amount: delta,
        change_order_id: null,
        approved_by: null,
        approved_at: null,
        selected_by: params.userId ?? null,
      },
    ],
    { onConflict: 'project_id,category_id' }
  );
  if (error) throw new Error(error.message);
}

// ---- Builder approval / rejection ----

/**
 * Approve a client's selection. For an over-allowance pick this generates a
 * change order for the delta (via the change-orders edge function, which owns
 * numbering + site scoping) and bumps the project's total budget. Audit-logged.
 */
export async function approveSelection(params: {
  companyId: string;
  selection: ClientSelection;
  category: SelectionCategory;
  option: SelectionOption;
  userId: string;
}): Promise<void> {
  const { companyId, selection, category, option, userId } = params;
  const delta = computeOverAllowanceDelta(category.allowance, option.price);
  let changeOrderId: string | null = null;

  if (delta > 0) {
    // Generate the change order for the over-allowance amount.
    const { data, error } = await supabase.functions.invoke('change-orders', {
      body: {
        action: 'create',
        project_id: selection.project_id,
        title: `Selection: ${category.name} — ${option.name}`,
        description: `Client selected "${option.name}" for ${category.name}, exceeding the $${category.allowance.toLocaleString()} allowance by $${delta.toLocaleString()}.`,
        amount: delta,
        reason: 'client_selection',
      },
    });
    if (error) throw new Error(error.message);
    const payload = data as { data?: { changeOrder?: { id?: string } } } | null;
    changeOrderId = payload?.data?.changeOrder?.id ?? null;

    // Bump the project's total budget by the approved delta.
    const { data: project } = await supabase
      .from('projects')
      .select('budget, total_budget')
      .eq('id', selection.project_id)
      .eq('company_id', companyId)
      .single();
    const current = project?.total_budget ?? project?.budget ?? 0;
    const { error: budgetError } = await supabase
      .from('projects')
      .update({ total_budget: current + delta })
      .eq('id', selection.project_id)
      .eq('company_id', companyId);
    if (budgetError) throw new Error(budgetError.message);
  }

  const { error: updateError } = await supabase
    .from('client_selections')
    .update({
      status: 'approved',
      delta_amount: delta,
      change_order_id: changeOrderId,
      approved_by: userId,
      approved_at: new Date().toISOString(),
    })
    .eq('id', selection.id)
    .eq('company_id', companyId);
  if (updateError) throw new Error(updateError.message);

  try {
    await logAuditEvent({
      userId,
      companyId,
      actionType: 'approve',
      resourceType: 'client_selection',
      resourceId: selection.id,
      resourceName: `${category.name}: ${option.name}`,
      newValues: { status: 'approved', delta_amount: delta, change_order_id: changeOrderId },
      riskLevel: delta > 0 ? 'medium' : 'low',
      complianceCategory: 'financial',
      description:
        delta > 0
          ? `Approved over-allowance selection; generated change order for $${delta.toLocaleString()}.`
          : 'Approved within-allowance selection.',
    });
  } catch (err) {
    logger.error('Failed to audit-log selection approval', err as Error);
  }
}

/** Reject a client's selection (no financial side effects). Audit-logged. */
export async function rejectSelection(params: {
  companyId: string;
  selection: ClientSelection;
  category: SelectionCategory;
  option: SelectionOption;
  userId: string;
}): Promise<void> {
  const { companyId, selection, category, option, userId } = params;
  const { error } = await supabase
    .from('client_selections')
    .update({ status: 'rejected', approved_by: userId, approved_at: new Date().toISOString() })
    .eq('id', selection.id)
    .eq('company_id', companyId);
  if (error) throw new Error(error.message);

  try {
    await logAuditEvent({
      userId,
      companyId,
      actionType: 'reject',
      resourceType: 'client_selection',
      resourceId: selection.id,
      resourceName: `${category.name}: ${option.name}`,
      newValues: { status: 'rejected' },
      riskLevel: 'low',
      complianceCategory: 'financial',
      description: 'Rejected client selection.',
    });
  } catch (err) {
    logger.error('Failed to audit-log selection rejection', err as Error);
  }
}
