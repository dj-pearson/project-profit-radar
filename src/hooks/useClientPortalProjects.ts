/**
 * The client portal's projects and the detail behind the selected one
 * (US-266, US-319, US-368).
 *
 * These reads lived in ClientPortalEnhanced's effect. The page also mapped the
 * project onto budget_total, actual_cost and contract_value, none of which is
 * a projects column, so the budget card always read "$0 of $0" and "On
 * Budget", and the schedule card said "Behind Schedule" for any job under 50%
 * complete whatever its dates. The budget and contract now come from
 * total_budget/budget and current/original_contract_value; spending to date is
 * not something the portal can read, so it is null and shown as unknown.
 *
 * The detail read keeps its per-section failures: a failed invoices read must
 * not hide the milestones that did load, but it is named, never shown as an
 * empty list without comment.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Milestone, Document, ProjectUpdate, ChangeOrder } from '@/components/client-portal';

export interface ClientPortalProject {
  id: string;
  name: string;
  description: string;
  status: string;
  completion_percentage?: number;
  /** total_budget, else budget. Undefined when neither is set. */
  budget_total?: number;
  /** Spending to date is not readable from the portal; always null. */
  actual_cost: number | null;
  contract_value?: number;
  start_date?: string;
  end_date?: string;
  site_address?: string;
  company_id?: string;
}

export interface ClientPortalInvoice {
  id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  total_amount: number;
  amount_paid: number;
  amount_due: number;
  status: string;
  notes?: string;
}

export interface ClientProjectDetails {
  changeOrders: ChangeOrder[];
  invoices: ClientPortalInvoice[];
  documents: Document[];
  milestones: Milestone[];
  updates: ProjectUpdate[];
  /** Sections whose read failed, named for the error the page shows. */
  failed: string[];
}

export const clientPortalProjectsKey = (companyId: string | null | undefined, userId: string | undefined) =>
  ['client-portal-projects', companyId ?? null, userId] as const;
export const clientProjectDetailsKey = (
  companyId: string | null | undefined,
  userId: string | undefined,
  projectId: string | undefined,
) => ['client-portal-projects', companyId ?? null, userId, 'details', projectId] as const;

const num = (v: unknown): number | undefined => (v == null || v === '' ? undefined : Number(v));

export function toClientPortalProject(row: Record<string, unknown>): ClientPortalProject {
  return {
    id: row.id as string,
    name: row.name as string,
    description: (row.description as string) ?? '',
    status: (row.status as string) ?? '',
    completion_percentage: num(row.completion_percentage),
    budget_total: num(row.total_budget) ?? num(row.budget),
    actual_cost: null,
    contract_value: num(row.current_contract_value) ?? num(row.original_contract_value),
    start_date: (row.start_date as string) ?? undefined,
    end_date: (row.end_date as string) ?? undefined,
    site_address: (row.site_address as string) ?? undefined,
    company_id: (row.company_id as string) ?? undefined,
  };
}

/**
 * Projects this client is ENROLLED on (US-319), not projects whose
 * client_email string happens to match. RLS on projects enforces the same
 * predicate server-side.
 */
export async function fetchClientPortalProjects(): Promise<ClientPortalProject[]> {
  const { data: enrolments, error: enrolmentError } = await supabase
    .from('client_portal_access')
    .select('project_id')
    .eq('is_active', true);
  if (enrolmentError) throw enrolmentError;

  const projectIds = (enrolments ?? []).map((e) => e.project_id).filter(Boolean) as string[];
  if (projectIds.length === 0) return [];

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .in('id', projectIds)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => toClientPortalProject(row as unknown as Record<string, unknown>));
}

export async function fetchClientProjectDetails(projectId: string): Promise<ClientProjectDetails> {
  const [coRes, invoicesRes, docsRes, tasksRes, reportsRes] = await Promise.all([
    supabase
      .from('change_orders')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false }),
    supabase
      .from('invoices')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false }),
    supabase
      .from('documents')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false }),
    // Milestones are tasks flagged is_milestone. tasks has no target_date,
    // title, completed_at, progress or phase column: ordering by target_date
    // 400'd and the timeline was always empty (US-368). The real columns are
    // name, due_date/end_date, completion_percentage and category.
    supabase
      .from('tasks')
      .select('id, name, description, status, due_date, end_date, completion_percentage, category')
      .eq('project_id', projectId)
      .eq('is_milestone', true)
      .order('due_date', { ascending: true, nullsFirst: false }),
    supabase
      .from('daily_reports')
      .select('*')
      .eq('project_id', projectId)
      .order('date', { ascending: false })
      .limit(20),
  ]);

  const failed: string[] = [];
  if (coRes.error) failed.push('change orders');
  if (invoicesRes.error) failed.push('invoices');
  if (docsRes.error) failed.push('documents');
  if (tasksRes.error) failed.push('milestones');
  if (reportsRes.error) failed.push('project updates');

  type AnyRow = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

  return {
    failed,
    changeOrders: coRes.error ? [] : ((coRes.data ?? []) as unknown as ChangeOrder[]),
    invoices: invoicesRes.error ? [] : ((invoicesRes.data ?? []) as unknown as ClientPortalInvoice[]),
    documents: docsRes.error
      ? []
      : ((docsRes.data ?? []) as AnyRow[]).map((doc) => ({
          id: doc.id,
          name: doc.name || doc.file_name,
          type: (doc.category === 'photo' ? 'photo' : doc.category === 'plan' ? 'plan' : 'document') as Document['type'],
          url: doc.file_url || doc.url,
          thumbnailUrl: doc.thumbnail_url,
          uploadedBy: doc.uploaded_by_name,
          uploadedDate: doc.created_at,
          description: doc.description,
          size: doc.file_size,
        })),
    milestones: tasksRes.error
      ? []
      : (tasksRes.data ?? []).map((task) => ({
          id: task.id,
          title: task.name,
          description: task.description ?? undefined,
          status: (
            task.status === 'completed' ? 'completed'
              : task.status === 'in_progress' ? 'in_progress'
                : task.status === 'blocked' ? 'blocked' : 'pending') as Milestone['status'],
          targetDate: task.due_date || task.end_date || undefined,
          // tasks records no completion timestamp, so none is shown.
          completedDate: undefined,
          progress: task.completion_percentage ?? 0,
          phase: task.category ?? undefined,
        })),
    updates: reportsRes.error
      ? []
      : ((reportsRes.data ?? []) as AnyRow[]).map((report) => ({
          id: report.id,
          type: 'general' as const,
          title: `Daily Update - ${new Date(report.date).toLocaleDateString()}`,
          description: report.work_performed || report.notes || 'No details provided',
          timestamp: report.created_at,
          author: report.submitted_by_name,
          isRead: true,
        })),
  };
}

/** Enabled only for a client (or root admin) once auth has settled. */
export function useClientPortalProjects(enabled: boolean) {
  const { user, userProfile } = useAuth();
  const userId = user?.id;
  const companyId = userProfile?.company_id ?? null;
  return useQuery({
    queryKey: clientPortalProjectsKey(companyId, userId),
    queryFn: fetchClientPortalProjects,
    enabled: enabled && !!userId,
  });
}

export function useClientProjectDetails(projectId: string | undefined) {
  const { user, userProfile } = useAuth();
  const userId = user?.id;
  const companyId = userProfile?.company_id ?? null;
  return useQuery({
    queryKey: clientProjectDetailsKey(companyId, userId, projectId),
    queryFn: () => fetchClientProjectDetails(projectId as string),
    enabled: !!projectId && !!userId,
  });
}
