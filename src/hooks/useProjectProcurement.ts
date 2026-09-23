/**
 * Purchase orders and material cost inputs for a project's procurement tab
 * (US-266).
 *
 * Moved out of ProjectProcurement, which only checked the purchase_orders
 * read. A failed line-item or budget read produced a $0 committed / $0 budget
 * summary that looked like a real answer. Every read is checked here and the
 * tab shows the error instead.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { BudgetMeta, CostCodeMeta, PoLineItemInput } from '@/lib/projects/materialCostSummary';

export interface PoRow {
  id: string;
  po_number: string;
  vendor_id: string | null;
  status: string;
  total_amount: number;
  po_date: string | null;
}

export interface ProjectProcurementData {
  pos: PoRow[];
  lineItems: PoLineItemInput[];
  budgets: BudgetMeta[];
  costCodes: CostCodeMeta[];
  vendorNames: Record<string, string>;
}

export const projectProcurementKey = (companyId: string | undefined, projectId: string) =>
  ['project-procurement', companyId, projectId] as const;

export async function fetchProjectProcurement(companyId: string, projectId: string): Promise<ProjectProcurementData> {
  const { data: poData, error: poErr } = await supabase
    .from('purchase_orders')
    .select('id, po_number, vendor_id, status, total_amount, po_date')
    .eq('project_id', projectId);
  if (poErr) throw poErr;
  const pos = (poData ?? []) as PoRow[];
  const poIds = pos.map((p) => p.id);
  const statusById = new Map(pos.map((p) => [p.id, p.status]));

  const [liRes, budgetRes, ccRes, vendorRes] = await Promise.all([
    poIds.length
      ? supabase.from('purchase_order_line_items').select('purchase_order_id, cost_code_id, total_price').in('purchase_order_id', poIds)
      : Promise.resolve({
          data: [] as Array<{ purchase_order_id: string; cost_code_id: string | null; total_price: number | null }>,
          error: null,
        }),
    supabase.from('project_budgets').select('cost_code_id, material_budget, budgeted_amount').eq('project_id', projectId),
    supabase.from('cost_codes').select('id, code, name').eq('company_id', companyId),
    supabase.from('vendors').select('id, name').eq('company_id', companyId),
  ]);
  for (const res of [liRes, budgetRes, ccRes, vendorRes]) {
    if (res.error) throw res.error;
  }

  return {
    pos,
    lineItems: (liRes.data ?? []).map((li) => ({
      cost_code_id: li.cost_code_id,
      amount: li.total_price ?? 0,
      status: statusById.get(li.purchase_order_id) ?? null,
    })),
    budgets: (budgetRes.data ?? []) as BudgetMeta[],
    costCodes: (ccRes.data ?? []) as CostCodeMeta[],
    vendorNames: Object.fromEntries(
      ((vendorRes.data ?? []) as { id: string; name: string }[]).map((v) => [v.id, v.name])
    ),
  };
}

export function useProjectProcurement(projectId: string) {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id ?? undefined;
  return useQuery({
    queryKey: projectProcurementKey(companyId, projectId),
    queryFn: () => fetchProjectProcurement(companyId as string, projectId),
    enabled: !!companyId && !!projectId,
  });
}
