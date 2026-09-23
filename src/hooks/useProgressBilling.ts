/**
 * Reads and writes behind the Progress billing tab (US-266, US-327).
 *
 * ProgressBillingManager read projects and the schedule of values in
 * useEffects. A failed SOV read toasted and then showed "Build from the
 * project budget", which on a job that already has an SOV seeds a second one.
 * The read throws now and the tab shows the error instead of that offer.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { SovLine } from '@/lib/progressBilling';
import { invoicesKey } from '@/hooks/useInvoiceList';
import { insertInvoiceWithLines } from '@/hooks/invoiceWithLines';

export interface ProgressProjectRow {
  id: string;
  name: string;
  client_id: string | null;
  client_name: string | null;
  client_email: string | null;
  current_contract_value: number | null;
  original_contract_value: number | null;
  budget: number | null;
  retainage_percentage: number | null;
}

export interface SovStatusRow extends SovLine {
  project_id: string;
  percent_billed: number;
  remaining_to_bill: number;
  sort_order: number;
}

export const progressProjectsKey = (companyId: string | undefined) =>
  ['projects', companyId, 'progress-billing'] as const;
export const projectSovKey = (companyId: string | undefined, projectId: string) =>
  ['project-sov', companyId, projectId] as const;

export async function fetchProgressProjects(companyId: string): Promise<ProgressProjectRow[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('id, name, client_id, client_name, client_email, current_contract_value, original_contract_value, budget, retainage_percentage')
    .eq('company_id', companyId)
    .in('status', ['active', 'planning'])
    .order('name');
  if (error) throw error;
  return (data ?? []) as ProgressProjectRow[];
}

export async function fetchProjectSov(projectId: string): Promise<SovStatusRow[]> {
  const { data, error } = await supabase
    .from('project_sov_status')
    .select('sov_line_id, project_id, description, scheduled_value, previously_billed, percent_billed, remaining_to_bill, cost_code_id, line_number, sort_order')
    .eq('project_id', projectId)
    .order('sort_order');
  if (error) throw error;
  return (data ?? []) as SovStatusRow[];
}

/** Returns the number of SOV lines the RPC created from the project budget. */
export async function seedProjectSov(projectId: string): Promise<number> {
  const { data, error } = await supabase.rpc('seed_project_sov', { p_project_id: projectId });
  if (error) throw error;
  return Number(data ?? 0);
}

const NO_PROJECTS: ProgressProjectRow[] = [];
const NO_LINES: SovStatusRow[] = [];

export function useProgressBilling(selectedProjectId: string) {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id ?? undefined;
  const queryClient = useQueryClient();

  const projects = useQuery({
    queryKey: progressProjectsKey(companyId),
    queryFn: () => fetchProgressProjects(companyId as string),
    enabled: !!companyId,
  });
  const sov = useQuery({
    queryKey: projectSovKey(companyId, selectedProjectId),
    queryFn: () => fetchProjectSov(selectedProjectId),
    enabled: !!companyId && !!selectedProjectId,
  });

  const invalidateSov = () => queryClient.invalidateQueries({ queryKey: ['project-sov', companyId] });

  const seed = useMutation({ mutationFn: seedProjectSov, onSettled: invalidateSov });
  const createInvoice = useMutation({
    mutationFn: ({ header, lines }: {
      header: Record<string, unknown>;
      lines: (invoiceId: string) => Record<string, unknown>[];
    }) => insertInvoiceWithLines(header, lines),
    onSettled: () => {
      void invalidateSov();
      void queryClient.invalidateQueries({ queryKey: invoicesKey(companyId) });
    },
  });

  return {
    projects: projects.data ?? NO_PROJECTS,
    projectsError: projects.error as Error | null,
    refetchProjects: projects.refetch,
    sovLines: sov.data ?? NO_LINES,
    loadingSov: sov.isLoading && !!selectedProjectId,
    sovError: sov.error as Error | null,
    refetchSov: sov.refetch,
    seed,
    createInvoice,
  };
}
