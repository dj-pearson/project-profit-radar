/**
 * Approval workflows and the approver picker for /admin/approval-workflows (US-266).
 *
 * The page loaded workflows and users separately; a failed user read was only
 * logged, so the approver picker said "No users found" on a company that has
 * users. Updates and deletes reported success on a write RLS filtered to zero
 * rows, and a toggle was patched into local state by hand.
 *
 * Both reads are one query now and throw. Writes select the row back and the
 * list is re-read after each one.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { TablesInsert } from '@/integrations/supabase/types';
import type {
  ApprovalWorkflow,
  ApprovalStep,
  ApprovalCondition,
  ApprovalEntityType,
} from '@/lib/approval-workflows';

export interface CompanyUser {
  id: string;
  name: string;
}

export const approvalWorkflowsKey = (companyId: string | undefined) => ['approval-workflows', companyId] as const;

/** Coerce a DB row (JSONB columns typed as Json) into the typed workflow shape. */
export function toWorkflow(row: Record<string, unknown>): ApprovalWorkflow {
  return {
    id: row.id as string,
    company_id: row.company_id as string,
    name: row.name as string,
    description: (row.description as string | null) ?? null,
    entity_type: row.entity_type as ApprovalEntityType,
    steps: Array.isArray(row.steps) ? (row.steps as ApprovalStep[]) : [],
    conditions: Array.isArray(row.conditions) ? (row.conditions as ApprovalCondition[]) : [],
    is_active: Boolean(row.is_active),
    created_by: (row.created_by as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

function requireRows(data: unknown[] | null, message: string) {
  if (!data || data.length === 0) throw new Error(message);
}

export async function fetchApprovalWorkflows(
  companyId: string
): Promise<{ workflows: ApprovalWorkflow[]; users: CompanyUser[] }> {
  const [workflows, users] = await Promise.all([
    supabase.from('approval_workflows').select('*').eq('company_id', companyId).order('created_at', { ascending: false }),
    supabase.from('user_profiles').select('id, first_name, last_name').eq('company_id', companyId),
  ]);
  if (workflows.error) throw workflows.error;
  if (users.error) throw users.error;
  return {
    workflows: (workflows.data ?? []).map((r) => toWorkflow(r as Record<string, unknown>)),
    users: (users.data ?? []).map((u) => ({
      id: u.id,
      name: `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() || 'Unnamed user',
    })),
  };
}

export type WorkflowPayload = TablesInsert<'approval_workflows'>;

export async function saveApprovalWorkflow(companyId: string, id: string | null, payload: WorkflowPayload): Promise<void> {
  // created_by is set server-side (DEFAULT auth.uid()) so it can't be spoofed.
  const { data, error } = id
    ? await supabase.from('approval_workflows').update(payload).eq('id', id).eq('company_id', companyId).select('id')
    : await supabase.from('approval_workflows').insert([payload]).select('id');
  if (error) throw error;
  requireRows(data, 'The workflow was not saved. You may not have permission to edit approval workflows.');
}

export async function setApprovalWorkflowActive(companyId: string, id: string, isActive: boolean): Promise<void> {
  const { data, error } = await supabase
    .from('approval_workflows')
    .update({ is_active: isActive })
    .eq('id', id)
    .eq('company_id', companyId)
    .select('id');
  if (error) throw error;
  requireRows(data, 'The workflow was not changed. You may not have permission to edit approval workflows.');
}

export async function deleteApprovalWorkflow(companyId: string, id: string): Promise<void> {
  const { data, error } = await supabase
    .from('approval_workflows')
    .delete()
    .eq('id', id)
    .eq('company_id', companyId)
    .select('id');
  if (error) throw error;
  requireRows(data, 'The workflow was not deleted. You may not have permission to delete approval workflows.');
}

export function useApprovalWorkflows() {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id ?? undefined;
  const queryClient = useQueryClient();
  const key = approvalWorkflowsKey(companyId);

  const query = useQuery({
    queryKey: key,
    queryFn: () => fetchApprovalWorkflows(companyId as string),
    enabled: !!companyId,
  });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: key });
  const requireCompany = () => {
    if (!companyId) throw new Error('No company context.');
    return companyId;
  };

  const save = useMutation({
    mutationFn: ({ id, payload }: { id: string | null; payload: WorkflowPayload }) =>
      saveApprovalWorkflow(requireCompany(), id, payload),
    onSettled: invalidate,
  });
  const setActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      setApprovalWorkflowActive(requireCompany(), id, isActive),
    onSettled: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteApprovalWorkflow(requireCompany(), id),
    onSettled: invalidate,
  });

  return {
    workflows: query.data?.workflows ?? [],
    users: query.data?.users ?? [],
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
    save: (id: string | null, payload: WorkflowPayload) => save.mutateAsync({ id, payload }),
    setActive: (id: string, isActive: boolean) => setActive.mutateAsync({ id, isActive }),
    remove: (id: string) => remove.mutateAsync(id),
  };
}
