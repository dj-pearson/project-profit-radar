/**
 * Reads and writes behind /change-orders (US-266).
 *
 * ChangeOrders.tsx read projects, approvers and the change-order list (through
 * the change-orders edge function) in a useEffect and reloaded all three by
 * hand after every write. The reads go through one query keyed by company now,
 * and every write invalidates the change-order prefix, so the project tab and
 * the workflow tab see the same change.
 *
 * The signature write selects its id back: an approval whose signature update
 * RLS filtered to zero rows is an approved order with no evidence behind it
 * (US-300), and it used to report "approved successfully".
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { changeOrdersKey } from '@/hooks/useChangeOrderManagement';

export interface ChangeOrderPageProject {
  id: string;
  name: string;
  client_name: string;
  status: string;
}

export interface ChangeOrderApprover {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
}

export const changeOrdersPageKey = (companyId: string | undefined) =>
  [...changeOrdersKey(companyId), 'page'] as const;

export async function fetchChangeOrdersPage<Order>(companyId: string): Promise<{
  projects: ChangeOrderPageProject[];
  approvers: ChangeOrderApprover[];
  changeOrders: Order[];
}> {
  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('id, name, client_name, status')
    .eq('company_id', companyId)
    .order('name');
  if (projectsError) throw projectsError;

  // Company users who can be assigned as approvers.
  const { data: approvers, error: usersError } = await supabase
    .from('user_profiles')
    .select('id, first_name, last_name, role')
    .eq('company_id', companyId)
    .in('role', ['admin', 'project_manager', 'superintendent', 'root_admin']);
  if (usersError) throw usersError;

  const { data: orders, error: ordersError } = await supabase.functions.invoke('change-orders', {
    body: { action: 'list' },
  });
  if (ordersError) throw ordersError;

  return {
    projects: (projects ?? []) as ChangeOrderPageProject[],
    approvers: (approvers ?? []) as ChangeOrderApprover[],
    changeOrders: ((orders as { changeOrders?: Order[] } | null)?.changeOrders ?? []) as Order[],
  };
}

async function invokeChangeOrders(body: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.functions.invoke('change-orders', { body });
  if (error) throw error;
}

export interface ApprovalInput {
  orderId: string;
  approvalType: 'internal' | 'client';
  approved: boolean;
  signature?: string | null;
  rejectionReason?: string;
}

export async function recordChangeOrderApproval(companyId: string, input: ApprovalInput): Promise<void> {
  const { orderId, approvalType, approved, signature, rejectionReason } = input;
  await invokeChangeOrders({
    action: 'approve',
    orderId,
    approvalType,
    approved,
    ...(rejectionReason !== undefined ? { rejectionReason } : {}),
  });

  // US-108: persist the approver's signature (company-scoped) when provided.
  if (approved && signature) {
    // A change order alters the contract value, so the approver's signature
    // is the evidence the change was authorised. Losing it silently while the
    // caller says "approved successfully" leaves an approved order with
    // nothing behind it (US-300).
    const { data, error } = await supabase
      .from('change_orders')
      .update({ signature })
      .eq('id', orderId)
      .eq('company_id', companyId)
      .select('id');
    const reason = error?.message ?? (!data || data.length === 0 ? 'no row was updated' : null);
    if (reason) {
      throw new Error(
        `The change order was approved, but the signature could not be saved (${reason}). ` +
          'Re-sign it before treating the approval as authorised.',
      );
    }
  }
}

export function useChangeOrdersPage<Order>({ enabled = true }: { enabled?: boolean } = {}) {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id ?? undefined;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: changeOrdersPageKey(companyId),
    queryFn: () => fetchChangeOrdersPage<Order>(companyId as string),
    enabled: enabled && !!companyId,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: changeOrdersKey(companyId) });

  const save = useMutation({
    mutationFn: (body: Record<string, unknown>) => invokeChangeOrders(body),
    onSettled: invalidate,
  });
  const approve = useMutation({
    mutationFn: (input: ApprovalInput) => {
      if (!companyId) throw new Error('Your account is not linked to a company.');
      return recordChangeOrderApproval(companyId, input);
    },
    onSettled: invalidate,
  });

  return {
    projects: query.data?.projects ?? [],
    approvers: query.data?.approvers ?? [],
    changeOrders: query.data?.changeOrders ?? [],
    isLoading: query.isLoading || !companyId,
    error: query.error as Error | null,
    refetch: query.refetch,
    save,
    approve,
  };
}
