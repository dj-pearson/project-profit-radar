/**
 * Reads and writes behind the RFI and submittal workflow tab (US-266).
 *
 * RFISubmittalManagement read four tables in a useEffect and reloaded all four
 * after each write. Its writes checked the error but not the row count, so an
 * update RLS filtered to nothing announced "RFI updated successfully". Editing
 * an RFI or submittal also rewrote its number, author and status (the create
 * payload was reused for the update), so RFI-12345678 came back from an edit
 * as a new number, reopened. Updates now send only the edited fields.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { TablesUpdate } from '@/integrations/supabase/types';

export interface RFI {
  id: string;
  rfi_number: string;
  project_id: string;
  subject: string;
  description?: string;
  priority: string;
  status: string;
  created_by?: string;
  submitted_to?: string;
  due_date?: string;
  response_date?: string;
  created_at: string;
  projects?: { name: string };
}

export interface Submittal {
  id: string;
  submittal_number: string;
  project_id: string;
  title: string;
  description?: string;
  spec_section?: string;
  priority: string;
  status: string;
  created_by?: string;
  due_date?: string;
  approved_date?: string;
  created_at: string;
  projects?: { name: string };
}

export interface RFIForm {
  project_id: string;
  subject: string;
  description: string;
  priority: string;
  submitted_to: string;
  due_date: string;
}

export interface SubmittalForm {
  project_id: string;
  title: string;
  description: string;
  spec_section: string;
  priority: string;
  due_date: string;
}

export const rfiSubmittalKey = (companyId: string | undefined) => ['rfi-submittals', companyId] as const;

export async function fetchRFISubmittals(companyId: string) {
  const { data: rfis, error: rfisError } = await supabase
    .from('rfis')
    .select(`
      *,
      projects:project_id(name)
    `)
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });
  if (rfisError) throw rfisError;

  const { data: submittals, error: submittalsError } = await supabase
    .from('submittals')
    .select(`
      *,
      projects:project_id(name)
    `)
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });
  if (submittalsError) throw submittalsError;

  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('id, name')
    .eq('company_id', companyId)
    .order('name');
  if (projectsError) throw projectsError;

  const { data: team, error: teamError } = await supabase
    .from('user_profiles')
    .select('id, first_name, last_name')
    .eq('company_id', companyId);
  if (teamError) throw teamError;

  return {
    rfis: (rfis ?? []) as unknown as RFI[],
    submittals: (submittals ?? []) as unknown as Submittal[],
    projects: (projects ?? []) as { id: string; name: string }[],
    teamMembers: (team ?? []) as { id: string; first_name: string | null; last_name: string | null }[],
  };
}

function requireRow(data: unknown[] | null, what: string) {
  if (!data || data.length === 0) throw new Error(`The ${what} was not saved. You may not have permission to change it.`);
}

/** Empty strings from the form are "not set", not a date or a user id Postgres would refuse. */
const blankToNull = <T extends object>(form: T) =>
  Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v === '' ? null : v])) as T;

export async function saveRFI(
  companyId: string,
  userId: string,
  form: RFIForm,
  editingId?: string,
  now = Date.now(),
): Promise<void> {
  const fields = blankToNull(form);
  const { data, error } = editingId
    ? await supabase.from('rfis').update(fields as TablesUpdate<'rfis'>).eq('id', editingId).select('id')
    : await supabase
        .from('rfis')
        .insert([{
          ...fields,
          company_id: companyId,
          rfi_number: `RFI-${now.toString().slice(-8)}`,
          created_by: userId,
          status: 'open',
        } as never])
        .select('id');
  if (error) throw error;
  requireRow(data, 'RFI');
}

export async function saveSubmittal(
  companyId: string,
  userId: string,
  form: SubmittalForm,
  editingId?: string,
  now = Date.now(),
): Promise<void> {
  const fields = blankToNull(form);
  const { data, error } = editingId
    ? await supabase.from('submittals').update(fields as TablesUpdate<'submittals'>).eq('id', editingId).select('id')
    : await supabase
        .from('submittals')
        .insert([{
          ...fields,
          company_id: companyId,
          submittal_number: `SUB-${now.toString().slice(-8)}`,
          created_by: userId,
          status: 'not_submitted',
        } as never])
        .select('id');
  if (error) throw error;
  requireRow(data, 'submittal');
}

export async function setRFIStatus(rfiId: string, status: string, response?: string): Promise<void> {
  const patch: Record<string, unknown> = { status };
  if (status === 'closed') {
    patch.response_date = new Date().toISOString();
    if (response) patch.response = response;
  }
  const { data, error } = await supabase.from('rfis').update(patch as TablesUpdate<'rfis'>).eq('id', rfiId).select('id');
  if (error) throw error;
  requireRow(data, 'RFI');
}

export async function setSubmittalStatus(submittalId: string, status: string): Promise<void> {
  const patch: Record<string, unknown> = { status };
  const now = new Date().toISOString();
  if (status === 'submitted') patch.submitted_date = now;
  else if (status === 'approved') patch.approved_date = now;
  const { data, error } = await supabase
    .from('submittals')
    .update(patch as TablesUpdate<'submittals'>)
    .eq('id', submittalId)
    .select('id');
  if (error) throw error;
  requireRow(data, 'submittal');
}

export function useRFISubmittalManagement() {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id ?? undefined;
  const userId = userProfile?.id;
  const queryClient = useQueryClient();
  const key = rfiSubmittalKey(companyId);

  const query = useQuery({
    queryKey: key,
    queryFn: () => fetchRFISubmittals(companyId as string),
    enabled: !!companyId,
  });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: key });
  const rfi = useMutation({
    mutationFn: ({ form, editingId }: { form: RFIForm; editingId?: string }) =>
      saveRFI(companyId as string, userId as string, form, editingId),
    onSettled: invalidate,
  });
  const submittal = useMutation({
    mutationFn: ({ form, editingId }: { form: SubmittalForm; editingId?: string }) =>
      saveSubmittal(companyId as string, userId as string, form, editingId),
    onSettled: invalidate,
  });
  const rfiStatus = useMutation({
    mutationFn: ({ id, status, response }: { id: string; status: string; response?: string }) => setRFIStatus(id, status, response),
    onSettled: invalidate,
  });
  const submittalStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => setSubmittalStatus(id, status),
    onSettled: invalidate,
  });

  return {
    data: query.data,
    isLoading: query.isLoading || !companyId,
    error: query.error as Error | null,
    refetch: query.refetch,
    saveRFI: (form: RFIForm, editingId?: string) => rfi.mutateAsync({ form, editingId }),
    saveSubmittal: (form: SubmittalForm, editingId?: string) => submittal.mutateAsync({ form, editingId }),
    setRFIStatus: (id: string, status: string, response?: string) => rfiStatus.mutateAsync({ id, status, response }),
    setSubmittalStatus: (id: string, status: string) => submittalStatus.mutateAsync({ id, status }),
  };
}
