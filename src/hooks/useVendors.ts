/**
 * Vendor directory reads and writes for /vendors (US-266).
 *
 * The key is ['vendors', companyId, 'directory']: AccountsPayable and
 * BillPayments cache a narrower select under ['vendors', companyId,
 * 'payables'] (useAccountingPages), and sharing a key would hand one screen
 * the other's rows. Invalidation uses the two-part prefix so a vendor added
 * here also refreshes the payables pickers.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Vendor {
  id: string;
  name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  payment_terms: string;
  is_active: boolean;
  notes: string | null;
}

export interface VendorInput {
  name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  payment_terms: string;
  notes: string | null;
}

export const vendorsKey = (companyId: string | undefined) => ['vendors', companyId] as const;
export const vendorDirectoryKey = (companyId: string | undefined) =>
  [...vendorsKey(companyId), 'directory'] as const;

export async function fetchVendors(companyId: string): Promise<Vendor[]> {
  const { data, error } = await supabase
    .from('vendors')
    .select('*')
    .eq('company_id', companyId)
    .order('name');
  if (error) throw error;
  return (data ?? []) as Vendor[];
}

export async function createVendor(companyId: string, userId: string | undefined, input: VendorInput): Promise<void> {
  const { error } = await supabase
    .from('vendors')
    .insert({ ...input, company_id: companyId, created_by: userId ?? null });
  if (error) throw error;
}

/** `.select('id')` so an update RLS filtered to zero rows fails instead of reporting success. */
export async function updateVendor(id: string, patch: Partial<VendorInput> & { is_active?: boolean }): Promise<void> {
  const { data, error } = await supabase.from('vendors').update(patch).eq('id', id).select('id');
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('That change was not saved. You may not have permission to edit vendors.');
  }
}

export async function deleteVendor(id: string): Promise<void> {
  const { data, error } = await supabase.from('vendors').delete().eq('id', id).select('id');
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('That vendor was not deleted. You may not have permission to delete vendors.');
  }
}

export function useVendors() {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id ?? undefined;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: vendorDirectoryKey(companyId),
    queryFn: () => fetchVendors(companyId as string),
    enabled: !!companyId,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: vendorsKey(companyId) });

  const requireCompany = () => {
    if (!companyId) throw new Error('Your account is not linked to a company, so there is nowhere to save this.');
    return companyId;
  };

  const create = useMutation({
    mutationFn: (input: VendorInput) => createVendor(requireCompany(), userProfile?.id, input),
    onSettled: invalidate,
  });

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<VendorInput> & { is_active?: boolean } }) =>
      updateVendor(id, patch),
    onSettled: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteVendor(id),
    onSettled: invalidate,
  });

  return {
    vendors: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
    create,
    update,
    remove,
  };
}
