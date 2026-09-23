/**
 * The estimates list on /estimates (US-266).
 *
 * EstimatesTable refetched in a useEffect on every keystroke of the search
 * box, although the search was applied client side. The status filter is part
 * of the key now and the search filters the cached rows.
 *
 * Duplicating read the user's company from user_profiles by hand; it takes the
 * company from the auth profile the table already has, and the copy keeps the
 * source's client_id instead of only its free-text name. Delete selects the id
 * back so a delete RLS refused fails instead of announcing "Estimate Deleted".
 * The list is not filtered by company_id here; RLS scopes it, as before.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const estimatesTableKey = (companyId: string | undefined, statusFilter: string) =>
  ['estimates', companyId, 'table', statusFilter] as const;

export async function fetchEstimatesTable<Row>(statusFilter: string): Promise<Row[]> {
  let query = supabase
    .from('estimates')
    .select(`
      *,
      project:projects(id, name)
    `)
    .order('created_at', { ascending: false });
  if (statusFilter !== 'all') query = query.eq('status', statusFilter);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as Row[];
}

/** The fields of the source estimate the copy carries over. */
export interface DuplicateEstimateInput {
  companyId: string;
  source: {
    title: string;
    client_name: string;
    client_id?: string | null;
    total_amount: number;
  };
}

export async function duplicateEstimate(input: DuplicateEstimateInput): Promise<void> {
  const { error } = await supabase
    .from('estimates')
    .insert({
      company_id: input.companyId,
      estimate_number: '', // Will be auto-generated
      title: `${input.source.title} (Copy)`,
      // The copy keeps the customer link as well as the name (US-326).
      client_id: input.source.client_id ?? null,
      client_name: input.source.client_name,
      total_amount: input.source.total_amount,
      status: 'draft' as const,
    })
    .select('id')
    .single();
  if (error) throw error;
}

export async function deleteEstimate(id: string): Promise<void> {
  const { data, error } = await supabase.from('estimates').delete().eq('id', id).select('id');
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('The estimate was not deleted. You may not have permission to delete it.');
  }
}

export function useEstimatesTable<Row>(statusFilter: string) {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id ?? undefined;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: estimatesTableKey(companyId, statusFilter),
    queryFn: () => fetchEstimatesTable<Row>(statusFilter),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['estimates', companyId] });
  const duplicate = useMutation({ mutationFn: duplicateEstimate, onSettled: invalidate });
  const remove = useMutation({ mutationFn: deleteEstimate, onSettled: invalidate });

  return {
    estimates: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
    /** After a write elsewhere (send, convert, edit) the list refetches. */
    invalidate,
    duplicate: duplicate.mutateAsync,
    remove: remove.mutateAsync,
  };
}
