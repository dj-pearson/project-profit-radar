/**
 * Data behind the WIP / earned-value / cost-to-complete report (US-224, US-266).
 *
 * This query lived inline in WipReport and checked only the projects read; a
 * failed job-cost, budget, invoice, change-order or cost-code read came back
 * as no rows, so the schedule showed zero cost to date, full underbilling and
 * a healthy margin. Every read throws now and the report shows the error.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  buildWipSchedule,
  netApprovedChangeOrders,
  type WipProjectInput,
  type CostCodeForecastInput,
} from '@/lib/projects/wipReport';

interface ProjectRow {
  id: string;
  name: string;
  budget: number | null;
  total_budget: number | null;
  start_date: string | null;
  end_date: string | null;
  completion_percentage: number | null;
}
interface JobCostRow {
  project_id: string;
  cost_code_id: string | null;
  total_cost: number | null;
}
interface BudgetRow {
  project_id: string;
  cost_code_id: string;
  budgeted_amount: number | null;
}
interface InvoiceRow {
  project_id: string | null;
  total_amount: number | null;
}
interface ChangeOrderRow {
  project_id: string;
  amount: number | null;
  status: string | null;
  client_approved: boolean | null;
}
interface CostCodeRow {
  id: string;
  code: string;
  name: string;
}

export interface WipDataset {
  schedule: ReturnType<typeof buildWipSchedule>;
  costCodesByProject: Map<string, CostCodeForecastInput[]>;
  contractByProject: Map<string, number>;
  projectNames: Map<string, string>;
}

export const wipReportKey = (companyId: string | undefined, projectId?: string) =>
  ['wip-report', companyId, projectId ?? 'company'] as const;

export async function fetchWipReport(companyId: string, projectId?: string): Promise<WipDataset> {
  let projectsQuery = supabase
    .from('projects')
    .select('id, name, budget, total_budget, start_date, end_date, completion_percentage')
    .eq('company_id', companyId);
  if (projectId) projectsQuery = projectsQuery.eq('id', projectId);

  const [projectsRes, jobCostsRes, budgetsRes, invoicesRes, changeOrdersRes, costCodesRes] =
    await Promise.all([
      projectsQuery,
      supabase
        .from('job_costs')
        .select('project_id, cost_code_id, total_cost')
        .eq('company_id', companyId),
      supabase
        .from('project_budgets')
        .select('project_id, cost_code_id, budgeted_amount'),
      supabase
        .from('invoices')
        .select('project_id, total_amount')
        .eq('company_id', companyId),
      supabase
        .from('change_orders')
        .select('project_id, amount, status, client_approved')
        .eq('company_id', companyId),
      supabase
        .from('cost_codes')
        .select('id, code, name')
        .eq('company_id', companyId),
    ]);

  // Every read is checked: a failed job-cost or invoice read would
  // otherwise report zero cost or zero billed, and the schedule would show
  // underbilling or profit that is not there.
  const failed = [projectsRes, jobCostsRes, budgetsRes, invoicesRes, changeOrdersRes, costCodesRes]
    .find((r) => r.error)?.error;
  if (failed) throw failed;

  const projects = (projectsRes.data ?? []) as ProjectRow[];
  const projectIds = new Set(projects.map((p) => p.id));
  const jobCosts = ((jobCostsRes.data ?? []) as JobCostRow[]).filter((j) => projectIds.has(j.project_id));
  const budgets = ((budgetsRes.data ?? []) as BudgetRow[]).filter((b) => projectIds.has(b.project_id));
  const invoices = ((invoicesRes.data ?? []) as InvoiceRow[]).filter(
    (i) => i.project_id != null && projectIds.has(i.project_id)
  );
  const changeOrders = ((changeOrdersRes.data ?? []) as ChangeOrderRow[]).filter((c) =>
    projectIds.has(c.project_id)
  );
  const costCodeMeta = new Map(
    ((costCodesRes.data ?? []) as CostCodeRow[]).map((c) => [c.id, c])
  );

  // Aggregate per project.
  const actualByProject = new Map<string, number>();
  const costByProjectCode = new Map<string, Map<string, number>>(); // project -> cost_code -> actual
  for (const j of jobCosts) {
    const amt = Number(j.total_cost) || 0;
    actualByProject.set(j.project_id, (actualByProject.get(j.project_id) ?? 0) + amt);
    const codeKey = j.cost_code_id ?? '__uncoded__';
    const inner = costByProjectCode.get(j.project_id) ?? new Map<string, number>();
    inner.set(codeKey, (inner.get(codeKey) ?? 0) + amt);
    costByProjectCode.set(j.project_id, inner);
  }

  const estCostByProject = new Map<string, number>();
  const budgetByProjectCode = new Map<string, Map<string, number>>();
  for (const b of budgets) {
    const amt = Number(b.budgeted_amount) || 0;
    estCostByProject.set(b.project_id, (estCostByProject.get(b.project_id) ?? 0) + amt);
    const inner = budgetByProjectCode.get(b.project_id) ?? new Map<string, number>();
    inner.set(b.cost_code_id, (inner.get(b.cost_code_id) ?? 0) + amt);
    budgetByProjectCode.set(b.project_id, inner);
  }

  const billedByProject = new Map<string, number>();
  for (const i of invoices) {
    if (i.project_id == null) continue;
    billedByProject.set(
      i.project_id,
      (billedByProject.get(i.project_id) ?? 0) + (Number(i.total_amount) || 0)
    );
  }

  const coByProject = new Map<string, ChangeOrderRow[]>();
  for (const c of changeOrders) {
    const arr = coByProject.get(c.project_id) ?? [];
    arr.push(c);
    coByProject.set(c.project_id, arr);
  }

  const inputs: WipProjectInput[] = projects.map((p) => {
    const baseContract = Number(p.budget) || 0;
    const estCost = estCostByProject.get(p.id) ?? (Number(p.total_budget) || 0);
    return {
      projectId: p.id,
      name: p.name,
      contractAmount: baseContract,
      approvedChangeOrders: netApprovedChangeOrders(coByProject.get(p.id) ?? []),
      estimatedTotalCost: estCost,
      actualCostToDate: actualByProject.get(p.id) ?? 0,
      billedToDate: billedByProject.get(p.id) ?? 0,
      startDate: p.start_date,
      endDate: p.end_date,
      manualPercentComplete:
        estCost > 0 ? null : (p.completion_percentage ?? null),
    };
  });

  const schedule = buildWipSchedule(inputs);

  // Per-project cost-code forecast inputs.
  const costCodesByProject = new Map<string, CostCodeForecastInput[]>();
  const contractByProject = new Map<string, number>();
  const projectNames = new Map<string, string>();
  for (const row of schedule.rows) {
    contractByProject.set(row.projectId, row.contractAmount);
    projectNames.set(row.projectId, row.name);
  }
  for (const p of projects) {
    const budgetCodes = budgetByProjectCode.get(p.id) ?? new Map();
    const actualCodes = costByProjectCode.get(p.id) ?? new Map();
    const allCodeKeys = new Set<string>([...budgetCodes.keys(), ...actualCodes.keys()]);
    const rows: CostCodeForecastInput[] = Array.from(allCodeKeys).map((key) => {
      const meta = key === '__uncoded__' ? null : costCodeMeta.get(key);
      return {
        costCodeId: key === '__uncoded__' ? null : key,
        code: meta?.code ?? '--',
        name: meta?.name ?? (key === '__uncoded__' ? 'Uncoded' : 'Unknown cost code'),
        budgetedCost: budgetCodes.get(key) ?? 0,
        actualCost: actualCodes.get(key) ?? 0,
      };
    });
    costCodesByProject.set(p.id, rows);
  }

  return { schedule, costCodesByProject, contractByProject, projectNames };
}

export function useWipReport(projectId?: string) {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id ?? undefined;
  return useQuery<WipDataset>({
    queryKey: wipReportKey(companyId, projectId),
    queryFn: () => fetchWipReport(companyId as string, projectId),
    enabled: !!companyId,
  });
}
