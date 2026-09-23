/**
 * The /invoices list and its bulk actions (US-266).
 *
 * Invoices.tsx loaded this with useState + useEffect and InvoiceList wrote
 * bulk status changes and deletes straight to supabase, then asked the page to
 * reload through a callback. One query key now owns the list, and the bulk
 * mutations invalidate it, so any other screen keyed under ['invoices',
 * companyId] refreshes too.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- the page and InvoiceList take untyped rows today
export type InvoiceListRow = any;

export const invoicesKey = (companyId: string | undefined) => ['invoices', companyId] as const;
export const invoiceListKey = (companyId: string | undefined) => [...invoicesKey(companyId), 'list'] as const;

export async function fetchInvoiceList(companyId: string): Promise<InvoiceListRow[]> {
  const { data, error } = await supabase
    .from('invoices')
    .select(`
      *,
      projects(name),
      invoice_payments(payment_amount, payment_date)
    `)
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/**
 * Returns how many rows actually changed. RLS drops rows it will not let you
 * write without an error, so a count below ids.length means some were refused.
 */
export async function bulkSetInvoiceStatus(ids: string[], status: 'sent' | 'paid'): Promise<number> {
  const { data, error } = await supabase.from('invoices').update({ status }).in('id', ids).select('id');
  if (error) throw error;
  const changed = data?.length ?? 0;
  if (changed < ids.length) {
    throw new Error(`${ids.length - changed} of ${ids.length} invoice(s) were not updated. You may not have permission to edit them.`);
  }
  return changed;
}

export async function bulkDeleteInvoices(ids: string[]): Promise<number> {
  const { data, error } = await supabase.from('invoices').delete().in('id', ids).select('id');
  if (error) throw error;
  const removed = data?.length ?? 0;
  if (removed < ids.length) {
    throw new Error(`${ids.length - removed} of ${ids.length} invoice(s) were not deleted. You may not have permission to delete them.`);
  }
  return removed;
}

export function useInvoiceList() {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id ?? undefined;
  const query = useQuery({
    queryKey: invoiceListKey(companyId),
    queryFn: () => fetchInvoiceList(companyId as string),
    enabled: !!companyId,
  });
  return {
    invoices: query.data ?? [],
    // Before a profile arrives there is nothing to fetch yet; show the skeleton, not "no invoices".
    isLoading: query.isLoading || (!companyId && !userProfile),
    error: query.error as Error | null,
    refetch: query.refetch,
  };
}

export function useInvoiceBulkActions() {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id ?? undefined;
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: invoicesKey(companyId) });

  const setStatus = useMutation({
    mutationFn: ({ ids, status }: { ids: string[]; status: 'sent' | 'paid' }) => bulkSetInvoiceStatus(ids, status),
    onSettled: invalidate,
  });
  const remove = useMutation({
    mutationFn: (ids: string[]) => bulkDeleteInvoices(ids),
    onSettled: invalidate,
  });
  return { setStatus, remove };
}
