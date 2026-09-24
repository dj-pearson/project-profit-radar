/**
 * Projects, cost codes and job costs behind RealTimeJobCosting (US-266).
 *
 * The component kept job costs in state and patched it by hand from realtime
 * events, re-reading an inserted row without checking the error. A failed job
 * cost read toasted and then rendered "$0 total cost" against the full budget,
 * i.e. a project with nothing spent. Reads throw now and the component shows
 * the error in place of the figures. The realtime subscription stays; each
 * event invalidates the query instead of editing a copy of it, so the list and
 * the summary are always one read of the table.
 *
 * Writes are scoped to the company and read back; zero rows throws.
 */
import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { CostCode, CostSummary, JobCost, Project } from '@/components/financial/job-costing/types';

export const jobCostingPickersKey = (companyId: string | undefined) =>
  ['job-costing', companyId, 'pickers'] as const;
export const projectJobCostsKey = (companyId: string | undefined, projectId: string | undefined) =>
  ['job-costing', companyId, 'costs', projectId] as const;

export async function fetchJobCostingPickers(companyId: string): Promise<{ projects: Project[]; costCodes: CostCode[] }> {
  const [projects, costCodes] = await Promise.all([
    supabase
      .from('projects')
      .select('id, name, budget, status')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false }),
    supabase
      .from('cost_codes')
      .select('id, code, name, category')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('code'),
  ]);
  const failed = [projects, costCodes].find((r) => r.error)?.error;
  if (failed) throw failed;
  return {
    projects: (projects.data ?? []) as Project[],
    costCodes: (costCodes.data ?? []) as CostCode[],
  };
}

export async function fetchProjectJobCosts(projectId: string): Promise<JobCost[]> {
  const { data, error } = await supabase
    .from('job_costs')
    .select('*')
    .eq('project_id', projectId)
    .order('date', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as JobCost[];
}

/** Totals from the rows; variance against the project's budget. */
export function summarizeJobCosts(costs: JobCost[], budget: number | null | undefined): CostSummary {
  const totals = costs.reduce(
    (acc, c) => {
      acc.totalCost += Number(c.total_cost) || 0;
      acc.laborCost += Number(c.labor_cost) || 0;
      acc.materialCost += Number(c.material_cost) || 0;
      acc.equipmentCost += Number(c.equipment_cost) || 0;
      acc.otherCost += Number(c.other_cost) || 0;
      return acc;
    },
    { totalCost: 0, laborCost: 0, materialCost: 0, equipmentCost: 0, otherCost: 0 },
  );
  const b = Number(budget) || 0;
  const budgetVariance = b - totals.totalCost;
  return { ...totals, budgetVariance, budgetVariancePercentage: b > 0 ? (budgetVariance / b) * 100 : 0 };
}

export interface JobCostWrite {
  project_id: string;
  cost_code_id: string;
  date: string;
  labor_hours: number;
  labor_cost: number;
  material_cost: number;
  equipment_cost: number;
  other_cost: number;
  description: string | null;
}

export async function insertJobCost(companyId: string, userId: string | undefined, row: JobCostWrite): Promise<void> {
  const { data, error } = await supabase
    .from('job_costs')
    .insert([{ ...row, company_id: companyId, created_by: userId ?? null }])
    .select('id');
  if (error) throw error;
  if (!data || data.length === 0) throw new Error('The cost was not saved.');
}

export async function updateJobCost(companyId: string, id: string, row: JobCostWrite): Promise<void> {
  const { data, error } = await supabase
    .from('job_costs')
    .update(row)
    .eq('id', id)
    .eq('company_id', companyId)
    .select('id');
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('The cost was not updated. It may have been deleted, or you may not have permission.');
  }
}

/**
 * `pickedProjectId` is the project the user chose, if any; with none, the
 * newest project is shown once the list arrives. The resolved id is returned.
 */
export function useRealTimeJobCosting(pickedProjectId: string | undefined) {
  const { user, userProfile } = useAuth();
  const companyId = userProfile?.company_id ?? undefined;
  const userId = user?.id;
  const queryClient = useQueryClient();

  const pickers = useQuery({
    queryKey: jobCostingPickersKey(companyId),
    queryFn: () => fetchJobCostingPickers(companyId as string),
    enabled: !!companyId,
  });
  const projectId = pickedProjectId || pickers.data?.projects[0]?.id || undefined;
  const costs = useQuery({
    queryKey: projectJobCostsKey(companyId, projectId),
    queryFn: () => fetchProjectJobCosts(projectId as string),
    enabled: !!companyId && !!projectId,
  });

  // Any change to this project's job costs, from this screen or anywhere
  // else, re-reads the list.
  useEffect(() => {
    if (!projectId) return;
    const channel = supabase
      .channel(`job-costs-changes-${projectId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'job_costs', filter: `project_id=eq.${projectId}` },
        () => {
          void queryClient.invalidateQueries({ queryKey: projectJobCostsKey(companyId, projectId) });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [projectId, companyId, queryClient]);

  const need = () => {
    if (!companyId) throw new Error('Your profile is not linked to a company.');
    return companyId;
  };
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['job-costing', companyId, 'costs'] });

  const add = useMutation({
    mutationFn: (row: JobCostWrite) => insertJobCost(need(), userId, row),
    onSettled: invalidate,
  });
  const update = useMutation({
    mutationFn: (v: { id: string; row: JobCostWrite }) => updateJobCost(need(), v.id, v.row),
    onSettled: invalidate,
  });

  return { companyId, projectId, pickers, costs, add, update };
}
