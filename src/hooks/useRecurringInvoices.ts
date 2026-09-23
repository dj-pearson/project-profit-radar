/**
 * Recurring invoice templates for the Invoices > Recurring tab (US-266).
 *
 * The tab loaded these with useState + useEffect and reloaded by hand after
 * each write. A failed load left the table on "no recurring invoices", which
 * reads as "nothing is scheduled to bill"; the query error is shown instead.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Json } from '@/integrations/supabase/types';
import type { RecurrenceFrequency, RecurringLineItem } from '@/lib/reports/recurringInvoices';

export interface RecurringInvoiceRow {
  id: string;
  name: string;
  client_name: string | null;
  frequency: RecurrenceFrequency;
  start_date: string;
  end_date: string | null;
  occurrence_limit: number | null;
  occurrences_generated: number;
  next_run_date: string | null;
  status: 'active' | 'paused' | 'completed';
  line_items: RecurringLineItem[];
  notes: string | null;
}

export interface RecurringInvoiceInput {
  name: string;
  client_name: string | null;
  frequency: RecurrenceFrequency;
  start_date: string;
  end_date: string | null;
  occurrence_limit: number | null;
  line_items: RecurringLineItem[];
  notes: string | null;
  next_run_date: string | null;
}

export const recurringInvoicesKey = (companyId: string | undefined) => ['recurring-invoices', companyId] as const;

export async function fetchRecurringInvoices(companyId: string): Promise<RecurringInvoiceRow[]> {
  const { data, error } = await supabase
    .from('recurring_invoices')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r: Record<string, unknown>) => ({
    ...(r as object),
    line_items: Array.isArray(r.line_items) ? (r.line_items as RecurringLineItem[]) : [],
  })) as RecurringInvoiceRow[];
}

const notSaved = (what: string) =>
  new Error(`The recurring invoice was not ${what}. You may not have permission to change it.`);

export async function saveRecurringInvoice(
  companyId: string,
  userId: string | undefined,
  input: RecurringInvoiceInput,
  id?: string,
): Promise<void> {
  // line_items is a jsonb column; RecurringLineItem is an interface, which TS
  // will not widen to Json on its own.
  const payload = { ...input, line_items: input.line_items as unknown as Json, company_id: companyId };
  if (id) {
    const { data, error } = await supabase.from('recurring_invoices').update(payload).eq('id', id).select('id');
    if (error) throw error;
    if (!data || data.length === 0) throw notSaved('updated');
    return;
  }
  const { error } = await supabase
    .from('recurring_invoices')
    .insert({ ...payload, created_by: userId ?? null });
  if (error) throw error;
}

export async function setRecurringInvoiceStatus(
  id: string,
  status: 'active' | 'paused',
  nextRunDate: string | null,
): Promise<void> {
  const { data, error } = await supabase
    .from('recurring_invoices')
    .update({ status, next_run_date: nextRunDate })
    .eq('id', id)
    .select('id');
  if (error) throw error;
  if (!data || data.length === 0) throw notSaved('updated');
}

export async function deleteRecurringInvoice(id: string): Promise<void> {
  const { data, error } = await supabase.from('recurring_invoices').delete().eq('id', id).select('id');
  if (error) throw error;
  if (!data || data.length === 0) throw notSaved('deleted');
}

export function useRecurringInvoices() {
  const { userProfile, user } = useAuth();
  const companyId = userProfile?.company_id ?? undefined;
  const queryClient = useQueryClient();
  const key = recurringInvoicesKey(companyId);

  const query = useQuery({
    queryKey: key,
    queryFn: () => fetchRecurringInvoices(companyId as string),
    enabled: !!companyId,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: key });
  const requireCompany = () => {
    if (!companyId) throw new Error('Your account is not linked to a company, so there is nowhere to save this.');
    return companyId;
  };

  const save = useMutation({
    mutationFn: ({ input, id }: { input: RecurringInvoiceInput; id?: string }) =>
      saveRecurringInvoice(requireCompany(), user?.id, input, id),
    onSettled: invalidate,
  });
  const setStatus = useMutation({
    mutationFn: ({ id, status, nextRunDate }: { id: string; status: 'active' | 'paused'; nextRunDate: string | null }) =>
      setRecurringInvoiceStatus(id, status, nextRunDate),
    onSettled: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteRecurringInvoice(id),
    onSettled: invalidate,
  });

  return {
    rows: query.data ?? [],
    isLoading: query.isLoading || (!companyId && !userProfile),
    isFetching: query.isFetching,
    error: query.error as Error | null,
    refetch: query.refetch,
    save,
    setStatus,
    remove,
  };
}
