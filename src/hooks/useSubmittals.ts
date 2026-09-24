/**
 * Submittals for /submittals (US-266).
 *
 * The page's submittal read logged its error and rendered "No submittals have
 * been created yet". A new submittal was numbered from the length of the list
 * on screen, which is the filtered list when a project is picked, so the
 * second submittal on a project could take SUB-2026-002 while the company
 * already had one. The number now comes from the company's highest number for
 * the year. The review's history row was inserted with its error unread;
 * edits did not read back. Every write now throws on an error or zero rows.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface SubmittalProject {
  id: string;
  name: string;
  client_name: string;
  status: string;
}

export interface Submittal {
  id: string;
  project_id: string;
  submittal_number: string;
  title: string;
  description: string;
  spec_section: string;
  status: string;
  priority: string;
  due_date: string;
  submitted_date: string;
  approved_date: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  company_id: string;
  projects?: { name: string; client_name: string };
  submitter?: { first_name: string; last_name: string };
  reviewer?: { first_name: string; last_name: string };
}

export interface NewSubmittal {
  project_id: string;
  title: string;
  description: string;
  spec_section: string;
  due_date: string;
  priority: string;
}

export const submittalsKey = (companyId: string | undefined) => ['submittals', companyId] as const;

export async function fetchSubmittalsPage(companyId: string): Promise<{ projects: SubmittalProject[]; submittals: Submittal[] }> {
  const [projects, submittals] = await Promise.all([
    supabase.from('projects').select('id, name, client_name, status').eq('company_id', companyId).order('name'),
    supabase
      .from('submittals')
      .select('*, projects:project_id (name, client_name)')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false }),
  ]);
  const failed = [projects, submittals].find((r) => r.error)?.error;
  if (failed) throw failed;
  return {
    projects: (projects.data ?? []) as SubmittalProject[],
    submittals: (submittals.data ?? []) as unknown as Submittal[],
  };
}

/** SUB-<year>-NNN, one past the company's highest number for that year. */
export async function nextSubmittalNumber(companyId: string, year: number): Promise<string> {
  const prefix = `SUB-${year}-`;
  const { data, error } = await supabase
    .from('submittals')
    .select('submittal_number')
    .eq('company_id', companyId)
    .like('submittal_number', `${prefix}%`);
  if (error) throw error;
  const highest = (data ?? []).reduce((max, row) => {
    const n = Number(String(row.submittal_number ?? '').slice(prefix.length));
    return Number.isFinite(n) && n > max ? n : max;
  }, 0);
  return `${prefix}${String(highest + 1).padStart(3, '0')}`;
}

export async function createSubmittal(
  companyId: string,
  userId: string | undefined,
  v: NewSubmittal,
  now: Date = new Date(),
): Promise<void> {
  // Default SLA: 10 days if not provided.
  const defaultDue = new Date(now);
  defaultDue.setDate(defaultDue.getDate() + 10);
  const dueDate = v.due_date || defaultDue.toISOString().split('T')[0];
  const submittalNumber = await nextSubmittalNumber(companyId, now.getFullYear());

  const { data, error } = await supabase
    .from('submittals')
    .insert({
      company_id: companyId,
      project_id: v.project_id,
      title: v.title,
      description: v.description,
      spec_section: v.spec_section,
      due_date: dueDate,
      priority: v.priority,
      status: 'draft',
      submittal_number: submittalNumber,
      created_by: userId,
    })
    .select('id');
  if (error) throw error;
  if (!data || data.length === 0) throw new Error('The submittal was not created.');
}

const noRow = () =>
  new Error('The submittal was not changed. It may have been removed, or you may not have permission.');

export async function updateSubmittal(
  companyId: string,
  id: string,
  patch: { title: string; description: string; spec_section: string; due_date: string | null; priority: string },
): Promise<void> {
  const { data, error } = await supabase
    .from('submittals')
    .update(patch)
    .eq('id', id)
    .eq('company_id', companyId)
    .select('id');
  if (error) throw error;
  if (!data || data.length === 0) throw noRow();
}

/**
 * Set the review outcome, then record who reviewed it. The status is the
 * decision; a history row that fails to land is reported, not swallowed.
 */
export async function reviewSubmittal(
  companyId: string,
  userId: string | undefined,
  v: { id: string; status: string; comments: string },
  now: Date = new Date(),
): Promise<void> {
  const { data, error } = await supabase
    .from('submittals')
    .update({ status: v.status, approved_date: v.status === 'approved' ? now.toISOString() : null })
    .eq('id', v.id)
    .eq('company_id', companyId)
    .select('id');
  if (error) throw error;
  if (!data || data.length === 0) throw noRow();

  // submittal_reviews is not in the generated Database types yet.
  const { error: logError } = await (supabase as unknown as SupabaseClient)
    .from('submittal_reviews')
    .insert({
      submittal_id: v.id,
      reviewer_id: userId,
      review_status: v.status,
      comments: v.comments || null,
      company_id: companyId,
    });
  if (logError) {
    throw new Error(`The status was saved, but the review record was not: ${logError.message}`);
  }
}

export function useSubmittals(enabled = true) {
  const { user, userProfile } = useAuth();
  const companyId = userProfile?.company_id ?? undefined;
  const userId = user?.id;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: submittalsKey(companyId),
    queryFn: () => fetchSubmittalsPage(companyId as string),
    enabled: enabled && !!companyId,
  });
  const need = () => {
    if (!companyId) throw new Error('Your profile is not linked to a company.');
    return companyId;
  };
  const invalidate = () => queryClient.invalidateQueries({ queryKey: submittalsKey(companyId) });

  const create = useMutation({ mutationFn: (v: NewSubmittal) => createSubmittal(need(), userId, v), onSettled: invalidate });
  const update = useMutation({
    mutationFn: (v: { id: string; patch: Parameters<typeof updateSubmittal>[2] }) => updateSubmittal(need(), v.id, v.patch),
    onSettled: invalidate,
  });
  const review = useMutation({
    mutationFn: (v: { id: string; status: string; comments: string }) => reviewSubmittal(need(), userId, v),
    onSettled: invalidate,
  });

  return { companyId, query, create, update, review };
}
