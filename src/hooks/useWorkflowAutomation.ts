/**
 * Reads and writes behind /workflow-automation (US-266).
 *
 * WorkflowAutomation loaded the user's workflows and the templates in a
 * useEffect (on mount only, before `user` was set, so the first read asked for
 * user_id = undefined) and reloaded after each write. Writes checked the error
 * but not the row count, so a delete RLS filtered to nothing said "Workflow
 * Deleted" and the row reappeared on reload.
 *
 * Reads wait for the user and throw; writes select the id back.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface WorkflowData {
  id: string;
  name: string;
  description: string;
  category: string;
  is_active: boolean;
  is_template: boolean;
  execution_count: number;
  success_count: number;
  failure_count: number;
  last_executed_at: string;
  created_at: string;
}

export interface WorkflowStats {
  total_workflows: number;
  active_workflows: number;
  total_executions: number;
  success_rate: number;
}

export const workflowAutomationKey = (companyId: string | undefined, userId: string | undefined) =>
  ['workflow-automation', companyId, userId] as const;

export function summariseWorkflows(workflows: WorkflowData[]): WorkflowStats {
  const executions = workflows.reduce((sum, w) => sum + (w.execution_count || 0), 0);
  const successes = workflows.reduce((sum, w) => sum + (w.success_count || 0), 0);
  return {
    total_workflows: workflows.length,
    active_workflows: workflows.filter((w) => w.is_active).length,
    total_executions: executions,
    success_rate: executions > 0 ? (successes / executions) * 100 : 0,
  };
}

export async function fetchWorkflowAutomation(userId: string) {
  const { data: workflows, error: workflowsError } = await supabase
    .from('workflows')
    .select('*')
    .eq('user_id', userId)
    .eq('is_template', false)
    .order('created_at', { ascending: false });
  if (workflowsError) throw workflowsError;

  const { data: templates, error: templatesError } = await supabase
    .from('workflows')
    .select('*')
    .eq('is_template', true)
    .order('name');
  if (templatesError) throw templatesError;

  const mine = (workflows ?? []) as unknown as WorkflowData[];
  return {
    workflows: mine,
    templates: (templates ?? []) as unknown as WorkflowData[],
    stats: summariseWorkflows(mine),
  };
}

function requireRow(data: unknown[] | null, what: string) {
  if (!data || data.length === 0) throw new Error(`The workflow was not ${what}. You may not have permission to change it.`);
}

export async function setWorkflowActive(id: string, isActive: boolean): Promise<void> {
  const { data, error } = await supabase.from('workflows').update({ is_active: isActive }).eq('id', id).select('id');
  if (error) throw error;
  requireRow(data, 'updated');
}

/**
 * Copies a workflow (or a template) into the user's own list, inactive.
 * A duplicate keeps the source's execution order; a template starts fresh.
 */
export async function copyWorkflow(
  userId: string,
  sourceId: string,
  name: string,
  keepExecutionOrder: boolean,
): Promise<void> {
  const { data: source, error: sourceError } = await supabase.from('workflows').select('*').eq('id', sourceId).single();
  if (sourceError) throw sourceError;

  const { data, error } = await supabase
    .from('workflows')
    .insert({
      user_id: userId,
      name,
      description: source.description,
      category: source.category,
      is_active: false,
      ...(keepExecutionOrder ? { execution_order: source.execution_order } : {}),
    })
    .select('id');
  if (error) throw error;
  requireRow(data, 'created');
}

export async function deleteWorkflow(id: string): Promise<void> {
  const { data, error } = await supabase.from('workflows').delete().eq('id', id).select('id');
  if (error) throw error;
  requireRow(data, 'deleted');
}

export function useWorkflowAutomation() {
  const { user, userProfile } = useAuth();
  const userId = user?.id;
  const companyId = userProfile?.company_id ?? undefined;
  const queryClient = useQueryClient();
  const key = workflowAutomationKey(companyId, userId);

  const query = useQuery({
    queryKey: key,
    queryFn: () => fetchWorkflowAutomation(userId as string),
    enabled: !!userId,
  });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: key });
  const toggle = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => setWorkflowActive(id, isActive),
    onSettled: invalidate,
  });
  const copy = useMutation({
    mutationFn: ({ sourceId, name, keepOrder }: { sourceId: string; name: string; keepOrder: boolean }) => {
      if (!userId) throw new Error('You are not signed in.');
      return copyWorkflow(userId, sourceId, name, keepOrder);
    },
    onSettled: invalidate,
  });
  const remove = useMutation({ mutationFn: deleteWorkflow, onSettled: invalidate });

  return {
    data: query.data,
    isLoading: query.isLoading || !userId,
    error: query.error as Error | null,
    refetch: query.refetch,
    setActive: (id: string, isActive: boolean) => toggle.mutateAsync({ id, isActive }),
    duplicate: (id: string, name: string) => copy.mutateAsync({ sourceId: id, name: `${name} (Copy)`, keepOrder: true }),
    applyTemplate: (id: string, name: string) => copy.mutateAsync({ sourceId: id, name, keepOrder: false }),
    remove: (id: string) => remove.mutateAsync(id),
  };
}
