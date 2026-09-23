/**
 * Reads and writes behind the project Closeout section (US-328; moved onto a
 * query for US-266).
 *
 * ProjectCloseoutTab loaded the checklist and the closeout summary in a
 * useEffect and, when either read failed, toasted and rendered "No closeout
 * checklist yet" with a button that seeds a second checklist on top of the one
 * it failed to read. A failed read is thrown now, for the tab to show instead.
 *
 * Item status edits are optimistic and roll back when the update fails or RLS
 * filters it to zero rows.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/lib/logger';
import type { HandoverBundleData } from '@/utils/handoverBundleGenerator';

export interface CloseoutItem {
  id: string;
  category: string;
  name: string;
  status: string;
  is_required: boolean;
  completed_at: string | null;
  sort_order: number;
}

export interface CloseoutSummary {
  open_punch_items: number;
  total_punch_items: number;
  required_checklist_open: number;
  unpaid_invoice_total: number;
  warranties_registered: number;
  handover_sent_at: string | null;
}

export interface ProjectCloseout {
  items: CloseoutItem[];
  summary: CloseoutSummary | null;
}

export const projectCloseoutKey = (companyId: string | undefined, projectId: string) =>
  ['project-closeout', companyId, projectId] as const;

export async function fetchProjectCloseout(projectId: string): Promise<ProjectCloseout> {
  const [{ data: rows, error: itemsError }, { data: status, error: statusError }] = await Promise.all([
    supabase
      .from('project_closeout_items')
      .select('id, category, name, status, is_required, completed_at, sort_order')
      .eq('project_id', projectId)
      .order('sort_order'),
    supabase
      .from('project_closeout_status')
      .select('open_punch_items, total_punch_items, required_checklist_open, unpaid_invoice_total, warranties_registered, handover_sent_at')
      .eq('project_id', projectId)
      .maybeSingle(),
  ]);
  if (itemsError) throw itemsError;
  if (statusError) throw statusError;
  return { items: (rows ?? []) as CloseoutItem[], summary: (status as CloseoutSummary | null) ?? null };
}

/** Returns how many checklist items the database created. */
export async function seedProjectCloseout(projectId: string): Promise<number> {
  const { data, error } = await supabase.rpc('seed_project_closeout', { p_project_id: projectId });
  if (error) throw error;
  return (data as number | null) ?? 0;
}

export async function updateCloseoutItemStatus(id: string, status: string): Promise<void> {
  const { data, error } = await supabase
    .from('project_closeout_items')
    .update({ status } as never)
    .eq('id', id)
    .select('id');
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('The item was not updated. You may not have permission to edit this checklist.');
  }
}

/** Everything the handover PDF needs apart from the checklist the tab already has. */
export async function fetchHandoverBundleSources(
  projectId: string,
  companyId: string | undefined,
): Promise<Omit<HandoverBundleData, 'closeoutItems'>> {
  const [project, company, punch, changeOrders, invoices, warranties, documents] = await Promise.all([
    supabase.from('projects')
      .select('name, client_name, site_address, start_date, completed_at, original_contract_value, current_contract_value')
      .eq('id', projectId).single(),
    // The contractor's own name, for the header of the document their
    // customer keeps. userProfile carries no company_name - reading one
    // would silently have branded every handover "Brikly".
    supabase.from('companies')
      .select('name')
      .eq('id', companyId ?? '').maybeSingle(),
    supabase.from('punch_list_items')
      .select('item_number, description, status, date_completed')
      .eq('project_id', projectId).order('item_number'),
    supabase.from('change_orders')
      .select('change_order_number, title, amount, status')
      .eq('project_id', projectId).order('change_order_number'),
    supabase.from('invoices')
      .select('invoice_number, total_amount, amount_due, status')
      .eq('project_id', projectId).order('invoice_number'),
    supabase.from('warranties')
      .select('item_name, manufacturer, warranty_end_date, status')
      .eq('project_id', projectId),
    supabase.from('documents')
      .select('name, created_at')
      .eq('project_id', projectId).order('created_at'),
  ]);

  const failure = [project, punch, changeOrders, invoices, warranties, documents]
    .find((r) => r.error)?.error;
  // The company lookup is deliberately not fatal: a missing name costs a
  // header, not the bundle.
  if (failure) throw new Error(failure.message);

  return {
    project: project.data as HandoverBundleData['project'],
    companyName: company.data?.name || 'Your company',
    punchItems: (punch.data || []) as HandoverBundleData['punchItems'],
    changeOrders: (changeOrders.data || []) as HandoverBundleData['changeOrders'],
    invoices: (invoices.data || []) as HandoverBundleData['invoices'],
    warranties: (warranties.data || []) as HandoverBundleData['warranties'],
    documents: (documents.data || []) as HandoverBundleData['documents'],
  };
}

/**
 * Emails the customer that the job is complete and stamps handover_sent_at.
 * `stamped` is false when the email went but the timestamp did not save.
 */
export async function sendHandoverNotice(projectId: string): Promise<{ to: string; stamped: boolean }> {
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('name, client_name, client_email')
    .eq('id', projectId)
    .single();
  if (projectError) throw new Error(projectError.message);
  if (!project.client_email) {
    throw new Error('This project has no customer email address.');
  }

  const { error: sendError } = await supabase.functions.invoke('send-notification', {
    body: {
      type: 'project_handover',
      to: project.client_email,
      subject: `${project.name} is complete`,
      content:
        `Hello ${project.client_name || 'there'},\n\n` +
        `Work on ${project.name} is complete. Your closeout package - the punch list, ` +
        `change orders, warranties and project documents - is available in your customer ` +
        `portal.\n\nThank you for your business.`,
    },
  });
  if (sendError) throw new Error(sendError.message);

  const { data: stamped, error: stampError } = await supabase
    .from('projects')
    .update({ handover_sent_at: new Date().toISOString() } as never)
    .eq('id', projectId)
    .select('id');
  if (stampError || !stamped || stamped.length === 0) {
    // The email went. Losing the timestamp means the button looks unpressed,
    // which is better than claiming a send that did not happen.
    logger.error('Handover email sent but the timestamp was not saved', stampError);
    return { to: project.client_email, stamped: false };
  }
  return { to: project.client_email, stamped: true };
}

export function useProjectCloseout(projectId: string) {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id ?? undefined;
  const queryClient = useQueryClient();
  const key = projectCloseoutKey(companyId, projectId);

  const query = useQuery({
    queryKey: key,
    queryFn: () => fetchProjectCloseout(projectId),
    enabled: !!projectId,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: key });

  const seed = useMutation({ mutationFn: () => seedProjectCloseout(projectId), onSettled: invalidate });
  const notify = useMutation({ mutationFn: () => sendHandoverNotice(projectId), onSettled: invalidate });
  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateCloseoutItemStatus(id, status),
    // Optimistic, because a checklist that lags a click feels broken. Reverted
    // on failure rather than left showing a state the database rejected.
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<ProjectCloseout>(key);
      if (previous) {
        queryClient.setQueryData<ProjectCloseout>(key, {
          ...previous,
          items: previous.items.map((i) => (i.id === id ? { ...i, status } : i)),
        });
      }
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    // completed_at and the summary are set by the database; read them back.
    onSettled: invalidate,
  });

  return {
    items: query.data?.items ?? [],
    summary: query.data?.summary ?? null,
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
    seed: seed.mutateAsync,
    isSeeding: seed.isPending,
    setItemStatus: (id: string, status: string) => setStatus.mutateAsync({ id, status }),
    notifyCustomer: notify.mutateAsync,
    isNotifying: notify.isPending,
    loadBundleSources: () => fetchHandoverBundleSources(projectId, companyId),
  };
}
