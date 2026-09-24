/**
 * Reads and writes behind the estimate form (US-266).
 *
 * EstimateForm read its projects, cost codes, company and the estimate being
 * edited with four unchecked queries. A failed cost-code read left the list
 * empty, and the "every line needs a cost code" check is skipped when there
 * are no codes, so the estimate saved uncoded and failed later at conversion.
 * A failed estimate read opened a blank form that saved over nothing. Every
 * read throws now and the form shows the error; the save reads its line items
 * back and throws when fewer landed than were sent.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { companyCostCodesKey, fetchCompanyCostCodes } from './useProjectCostCodes';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export interface EstimateProjectOption {
  id: string;
  name: string;
  client_name: string | null;
}

export type EstimateWithLines = Tables<'estimates'> & {
  estimate_line_items: Tables<'estimate_line_items'>[] | null;
};

export const estimateProjectsKey = (companyId: string | undefined) =>
  ['estimate-form', companyId, 'projects'] as const;
export const estimateFormKey = (companyId: string | undefined, estimateId: string | undefined) =>
  ['estimate-form', companyId, 'estimate', estimateId] as const;

export async function fetchEstimateProjects(companyId: string): Promise<EstimateProjectOption[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('id, name, client_name')
    .eq('company_id', companyId)
    .eq('status', 'active')
    .order('name');
  if (error) throw error;
  return (data ?? []) as EstimateProjectOption[];
}

export async function fetchEstimateForEdit(companyId: string, estimateId: string): Promise<EstimateWithLines> {
  const { data, error } = await supabase
    .from('estimates')
    .select('*, estimate_line_items(*)')
    .eq('id', estimateId)
    .eq('company_id', companyId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('This estimate was not found, or you do not have access to it.');
  return data as unknown as EstimateWithLines;
}

export interface SaveEstimateInput {
  companyId: string;
  estimateId?: string;
  estimate: TablesUpdate<'estimates'>;
  lines: Omit<TablesInsert<'estimate_line_items'>, 'estimate_id'>[];
}

/**
 * Insert or update the estimate, then replace its line items. The update is
 * scoped to the company and must come back as one row; the line insert must
 * return every row it was sent.
 */
export async function saveEstimate(input: SaveEstimateInput): Promise<Tables<'estimates'>> {
  const { companyId, estimateId, estimate, lines } = input;
  const result = estimateId
    ? await supabase
        .from('estimates')
        .update(estimate)
        .eq('id', estimateId)
        .eq('company_id', companyId)
        .select()
        .maybeSingle()
    : await supabase
        .from('estimates')
        .insert({
          ...(estimate as TablesInsert<'estimates'>),
          company_id: companyId,
          estimate_number: '', // Assigned by trigger
        })
        .select()
        .maybeSingle();
  if (result.error) throw result.error;
  if (!result.data) {
    throw new Error(estimateId ? 'The estimate was not updated. It may have been deleted.' : 'The estimate was not created.');
  }
  const saved = result.data;

  if (estimateId) {
    // The insert below runs regardless, so a silently failed delete would
    // leave the old rows alongside the new ones and double the total on a
    // document the customer sees (US-300).
    const { error: deleteError } = await supabase
      .from('estimate_line_items')
      .delete()
      .eq('estimate_id', estimateId);
    if (deleteError) {
      throw new Error(
        `Could not clear the previous line items (${deleteError.message}). ` +
          'The line items were not saved - saving them now would duplicate every line and double the total.',
      );
    }
  }

  if (lines.length > 0) {
    const { data, error } = await supabase
      .from('estimate_line_items')
      .insert(lines.map((line) => ({ ...line, estimate_id: saved.id })))
      .select('id');
    if (error) throw error;
    if ((data ?? []).length !== lines.length) {
      throw new Error(`Only ${(data ?? []).length} of ${lines.length} line items were saved.`);
    }
  }
  return saved;
}

export type EstimateForPdf = Tables<'estimates'> & {
  line_items: Tables<'estimate_line_items'>[];
  project: { name: string } | null;
};

export async function fetchEstimateForPdf(estimateId: string): Promise<EstimateForPdf> {
  const { data, error } = await supabase
    .from('estimates')
    .select('*, line_items:estimate_line_items(*), project:projects(name)')
    .eq('id', estimateId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('The estimate was not found.');
  return data as unknown as EstimateForPdf;
}

export function useEstimateForm(estimateId?: string) {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id ?? undefined;
  const queryClient = useQueryClient();

  const projects = useQuery({
    queryKey: estimateProjectsKey(companyId),
    queryFn: () => fetchEstimateProjects(companyId as string),
    enabled: !!companyId,
  });
  const costCodes = useQuery({
    queryKey: companyCostCodesKey(companyId),
    queryFn: () => fetchCompanyCostCodes(companyId as string),
    enabled: !!companyId,
  });
  const estimate = useQuery({
    queryKey: estimateFormKey(companyId, estimateId),
    queryFn: () => fetchEstimateForEdit(companyId as string, estimateId as string),
    enabled: !!companyId && !!estimateId,
    // The form is seeded from this once; a background refetch must not
    // overwrite what the user is typing.
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  const save = useMutation({
    mutationFn: (input: Omit<SaveEstimateInput, 'companyId'>) => {
      if (!companyId) throw new Error('Your profile is not linked to a company.');
      return saveEstimate({ ...input, companyId });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['estimates', companyId] });
      void queryClient.invalidateQueries({ queryKey: ['estimate-form', companyId, 'estimate'] });
    },
  });

  return {
    companyId,
    projects: projects.data ?? [],
    costCodes: costCodes.data ?? [],
    estimate: estimate.data,
    readError: (projects.error ?? costCodes.error ?? estimate.error) as Error | null,
    // A form seeded before its cost codes arrive picks no default code.
    pickersLoaded: projects.isSuccess && costCodes.isSuccess,
    retry: () => {
      void projects.refetch();
      void costCodes.refetch();
      if (estimateId) void estimate.refetch();
    },
    save,
  };
}
